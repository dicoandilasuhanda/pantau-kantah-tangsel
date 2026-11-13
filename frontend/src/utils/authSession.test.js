import { describe, it, expect } from 'vitest';
import { setCookie, getCookie, loginRequest, persistAuthSession } from './authSession';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe('authSession utilities', () => {
  it('sets and reads cookies safely', () => {
    const doc = { cookie: '' };
    setCookie('saved_username', encodeURIComponent('dico andi'), 7, doc);
    expect(doc.cookie).toContain('saved_username=dico%20andi');
    expect(doc.cookie).toContain('SameSite=Lax');

    const readerDoc = { cookie: 'other=1; saved_username=dico%20andi; remember_me=true' };
    expect(getCookie('saved_username', readerDoc)).toBe('dico andi');
    expect(getCookie('remember_me', readerDoc)).toBe('true');
    expect(getCookie('missing', readerDoc)).toBeNull();
  });

  it('expires cookie when days is -1', () => {
    const doc = { cookie: '' };
    setCookie('saved_username', '', -1, doc);
    expect(doc.cookie).toContain('Thu, 01 Jan 1970 00:00:00 UTC');
  });

  it('persists session, role array, and rememberMe preferences', () => {
    const localStore = createMemoryStorage();
    const sessionStore = createMemoryStorage();
    const doc = { cookie: '' };

    persistAuthSession({
      token: 'jwt-123',
      data: {
        user: {
          id: 42,
          username: 'petugas_sp',
          full_name: 'Petugas SP',
          role: ['Petugas_SP', 'Pengolah'],
          seksi: 'SP',
        },
      },
      username: 'petugas_sp',
      rememberMe: true,
      localStore,
      sessionStore,
      doc,
    });

    expect(localStore.getItem('token')).toBe('jwt-123');
    expect(sessionStore.getItem('session_active')).toBe('true');
    expect(localStore.getItem('role')).toBe('Petugas_SP,Pengolah');
    expect(localStore.getItem('userId')).toBe('42');
    expect(localStore.getItem('full_name')).toBe('Petugas SP');
    expect(localStore.getItem('saved_username')).toBe('petugas_sp');
    expect(localStore.getItem('remember_me')).toBe('true');
    expect(doc.cookie).toContain('remember_me=true');
  });

  it('clears saved_username when rememberMe is false', () => {
    const localStore = createMemoryStorage();
    localStore.setItem('saved_username', 'old_user');
    const sessionStore = createMemoryStorage();
    const doc = { cookie: '' };

    persistAuthSession({
      token: 'jwt-abc',
      data: { user: { id: 1, username: 'admin' }, role: 'Admin' },
      username: 'admin',
      rememberMe: false,
      localStore,
      sessionStore,
      doc,
    });

    expect(localStore.getItem('saved_username')).toBeNull();
    expect(localStore.getItem('remember_me')).toBe('false');
    expect(doc.cookie).toContain('Thu, 01 Jan 1970');
  });

  it('falls back to /api/login when /api/auth/login returns 404', async () => {
    const calls = [];
    const mockFetch = async (url) => {
      calls.push(url);
      if (url === '/api/auth/login') {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ token: 'ok-token' }) };
    };

    const result = await loginRequest('admin', 'secret', mockFetch);
    expect(calls).toEqual(['/api/auth/login', '/api/login']);
    expect(result.token).toBe('ok-token');
  });

  it('throws structured error when login fails', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Rate limited' }),
    });

    await expect(loginRequest('admin', 'wrong', mockFetch)).rejects.toMatchObject({
      status: 429,
      message: 'Rate limited',
    });
  });
});
