const express = require('express');

/**
 * Router pemeriksaan kesehatan aplikasi dan konektivitas SQLite (/api/health).
 */
function createHealthRouter({ db }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    db.get('SELECT 1 AS ok', [], (err) => {
      if (err) {
        return res.status(503).json({
          status: 'unhealthy',
          service: 'pantau-kantah-tangsel',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({
        status: 'ok',
        service: 'pantau-kantah-tangsel',
        database: 'connected',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    });
  });

  return router;
}

module.exports = {
  createHealthRouter,
};
