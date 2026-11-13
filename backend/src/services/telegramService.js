const DEFAULT_TELEGRAM_BOT_USERNAME = 'pantaukantahtangsel_bot';

/**
 * Membangun layanan Bot Telegram (@pantaukantahtangsel_bot) untuk notifikasi dan polling perintah.
 */
function createTelegramService({
  db,
  bcrypt,
  botUsername = process.env.TELEGRAM_BOT_USERNAME || DEFAULT_TELEGRAM_BOT_USERNAME,
  botToken = process.env.TELEGRAM_BOT_TOKEN || '',
  fetchFn = global.fetch,
}) {
  let lastTelegramUpdateId = 0;
  let isPollingTelegram = false;

  async function sendTelegramMessage(chatId, text) {
    if (!chatId) return { ok: false, description: 'Chat ID kosong' };
    if (!botToken) {
      return { ok: false, description: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi' };
    }
    try {
      const res = await fetchFn(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: String(chatId).trim(),
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      const data = await res.json();
      return { ok: Boolean(data && data.ok), description: data?.description || '' };
    } catch (err) {
      console.error('Telegram sendMessage error:', err.message);
      return { ok: false, description: err.message };
    }
  }

  function linkTelegramAccount(chatId, inputUsername, inputPassword) {
    db.get(
      'SELECT id, username, password, full_name, role FROM users WHERE LOWER(username) = LOWER(?)',
      [inputUsername],
      (err, user) => {
        if (err || !user) {
          sendTelegramMessage(
            chatId,
            `Username <code>${inputUsername}</code> tidak ditemukan di sistem Pantau.Kantah Tangsel.\n\nPastikan Anda mengetik username yang sama persis dengan yang digunakan saat login di web.`
          );
          return;
        }

        if (!inputPassword) {
          sendTelegramMessage(
            chatId,
            `Untuk keamanan akun, silakan sertakan password login Anda:\n<code>/daftar ${user.username} kata_sandi_anda</code>`
          );
          return;
        }

        const isMatch = bcrypt.compareSync(inputPassword, user.password);
        if (!isMatch) {
          sendTelegramMessage(
            chatId,
            `<b>Verifikasi Gagal</b>: Password salah untuk username <code>${user.username}</code>. Silakan coba lagi.`
          );
          return;
        }

        db.run('UPDATE users SET telegram_chat_id = ? WHERE id = ?', [String(chatId), user.id], (updateErr) => {
          if (updateErr) {
            sendTelegramMessage(chatId, `Gagal menyimpan koneksi Telegram. Silakan coba lagi.`);
            return;
          }
          sendTelegramMessage(
            chatId,
            `<b>Berhasil Terhubung!</b>\n\n` +
              `Halo <b>${user.full_name}</b> (<code>${user.username}</code>),\n` +
              `Akun Telegram Anda kini telah aktif terhubung sebagai <b>${user.role}</b>.\n\n` +
              `Setiap ada berkas yang dikirim (<i>Transit</i>) ke meja Anda, bot ini akan langsung mengirim notifikasi ke HP Anda.`
          );
        });
      }
    );
  }

  async function handleTelegramUpdate(update) {
    const msg = update && update.message;
    if (!msg || !msg.text || !msg.chat) return;

    const chatId = String(msg.chat.id);
    const text = msg.text.trim();
    const lower = text.toLowerCase();

    if (lower === '/start' || lower.startsWith('/start ')) {
      const payload = text.split(/\s+/)[1];
      if (payload && payload.toLowerCase().startsWith('link_')) {
        const targetUser = payload.slice(5).trim();
        await sendTelegramMessage(
          chatId,
          `<b>Verifikasi Akun Pantau.Kantah Tangsel</b>\n\n` +
            `Untuk menghubungkan notifikasi ke akun <b>${targetUser}</b>, silakan balas dengan format:\n\n` +
            `<code>/daftar ${targetUser} kata_sandi_anda</code>`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `<b>Selamat datang di Bot Resmi Pantau.Kantah Tangsel!</b>\n\n` +
            `Untuk menghubungkan akun Anda agar otomatis menerima notifikasi kiriman berkas (<b>Transit</b>) di HP, silakan balas dengan mengetik:\n\n` +
            `<code>/daftar username password_anda</code>\n\n` +
            `<i>Contoh:</i> <code>/daftar syahrul rahasia123</code>\n\n` +
            `ID Chat Telegram Anda: <code>${chatId}</code>`
        );
      }
    } else if (lower.startsWith('/daftar') || lower.startsWith('/link')) {
      const parts = text.split(/\s+/);
      const inputUsername = parts[1] ? parts[1].trim() : '';
      const inputPassword = parts.slice(2).join(' ').trim();
      if (!inputUsername) {
        await sendTelegramMessage(
          chatId,
          `Format belum lengkap. Silakan ketik:\n<code>/daftar username password_anda</code>\n\nContoh: <code>/daftar syahrul rahasia123</code>`
        );
      } else {
        linkTelegramAccount(chatId, inputUsername, inputPassword);
      }
    } else if (lower === '/cek' || lower === '/status') {
      db.get('SELECT username, full_name, role FROM users WHERE telegram_chat_id = ?', [chatId], (err, u) => {
        if (!u) {
          sendTelegramMessage(
            chatId,
            `Telegram Anda belum terhubung ke akun mana pun.\nKetik <code>/daftar username_anda</code> untuk menghubungkan.`
          );
          return;
        }
        db.get(
          `SELECT 
             (SELECT COUNT(*) FROM files WHERE is_transit = 1 AND transit_to_username = ? AND current_location NOT IN ('Selesai', 'Ditutup')) as total_files,
             (SELECT COUNT(*) FROM surat WHERE is_transit = 1 AND transit_to_username = ? AND current_location NOT IN ('Selesai', 'Ditutup')) as total_surat
          `,
          [u.username, u.username],
          (err2, row) => {
            const fileCount = row ? row.total_files : 0;
            const suratCount = row ? row.total_surat : 0;
            sendTelegramMessage(
              chatId,
              `<b>Status Akun Terhubung</b>\n\n` +
                `Nama: <b>${u.full_name}</b> (<code>${u.username}</code>)\n` +
                `Jabatan: ${u.role}\n` +
                `Berkas Transit Menunggu: <b>${fileCount} berkas</b>\n` +
                `Surat Transit Menunggu: <b>${suratCount} surat</b>`
            );
          }
        );
      });
    } else if (lower === '/stop' || lower === '/putus') {
      db.run('UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = ?', [chatId], () => {
        sendTelegramMessage(
          chatId,
          `Notifikasi Telegram untuk akun Anda telah dinonaktifkan. Ketik <code>/daftar username</code> kapan saja untuk mengaktifkan kembali.`
        );
      });
    }
  }

  async function pollTelegramUpdates() {
    if (!botToken || isPollingTelegram) return;
    isPollingTelegram = true;
    try {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=2`;
      const res = await fetchFn(url);
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          if (update.update_id > lastTelegramUpdateId) {
            lastTelegramUpdateId = update.update_id;
          }
          await handleTelegramUpdate(update);
        }
      }
    } catch {
      // Ignore transient network errors when offline
    } finally {
      isPollingTelegram = false;
    }
  }

  function startPolling(intervalMs = 5000, initialDelayMs = 2000) {
    if (!botToken) {
      console.warn('[Telegram] TELEGRAM_BOT_TOKEN tidak disetel; bot polling dinonaktifkan.');
      return () => {};
    }
    const intervalId = setInterval(pollTelegramUpdates, intervalMs);
    const timeoutId = setTimeout(pollTelegramUpdates, initialDelayMs);
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }

  return {
    botUsername,
    sendTelegramMessage,
    linkTelegramAccount,
    handleTelegramUpdate,
    pollTelegramUpdates,
    startPolling,
  };
}

module.exports = { createTelegramService };
