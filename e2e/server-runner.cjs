const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const backendDir = path.resolve(__dirname, '../backend');
const frontendDistIndex = path.resolve(__dirname, '../frontend/dist/index.html');

if (!fs.existsSync(frontendDistIndex)) {
  console.error('Missing frontend/dist/index.html. Run `npm run build` in frontend/ before running E2E tests.');
  process.exit(1);
}

const jwt = require(path.join(backendDir, 'node_modules', 'jsonwebtoken'));
const bcrypt = require(path.join(backendDir, 'node_modules', 'bcryptjs'));
const { initDatabase } = require(path.join(backendDir, 'src', 'db', 'initDatabase'));
const { createApp } = require(path.join(backendDir, 'server'));

const port = Number(process.env.E2E_PORT || 3109);
const host = '127.0.0.1';
const jwtSecret = 'pantau-sp-e2e-test-secret';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pantau-sp-e2e-'));
const dbPath = path.join(tmpDir, 'e2e.sqlite');
const uploadDir = path.join(tmpDir, 'uploads', 'surat');
const avatarDir = path.join(tmpDir, 'uploads', 'avatars');
const dwgDir = path.join(tmpDir, 'uploads', 'dwg');

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(dwgDir, { recursive: true });

function waitForSeededUsers(db, timeoutMs = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      db.get(
        "SELECT COUNT(*) AS count FROM users WHERE username IN ('admin', 'entry', 'ukur')",
        (err, row) => {
          if (!err && row && row.count === 3) return resolve();
          if (Date.now() - start > timeoutMs) {
            return reject(new Error('Timeout waiting for seeded E2E users in ephemeral SQLite database'));
          }
          setTimeout(check, 25);
        }
      );
    };
    check();
  });
}

let server;
let db;
let cleanedUp = false;

function cleanupTempDir() {
  if (cleanedUp) return;
  cleanedUp = true;
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // Ignore file-lock errors during rapid Windows exit
  }
}

async function shutdown(signal) {
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (db) {
      await new Promise((resolve) => db.close(resolve));
    }
  } finally {
    cleanupTempDir();
    process.exit(signal ? 0 : 1);
  }
}

async function start() {
  db = initDatabase({ dbPath, jwt, jwtSecret, bcrypt });
  await waitForSeededUsers(db);

  const mockTelegramService = {
    botUsername: 'pantaukantahtangsel_bot',
    sendTelegramMessage: async () => ({ ok: true }),
  };

  // Bypass rate-limiting on localhost because sequential specs re-authenticate cleanly
  const permissiveLimiter = (_req, _res, next) => next();

  const backupsDir = path.join(tmpDir, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const app = createApp({
    db,
    jwtSecret,
    uploadDir,
    avatarDir,
    dwgDir,
    backupsDir,
    telegramService: mockTelegramService,
    loginLimiter: permissiveLimiter,
    serveFrontend: true,
  });

  server = app.listen(port, host, () => {
    console.log(`E2E server listening at http://${host}:${port} (ephemeral db: ${dbPath})`);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', cleanupTempDir);

start().catch((err) => {
  console.error('Failed to start E2E test server:', err);
  shutdown();
});

