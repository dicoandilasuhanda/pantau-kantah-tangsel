export function setCookie(name, value, days, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return;
  let expires = '';
  if (days > 0) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  } else if (days < 0) {
    expires = '; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  }
  doc.cookie = `${name}=${value || ''}${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !doc.cookie) return null;
  const match = doc.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Mengirim permintaan autentikasi dengan fallback ke endpoint /api/login
 * untuk kompatibilitas API versi lama yang belum mengaktifkan /api/auth/login.
 */
export async function loginRequest(username, password, fetchFn = fetch) {
  let endpoint = '/api/auth/login';
  let res = await fetchFn(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (res.status === 404) {
    endpoint = '/api/login';
    res = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Login gagal, periksa kredensial Anda');
    err.status = res.status;
    err.response = { status: res.status, data };
    throw err;
  }

  return data;
}

/**
 * Menyimpan token, profil pengguna, dan alias kunci storage lama agar seluruh
 * modul aplikasi konsisten membaca sesi setelah login.
 */
export function persistAuthSession({
  token,
  data,
  username,
  rememberMe,
  localStore = typeof localStorage !== 'undefined' ? localStorage : null,
  sessionStore = typeof sessionStorage !== 'undefined' ? sessionStorage : null,
  doc = typeof document !== 'undefined' ? document : null,
}) {
  const userObj = data?.user || data || {};
  let userRole = data?.role || userObj.role || userObj.roles || '';
  if (Array.isArray(userRole)) userRole = userRole.join(',');

  if (sessionStore) {
    sessionStore.setItem('token', token);
    sessionStore.setItem('session_active', 'true');
    sessionStore.setItem('user', JSON.stringify(userObj));
    if (userRole) sessionStore.setItem('role', userRole);
  }

  if (localStore) {
    localStore.setItem('token', token);
    localStore.setItem('user', JSON.stringify(userObj));
    if (userRole) localStore.setItem('role', userRole);

    if (userObj.id || userObj.userId || userObj.user_id) {
      const uid = String(userObj.id || userObj.userId || userObj.user_id);
      localStore.setItem('id', uid);
      localStore.setItem('userId', uid);
    }

    if (userObj.username) localStore.setItem('username', userObj.username);
    const fullName =
      userObj.full_name ||
      userObj.fullName ||
      userObj.name ||
      userObj.nama ||
      userObj.nama_lengkap ||
      userObj.username ||
      '';
    if (fullName) {
      localStore.setItem('full_name', fullName);
      localStore.setItem('fullName', fullName);
      localStore.setItem('name', fullName);
      localStore.setItem('nama', fullName);
    }

    if (userObj.seksi) localStore.setItem('seksi', userObj.seksi);

    if (rememberMe) {
      localStore.setItem('saved_username', username);
      localStore.setItem('remember_me', 'true');
      setCookie('saved_username', encodeURIComponent(username), 30, doc);
      setCookie('remember_me', 'true', 30, doc);
    } else {
      localStore.removeItem('saved_username');
      localStore.setItem('remember_me', 'false');
      setCookie('saved_username', '', -1, doc);
      setCookie('remember_me', '', -1, doc);
    }
  }
}
