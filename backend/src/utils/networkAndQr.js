/**
 * Helper utilitas jaringan dan verifikasi token QR code.
 */

function getClientIp(req) {
  const rawIp =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for'] ||
    (req.socket && req.socket.remoteAddress) ||
    req.ip ||
    '';
  const firstIp = String(rawIp).split(',')[0].trim();
  return firstIp.replace(/^::ffff:/, '') || '127.0.0.1';
}

function verifyQRCodeToken(token, { jwt, jwtSecret }) {
  const legacySecret = 'super-secret-key-for-file-tracker';
  try {
    return jwt.verify(token, jwtSecret);
  } catch (err) {
    if (jwtSecret !== legacySecret) {
      return jwt.verify(token, legacySecret);
    }
    throw err;
  }
}

module.exports = {
  getClientIp,
  verifyQRCodeToken,
};
