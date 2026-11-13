const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createTelegramService } = require('./telegramService');

describe('telegramService bot engine', () => {
  it('merespons perintah /start dan deep-link /start link_<username>', async () => {
    const sent = [];
    const service = createTelegramService({
      db: {},
      bcrypt: {},
      botToken: 'test-token',
      fetchFn: async (_url, opts) => {
        sent.push(JSON.parse(opts.body));
        return { json: async () => ({ ok: true }) };
      },
    });

    await service.handleTelegramUpdate({
      message: { chat: { id: 12345 }, text: '/start link_syahrul' },
    });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].chat_id, '12345');
    assert.match(sent[0].text, /\/daftar syahrul kata_sandi_anda/);
  });

  it('memverifikasi kata sandi saat /daftar dan menyimpan chat ID ke SQLite', async () => {
    const sent = [];
    const updates = [];
    const mockDb = {
      get(_sql, _params, cb) {
        cb(null, {
          id: 7,
          username: 'syahrul',
          password: 'hashed-password',
          full_name: 'Syahrul',
          role: 'Petugas Ukur',
        });
      },
      run(sql, params, cb) {
        updates.push({ sql, params });
        if (cb) cb(null);
      },
    };

    const service = createTelegramService({
      db: mockDb,
      bcrypt: { compareSync: (plain) => plain === 'rahasia123' },
      botToken: 'test-token',
      fetchFn: async (_url, opts) => {
        sent.push(JSON.parse(opts.body));
        return { json: async () => ({ ok: true }) };
      },
    });

    // Password salah
    await service.handleTelegramUpdate({
      message: { chat: { id: 999 }, text: '/daftar syahrul salah' },
    });
    assert.equal(updates.length, 0);
    assert.match(sent[0].text, /Verifikasi Gagal/);

    // Password benar
    await service.handleTelegramUpdate({
      message: { chat: { id: 999 }, text: '/daftar syahrul rahasia123' },
    });
    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0].params, ['999', 7]);
    assert.match(sent[1].text, /Berhasil Terhubung/);
  });

  it('menangani /cek status transit dan /stop putus koneksi', async () => {
    const sent = [];
    const runs = [];
    const mockDb = {
      get(sql, _params, cb) {
        if (sql.includes('FROM users')) {
          cb(null, { username: 'dico', full_name: 'Dico', role: 'Administrator' });
        } else {
          cb(null, { total_files: 3, total_surat: 2 });
        }
      },
      run(sql, params, cb) {
        runs.push({ sql, params });
        if (cb) cb(null);
      },
    };

    const service = createTelegramService({
      db: mockDb,
      bcrypt: {},
      botToken: 'test-token',
      fetchFn: async (_url, opts) => {
        sent.push(JSON.parse(opts.body));
        return { json: async () => ({ ok: true }) };
      },
    });

    await service.handleTelegramUpdate({ message: { chat: { id: 555 }, text: '/cek' } });
    assert.match(sent[0].text, /3 berkas/);
    assert.match(sent[0].text, /2 surat/);

    await service.handleTelegramUpdate({ message: { chat: { id: 555 }, text: '/stop' } });
    assert.equal(runs.length, 1);
    assert.deepEqual(runs[0].params, ['555']);
    assert.match(sent[1].text, /dinonaktifkan/);
  });

  it('mengembalikan kegagalan rapi jika chatId kosong atau jaringan gagal', async () => {
    const service = createTelegramService({
      db: {},
      bcrypt: {},
      botToken: 'test-token',
      fetchFn: async () => {
        throw new Error('offline');
      },
    });

    const emptyRes = await service.sendTelegramMessage('', 'Halo');
    assert.deepEqual(emptyRes, { ok: false, description: 'Chat ID kosong' });

    const offlineRes = await service.sendTelegramMessage('123', 'Halo');
    assert.equal(offlineRes.ok, false);
    assert.equal(offlineRes.description, 'offline');

    const unconfiguredService = createTelegramService({
      db: {},
      bcrypt: {},
      botToken: '',
      fetchFn: async () => {
        throw new Error('should not fetch without token');
      },
    });
    const noTokenRes = await unconfiguredService.sendTelegramMessage('123', 'Halo');
    assert.deepEqual(noTokenRes, {
      ok: false,
      description: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi',
    });
    const stopPolling = unconfiguredService.startPolling();
    assert.equal(typeof stopPolling, 'function');
    stopPolling();
  });
});
