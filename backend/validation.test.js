const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateBody, schemas } = require('./validation');

function runMiddleware(middleware, body = {}) {
  return new Promise((resolve) => {
    const req = { body };
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ calledNext: false, statusCode, payload, req });
      },
    };
    middleware(req, res, () => {
      resolve({ calledNext: true, statusCode, payload: null, req });
    });
  });
}

describe('Zod validation schemas & validateBody middleware', () => {
  it('menerima login valid dan men-trim username tanpa mengubah spasi password', async () => {
    const result = await runMiddleware(validateBody(schemas.loginSchema), {
      username: '  dico  ',
      password: '  rahasia ',
    });
    assert.equal(result.calledNext, true);
    assert.equal(result.req.body.username, 'dico');
    assert.equal(result.req.body.password, '  rahasia ');
  });

  it('menolak login kosong dengan HTTP 400 dan pesan jelas', async () => {
    const result = await runMiddleware(validateBody(schemas.loginSchema), {
      username: '   ',
      password: '',
    });
    assert.equal(result.calledNext, false);
    assert.equal(result.statusCode, 400);
    assert.match(result.payload.error, /Username wajib diisi/);
  });

  it('memvalidasi entri berkas baru dan mengonversi angka nomor/tahun menjadi string', async () => {
    const result = await runMiddleware(validateBody(schemas.createFileSchema), {
      nomor_berkas: 12345,
      tahun_berkas: 2026,
      nama_kegiatan: ' Pemecahan Bidang ',
      nama_pemohon: ' Budi Santoso ',
    });
    assert.equal(result.calledNext, true);
    assert.equal(result.req.body.nomor_berkas, '12345');
    assert.equal(result.req.body.tahun_berkas, '2026');
    assert.equal(result.req.body.nama_kegiatan, 'Pemecahan Bidang');
  });

  it('menolak entri berkas jika field wajib kosong', async () => {
    const result = await runMiddleware(validateBody(schemas.createFileSchema), {
      nomor_berkas: '12345',
      tahun_berkas: '',
      nama_kegiatan: 'Pemecahan Bidang',
      nama_pemohon: 'Budi',
    });
    assert.equal(result.calledNext, false);
    assert.equal(result.statusCode, 400);
    assert.match(result.payload.error, /Tahun berkas wajib diisi/);
  });

  it('menolak scan surat tanpa id, nomor_agenda, maupun qr_code', async () => {
    const result = await runMiddleware(validateBody(schemas.scanSuratSchema), {
      isFinishing: true,
    });
    assert.equal(result.calledNext, false);
    assert.equal(result.statusCode, 400);
    assert.match(result.payload.error, /wajib disertakan/);
  });

  it('menerima scan surat dengan qr_code dan menjaga telegram_chat_id opsional di update user', async () => {
    const scanOk = await runMiddleware(validateBody(schemas.scanSuratSchema), {
      qr_code: 'jwt.token.disini',
    });
    assert.equal(scanOk.calledNext, true);

    const userUpdateKeepChatId = await runMiddleware(validateBody(schemas.updateUserSchema), {
      username: 'petugas1',
      role: 'Petugas Ukur',
      full_name: 'Petugas Satu',
    });
    assert.equal(userUpdateKeepChatId.calledNext, true);
    assert.equal(userUpdateKeepChatId.req.body.telegram_chat_id, undefined);

    const userUpdateClearChatId = await runMiddleware(validateBody(schemas.updateUserSchema), {
      username: 'petugas1',
      role: 'Petugas Ukur',
      full_name: 'Petugas Satu',
      telegram_chat_id: '   ',
    });
    assert.equal(userUpdateClearChatId.calledNext, true);
    assert.equal(userUpdateClearChatId.req.body.telegram_chat_id, null);
  });

  it('memvalidasi saran fitur baru dengan kategori default dan menolak deskripsi kosong', async () => {
    const valid = await runMiddleware(validateBody(schemas.createSuggestionSchema), {
      title: '  Export PDF  ',
      description: 'Tambahkan tombol export',
    });
    assert.equal(valid.calledNext, true);
    assert.equal(valid.req.body.title, 'Export PDF');
    assert.equal(valid.req.body.category, 'Fitur Baru');

    const invalid = await runMiddleware(validateBody(schemas.createSuggestionSchema), {
      title: 'Ada judul',
      description: '   ',
    });
    assert.equal(invalid.calledNext, false);
    assert.equal(invalid.statusCode, 400);
  });
});
