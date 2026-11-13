const express = require('express');
const { listAuditLogs } = require('../services/auditService');

/**
 * Router Admin untuk memantau jejak audit keamanan dan aktivitas sensitif (`/api/admin/audit-logs`).
 */
function createAuditRouter({ db, authenticateJWT, requireAdmin }) {
  const router = express.Router();

  router.get('/', authenticateJWT, requireAdmin, async (req, res) => {
    try {
      const { category = 'ALL', severity = 'ALL', search = '', limit = 100, offset = 0 } = req.query;
      const data = await listAuditLogs(db, {
        category: String(category).toUpperCase(),
        severity: String(severity).toLowerCase() === 'all' ? 'ALL' : String(severity).toLowerCase(),
        search: String(search || ''),
        limit,
        offset,
      });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'Gagal memuat jejak audit: ' + err.message });
    }
  });

  return router;
}

module.exports = {
  createAuditRouter,
};
