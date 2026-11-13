const { getClientIp } = require('../utils/networkAndQr');

const AUDIT_CATEGORIES = ['AUTH', 'USER', 'SESSION', 'BERKAS', 'SURAT', 'BACKUP'];
const AUDIT_SEVERITIES = ['info', 'warning', 'critical'];

const SENSITIVE_META_KEYS = new Set([
  'password',
  'oldPassword',
  'newPassword',
  'token',
  'jwtSecret',
  'secret',
  'authorization',
]);

function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_META_KEYS.has(key)) continue;
    clean[key] = value;
  }
  return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
}

/**
 * Mengekstrak identitas pelaku & alamat IP secara konsisten dari objek request Express.
 */
function buildActorFromRequest(req) {
  return {
    actorId: req?.user?.id ?? null,
    actorUsername: req?.user?.username ?? null,
    actorRole: req?.user?.role ?? null,
    ipAddress: req ? getClientIp(req) || null : null,
  };
}

/**
 * Mencatat peristiwa keamanan atau aksi sensitif admin ke tabel `audit_logs` secara fault-tolerant.
 */
function recordAuditLog(
  db,
  {
    category,
    action,
    severity = 'info',
    actorId = null,
    actorUsername = null,
    actorRole = null,
    targetType = null,
    targetId = null,
    summary,
    metadata = null,
    ipAddress = null,
  } = {}
) {
  if (!db || !action || !summary) {
    return Promise.resolve({ ok: false });
  }

  const safeCategory = AUDIT_CATEGORIES.includes(category) ? category : 'AUTH';
  const safeSeverity = AUDIT_SEVERITIES.includes(severity) ? severity : 'info';
  const serializedMeta = sanitizeMetadata(metadata);

  return new Promise((resolve) => {
    db.run(
      `INSERT INTO audit_logs (
        category, action, severity, actor_id, actor_username, actor_role,
        target_type, target_id, summary, metadata, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeCategory,
        String(action),
        safeSeverity,
        actorId ?? null,
        actorUsername ? String(actorUsername) : null,
        actorRole ? String(actorRole) : null,
        targetType ? String(targetType) : null,
        targetId !== null && targetId !== undefined ? String(targetId) : null,
        String(summary),
        serializedMeta,
        ipAddress ? String(ipAddress) : null,
      ],
      function onInsert(err) {
        if (err) {
          return resolve({ ok: false, error: err.message });
        }
        return resolve({ ok: true, id: this.lastID });
      }
    );
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

/**
 * Mengambil daftar jejak audit terfilter beserta statistik ringkas untuk Panel Admin.
 */
async function listAuditLogs(
  db,
  { category = 'ALL', severity = 'ALL', search = '', limit = 100, offset = 0 } = {}
) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const conditions = [];
  const params = [];

  if (category && category !== 'ALL' && AUDIT_CATEGORIES.includes(category)) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (severity && severity !== 'ALL' && AUDIT_SEVERITIES.includes(severity)) {
    conditions.push('severity = ?');
    params.push(severity);
  }

  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) {
    const pattern = `%${trimmedSearch}%`;
    conditions.push(
      `(LOWER(COALESCE(actor_username, '')) LIKE LOWER(?) OR LOWER(COALESCE(target_id, '')) LIKE LOWER(?) OR LOWER(summary) LIKE LOWER(?) OR LOWER(action) LIKE LOWER(?) OR COALESCE(ip_address, '') LIKE ?)`
    );
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [logs, countRow, summaryRow] = await Promise.all([
    dbAll(
      db,
      `SELECT id, category, action, severity, actor_id, actor_username, actor_role,
              target_type, target_id, summary, metadata, ip_address, created_at
       FROM audit_logs
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    ),
    dbGet(db, `SELECT COUNT(*) AS total FROM audit_logs ${whereSql}`, params),
    dbGet(
      db,
      `SELECT
        COUNT(*) AS totalEvents,
        COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 ELSE 0 END), 0) AS last24h,
        COALESCE(SUM(CASE WHEN action = 'LOGIN_FAILED' AND created_at >= datetime('now', '-24 hours') THEN 1 ELSE 0 END), 0) AS failedLogins24h,
        COALESCE(SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END), 0) AS criticalCount
       FROM audit_logs`
    ),
  ]);

  return {
    logs: logs.map((row) => {
      let parsedMeta = null;
      if (row.metadata) {
        try {
          parsedMeta = JSON.parse(row.metadata);
        } catch {
          parsedMeta = null;
        }
      }
      return {
        ...row,
        metadata: parsedMeta,
      };
    }),
    total: Number(countRow?.total || 0),
    limit: safeLimit,
    offset: safeOffset,
    summary: {
      totalEvents: Number(summaryRow?.totalEvents || 0),
      last24h: Number(summaryRow?.last24h || 0),
      failedLogins24h: Number(summaryRow?.failedLogins24h || 0),
      criticalCount: Number(summaryRow?.criticalCount || 0),
    },
  };
}

module.exports = {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  buildActorFromRequest,
  recordAuditLog,
  listAuditLogs,
};
