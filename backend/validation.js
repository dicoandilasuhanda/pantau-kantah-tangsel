const fs = require('fs');
const { z } = require('zod');

/**
 * Helper field teks wajib (dikonversi ke string, di-trim, minimal 1 karakter).
 */
function requiredText(label) {
  return z.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val).trim()),
    z.string().min(1, `${label} wajib diisi.`)
  );
}

/**
 * Helper field teks wajib tanpa trimming (misal kata sandi agar spasi tidak hilang).
 */
function requiredRaw(label) {
  return z.preprocess(
    (val) => (val === undefined || val === null ? '' : String(val)),
    z.string().min(1, `${label} wajib diisi.`)
  );
}

const optionalTrimmedText = z.preprocess(
  (val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    const str = String(val).trim();
    return str === '' ? '' : str;
  },
  z.string().nullable().optional()
);

const optionalChatId = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null) return null;
  const clean = String(val).trim();
  return clean === '' ? null : clean;
}, z.string().nullable().optional());

const loginSchema = z.object({
  username: requiredText('Username'),
  password: requiredRaw('Password'),
});

const createSuratSchema = z.object({
  asal_surat: requiredText('Asal surat'),
  nomor_surat: requiredText('Nomor surat'),
  tanggal_diterima: requiredText('Tanggal diterima'),
  perihal: requiredText('Perihal surat'),
});

const scanSuratSchema = z
  .object({
    id: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
    nomor_agenda: optionalTrimmedText,
    qr_code: optionalTrimmedText,
    isFinishing: z.boolean().optional(),
    selected_role: optionalTrimmedText,
    catatan: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.id ||
          (data.nomor_agenda && String(data.nomor_agenda).trim()) ||
          (data.qr_code && String(data.qr_code).trim())
      ),
    { message: 'ID, nomor agenda, atau QR Code surat wajib disertakan.' }
  );

const transitTargetSchema = z.object({
  target_username: requiredText('Petugas tujuan'),
});

const disposisiSchema = z.object({
  isi_disposisi: requiredText('Isi disposisi'),
});

const createUserSchema = z.object({
  username: requiredText('Username'),
  password: requiredRaw('Password'),
  role: requiredText('Role pengguna'),
  full_name: requiredText('Nama lengkap'),
  telegram_chat_id: optionalChatId,
});

const updateUserSchema = z.object({
  username: requiredText('Username'),
  password: z.preprocess(
    (val) => (val === undefined || val === null ? undefined : String(val)),
    z.string().optional()
  ),
  role: requiredText('Role pengguna'),
  full_name: requiredText('Nama lengkap'),
  telegram_chat_id: optionalChatId,
});

const changePasswordSchema = z.object({
  oldPassword: requiredRaw('Kata sandi lama'),
  newPassword: requiredRaw('Kata sandi baru'),
});

const updateProfileSchema = z.object({
  full_name: requiredText('Nama lengkap'),
});

const createSuggestionSchema = z.object({
  title: requiredText('Judul saran'),
  category: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 'Fitur Baru';
      const clean = String(val).trim();
      return clean || 'Fitur Baru';
    },
    z.string()
  ),
  description: requiredText('Rincian saran'),
});

const updateSuggestionStatusSchema = z.object({
  status: requiredText('Status saran'),
  admin_notes: z.string().nullable().optional(),
});

const createFileSchema = z.object({
  nomor_berkas: requiredText('Nomor berkas'),
  tahun_berkas: requiredText('Tahun berkas'),
  nama_kegiatan: requiredText('Nama kegiatan'),
  nama_pemohon: requiredText('Nama pemohon'),
  fullName: optionalTrimmedText,
});

const scanFileSchema = z.object({
  qr_code: requiredText('QR Code berkas'),
  fullName: optionalTrimmedText,
  isFinishing: z.boolean().optional(),
  selected_role: optionalTrimmedText,
});

const noteSchema = z.object({
  catatan: z.string().nullable().optional(),
});

const verifyBackupSchema = z.object({
  filename: requiredText('Nama file backup'),
});

/**
 * Middleware Express untuk memvalidasi req.body menggunakan skema Zod.
 * Jika validasi gagal setelah multer mengunggah file sementara, file tersebut ikut dibersihkan.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      const issues = result.error?.issues || [];
      return res.status(400).json({
        error: issues[0]?.message || 'Data input tidak valid.',
        details: issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    req.body = result.data;
    return next();
  };
}

module.exports = {
  validateBody,
  schemas: {
    loginSchema,
    createSuratSchema,
    scanSuratSchema,
    transitTargetSchema,
    disposisiSchema,
    createUserSchema,
    updateUserSchema,
    changePasswordSchema,
    updateProfileSchema,
    createSuggestionSchema,
    updateSuggestionStatusSchema,
    createFileSchema,
    scanFileSchema,
    noteSchema,
    verifyBackupSchema,
  },
};

