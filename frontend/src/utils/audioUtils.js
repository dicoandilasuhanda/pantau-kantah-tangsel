// Utilitas Notifikasi Suara Web Audio API untuk Scanner QR Code & Sistem Pantau
// Berjalan 100% lokal, offline, tanpa dependensi file eksternal, dan kompatibel dengan semua browser desktop & mobile.

let audioContextInstance = null;

function getAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!audioContextInstance || audioContextInstance.state === 'closed') {
      audioContextInstance = new AudioCtx();
    }
    if (audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch(() => {});
    }
    return audioContextInstance;
  } catch (err) {
    console.warn('AudioContext tidak dapat diinisialisasi:', err);
    return null;
  }
}

// Buka kunci AudioContext saat ada interaksi pengguna pertama kali (diperlukan oleh browser mobile / iOS Safari)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

/**
 * Membunyikan nada konfirmasi sukses scan QR Code (Denting harmonik ganda C6 -> G6)
 * Nyaring, jernih, dan berdurasi singkat (~0.28 detik) sehingga tidak mengganggu saat scan beruntun.
 */
export function playScanSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Dynamics Compressor untuk mencegah suara pecah dan memastikan kejernihan di speaker laptop / smartphone
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, ctx.currentTime);
    compressor.knee.setValueAtTime(10, ctx.currentTime);
    compressor.ratio.setValueAtTime(5, ctx.currentTime);
    compressor.attack.setValueAtTime(0.002, ctx.currentTime);
    compressor.release.setValueAtTime(0.08, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.95, ctx.currentTime);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // 2-Nada nada sukses (C6 1046.5 Hz -> G6 1568 Hz)
    const notes = [
      { freq: 1046.5, start: 0, duration: 0.08, vol: 0.7 },
      { freq: 1568.0, start: 0.08, duration: 0.20, vol: 0.9 }
    ];

    notes.forEach(({ freq, start, duration, vol }) => {
      const startTime = ctx.currentTime + start;
      const stopTime = startTime + duration;

      // Osilator nada dasar (Sine - bulat & jernih)
      const oscSine = ctx.createOscillator();
      const gainSine = ctx.createGain();
      oscSine.type = 'sine';
      oscSine.frequency.setValueAtTime(freq, startTime);
      gainSine.gain.setValueAtTime(0.001, startTime);
      gainSine.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      gainSine.gain.exponentialRampToValueAtTime(0.0005, stopTime);
      oscSine.connect(gainSine);
      gainSine.connect(compressor);
      oscSine.start(startTime);
      oscSine.stop(stopTime + 0.015);

      // Osilator harmonik (Triangle - aksen denting lonceng renyah)
      const oscTri = ctx.createOscillator();
      const gainTri = ctx.createGain();
      oscTri.type = 'triangle';
      oscTri.frequency.setValueAtTime(freq * 1.5, startTime);
      gainTri.gain.setValueAtTime(0.001, startTime);
      gainTri.gain.linearRampToValueAtTime(vol * 0.35, startTime + 0.008);
      gainTri.gain.exponentialRampToValueAtTime(0.0005, startTime + duration * 0.65);
      oscTri.connect(gainTri);
      gainTri.connect(compressor);
      oscTri.start(startTime);
      oscTri.stop(stopTime + 0.015);
    });

    return true;
  } catch (err) {
    console.warn('Gagal memutar suara scan sukses:', err);
    return false;
  }
}

/**
 * Membunyikan nada beep cepat saat kamera pertama kali mendeteksi QR Code (~0.08 detik)
 */
export function playScanBeepSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
    return true;
  } catch {
    return false;
  }
}

/**
 * Membunyikan nada peringatan error/gagal scan (Nada rendah ~0.2 detik)
 */
export function playScanErrorSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.setValueAtTime(180, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
    return true;
  } catch {
    return false;
  }
}
