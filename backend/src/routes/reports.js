const express = require('express');
const { computeFilesKpi, computeSuratKpi } = require('../services/kpiService');

/**
 * Router untuk seluruh endpoint laporan & analitik KPI (/api/reports/*).
 */
function createReportsRouter({ db, authenticateJWT, requireAdminOrKasi }) {
  const router = express.Router();

  router.get('/dashboard', authenticateJWT, requireAdminOrKasi, (req, res) => {
    const query = `
      SELECT 
        COUNT(*) AS totalFiles,
        SUM(CASE WHEN current_location = 'Selesai' THEN 1 ELSE 0 END) AS completedFiles,
        SUM(CASE WHEN current_location = 'Ditutup' THEN 1 ELSE 0 END) AS closedFiles,
        SUM(CASE WHEN current_location NOT IN ('Selesai', 'Ditutup') THEN 1 ELSE 0 END) AS activeFiles
      FROM files
    `;
    db.get(query, [], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        totalFiles: row ? row.totalFiles || 0 : 0,
        completedFiles: row ? row.completedFiles || 0 : 0,
        activeFiles: row ? row.activeFiles || 0 : 0,
        closedFiles: row ? row.closedFiles || 0 : 0,
        averageDays: 0,
      });
    });
  });

  router.get('/files', authenticateJWT, requireAdminOrKasi, (req, res) => {
    const query = `
      SELECT f.*, 
             u_to.full_name as transit_to_fullname,
             (SELECT scanned_by_role FROM file_history fh WHERE fh.file_id = f.id ORDER BY scanned_at DESC LIMIT 1) as latest_scan_info
      FROM files f 
      LEFT JOIN users u_to ON f.transit_to_username = u_to.username
      ORDER BY f.created_at DESC
    `;
    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  router.get('/kpi', authenticateJWT, (req, res) => {
    db.all(
      `
      SELECT fh.file_id, fh.scanned_by_username, fh.scanned_by_role, fh.scanned_at, f.nama_kegiatan, fh.location, f.is_transit, f.transit_at, u.full_name as user_full_name
      FROM file_history fh
      JOIN files f ON fh.file_id = f.id
      LEFT JOIN users u ON fh.scanned_by_username = u.username
      ORDER BY fh.file_id, fh.scanned_at ASC
    `,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(computeFilesKpi(rows || []));
      }
    );
  });

  router.get('/kpi-surat', authenticateJWT, (req, res) => {
    db.all(
      `SELECT id, nomor_agenda, asal_surat, nomor_surat, tanggal_diterima, perihal, COALESCE(current_location, 'Petugas Entry Surat') as current_location, created_at FROM surat`,
      [],
      (sErr, suratRows) => {
        if (sErr) return res.status(500).json({ error: sErr.message });

        db.all(
          `
          SELECT sh.surat_id, sh.scanned_by_username, sh.scanned_by_role, sh.scanned_at, sh.location,
                 s.asal_surat, s.nomor_agenda, s.perihal, COALESCE(s.current_location, 'Petugas Entry Surat') as surat_status,
                 u.full_name as user_full_name
          FROM surat_history sh
          JOIN surat s ON sh.surat_id = s.id
          LEFT JOIN users u ON sh.scanned_by_username = u.username
          ORDER BY sh.surat_id, sh.scanned_at ASC, sh.id ASC
        `,
          [],
          (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(computeSuratKpi(suratRows || [], rows || []));
          }
        );
      }
    );
  });

  return router;
}

module.exports = { createReportsRouter };
