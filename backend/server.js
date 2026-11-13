require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const fs = require('fs');
const http = require('http');
const https = require('https');

const { validateBody, schemas } = require('./validation');
const { getWorkingDays } = require('./src/utils/workingDays');
const { initDatabase } = require('./src/db/initDatabase');
const { createAuthMiddleware } = require('./src/middleware/auth');
const { createUploadMiddlewares } = require('./src/middleware/uploads');
const { createTelegramService } = require('./src/services/telegramService');
const {
  validateFileEntryAccess,
  validateScanPreconditions,
  analyzeMultiRoleSelection,
  resolveScanTransition,
} = require('./src/services/fileFlowService');

const { createAuthRouter } = require('./src/routes/auth');
const { createSuratRouter, createSuratDisposisiRouter } = require('./src/routes/surat');
const { createUsersRouter, createUserProfileRouter } = require('./src/routes/users');
const { createDwgRouter } = require('./src/routes/dwg');
const { createSuggestionsRouter } = require('./src/routes/suggestions');
const { createStatsRouter } = require('./src/routes/stats');
const { createNotificationsRouter } = require('./src/routes/notifications');
const { createFilesRouter, createDisposisiRouter } = require('./src/routes/files');
const { createReportsRouter } = require('./src/routes/reports');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-file-tracker';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'https://localhost:3002',
  'https://pantaukantahtangsel.web.id',
  'http://pantaukantahtangsel.web.id',
];

/**
 * Membangun instance Express lengkap dengan security middleware, seluruh router domain,
 * serta penyajian static bundle frontend. Dipisahkan dari listen() agar dapat diuji langsung.
 */
function createApp({
  db,
  jwtSecret = JWT_SECRET,
  uploadDir = path.join(__dirname, 'uploads', 'surat'),
  avatarDir = path.join(__dirname, 'uploads', 'avatars'),
  dwgDir = path.join(__dirname, 'uploads', 'dwg'),
  telegramService,
  loginLimiter,
  serveFrontend = true,
}) {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'upgrade-insecure-requests': null,
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", 'https://static.cloudflareinsights.com'],
          'script-src-elem': ["'self'", "'unsafe-inline'", 'https://static.cloudflareinsights.com'],
          'connect-src': [
            "'self'",
            'https://cloudflareinsights.com',
            'https://*.cloudflareinsights.com',
          ],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'worker-src': ["'self'", 'blob:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.indexOf(origin) !== -1 ||
          origin.startsWith('http://10.2.0.') ||
          origin.startsWith('http://192.168.') ||
          origin.endsWith('.pantaukantahtangsel.web.id')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );
  app.use(express.json());

  // Proteksi folder uploads: Tidak lagi disajikan secara publik via express.static
  // Dokumen hanya dapat diunduh lewat endpoint terotentikasi (mis. /api/surat/file/:filename)
  const { handlePdfUpload, handleAvatarUpload, handleDwgUpload } = createUploadMiddlewares({
    uploadDir,
    avatarDir,
    dwgDir,
  });

  const {
    userLastActiveMap,
    authenticateJWT,
    requireAdmin,
    requireAdminOrKasi,
    requireDwgAccess,
    canAccessDwg,
  } = createAuthMiddleware({ db, jwt, jwtSecret });

  const sendTelegramMessage = (...args) => telegramService.sendTelegramMessage(...args);

  // --- API Routes ---
  app.use(
    '/api',
    createAuthRouter({
      db,
      bcrypt,
      jwt,
      jwtSecret,
      authenticateJWT,
      userLastActiveMap,
      validateBody,
      schemas,
      loginLimiter,
    })
  );

  app.use(
    '/api/surat',
    createSuratRouter({
      db,
      jwt,
      jwtSecret,
      uploadDir,
      authenticateJWT,
      requireAdmin,
      handlePdfUpload,
      validateBody,
      schemas,
      sendTelegramMessage,
    })
  );
  app.use('/api/surat-disposisi', createSuratDisposisiRouter({ db, authenticateJWT }));

  app.use(
    '/api/users',
    createUsersRouter({
      db,
      bcrypt,
      authenticateJWT,
      requireAdmin,
      validateBody,
      schemas,
    })
  );

  app.use(
    '/api/user/dwg',
    createDwgRouter({
      db,
      dwgDir,
      authenticateJWT,
      requireDwgAccess,
      canAccessDwg,
      handleDwgUpload,
      sendTelegramMessage,
    })
  );

  app.use(
    '/api/user',
    createUserProfileRouter({
      db,
      avatarDir,
      authenticateJWT,
      handleAvatarUpload,
      validateBody,
      schemas,
    })
  );

  app.use(
    '/api/suggestions',
    createSuggestionsRouter({
      db,
      authenticateJWT,
      requireAdmin,
      validateBody,
      schemas,
      sendTelegramMessage,
    })
  );

  app.use(
    '/api/admin',
    createStatsRouter({
      db,
      authenticateJWT,
      requireAdmin,
      userLastActiveMap,
    })
  );

  app.use(
    '/api/notifications',
    createNotificationsRouter({
      db,
      authenticateJWT,
      telegramBotUsername: telegramService.botUsername,
      sendTelegramMessage,
    })
  );

  app.use(
    '/api/files',
    createFilesRouter({
      db,
      jwt,
      jwtSecret,
      authenticateJWT,
      requireAdmin,
      validateBody,
      schemas,
      getWorkingDays,
      validateFileEntryAccess,
      validateScanPreconditions,
      analyzeMultiRoleSelection,
      resolveScanTransition,
      sendTelegramMessage,
    })
  );

  app.use('/api/disposisi', createDisposisiRouter({ db, authenticateJWT }));
  app.use('/api/reports', createReportsRouter({ db, authenticateJWT, requireAdminOrKasi }));

  if (serveFrontend) {
    app.use(
      express.static(path.join(__dirname, '../frontend/dist'), {
        setHeaders: (res, filePath) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (filePath.endsWith('index.html') || filePath.endsWith('recovery.js')) {
            res.setHeader(
              'Cache-Control',
              'no-store, no-cache, must-revalidate, proxy-revalidate'
            );
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get(/.*/, (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
  }

  return app;
}

if (require.main === module) {
  const db = initDatabase({
    dbPath: path.join(__dirname, 'database.sqlite'),
    jwt,
    jwtSecret: JWT_SECRET,
    bcrypt,
  });

  // Inisialisasi Telegram Bot Notification Engine (@pantaukantahtangsel_bot)
  const telegramService = createTelegramService({ db, bcrypt });
  telegramService.startPolling();

  const app = createApp({ db, telegramService });

  app.listen(PORT, () => {
    console.log(`HTTP Backend server is running on http://localhost:${PORT}`);
  });

  // Start HTTPS server if certificates exist
  try {
    const keyPath = path.join(__dirname, 'key.pem');
    const certPath = path.join(__dirname, 'cert.pem');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const privateKey = fs.readFileSync(keyPath, 'utf8');
      const certificate = fs.readFileSync(certPath, 'utf8');
      const credentials = { key: privateKey, cert: certificate };

      const httpsServer = https.createServer(credentials, app);
      const HTTPS_PORT = PORT + 1;

      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`HTTPS Backend server is running on https://localhost:${HTTPS_PORT}`);
      });
    }
  } catch (err) {
    console.error('Failed to start HTTPS server:', err.message);
  }
}

module.exports = {
  createApp,
};
