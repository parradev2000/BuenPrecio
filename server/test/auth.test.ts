import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { TEST_DATABASE_URL } from './db-url.js';
import { truncateAll } from './helpers.js';

const BASE = '/api/v1';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterEach(async () => {
  await truncateAll(app);
});

async function registerUser(app: FastifyInstance, overrides: Record<string, unknown> = {}) {
  return app.inject({
    method: 'POST',
    url: `${BASE}/auth/register`,
    payload: { name: 'Ana Ponce', email: 'ana@ejemplo.com', password: 'secreta123', ...overrides },
  });
}

describe('auth', () => {
  it('registra un consumidor y devuelve tokens', async () => {
    const res = await registerUser(app);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.role).toBe('consumidor');
    expect(body.user.email).toBe('ana@ejemplo.com');
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it('rechaza registros con email duplicado', async () => {
    await registerUser(app);
    const res = await registerUser(app);
    expect(res.statusCode).toBe(409);
  });

  it('rechaza contraseña corta', async () => {
    const res = await registerUser(app, { password: 'corta' });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/8 caracteres/);
  });

  it('rechaza email mal formado', async () => {
    const res = await registerUser(app, { email: 'no-es-un-correo' });
    expect(res.statusCode).toBe(400);
  });

  it('inicia sesión y verifica me', async () => {
    await registerUser(app);
    const login = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'ana@ejemplo.com', password: 'secreta123' },
    });
    expect(login.statusCode).toBe(200);
    const { accessToken } = login.json();

    const me = await app.inject({
      method: 'GET',
      url: `${BASE}/auth/me`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe('ana@ejemplo.com');
  });

  it('rechaza login con contraseña incorrecta', async () => {
    await registerUser(app);
    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'ana@ejemplo.com', password: 'incorrecta' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rechaza /me sin token', async () => {
    const res = await app.inject({ method: 'GET', url: `${BASE}/auth/me` });
    expect(res.statusCode).toBe(401);
  });

  it('rota refresh tokens y deja inválido el anterior', async () => {
    const reg = await registerUser(app);
    const { refreshToken } = reg.json();

    const rotated = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/refresh`,
      payload: { refreshToken },
    });
    expect(rotated.statusCode).toBe(200);
    const newRefresh = rotated.json().refreshToken;
    expect(newRefresh).not.toBe(refreshToken);

    const reuse = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/refresh`,
      payload: { refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
  });

  it('revoca el refresh token al hacer logout', async () => {
    const reg = await registerUser(app);
    const { refreshToken } = reg.json();

    const logout = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/logout`,
      payload: { refreshToken },
    });
    expect(logout.statusCode).toBe(204);

    const refresh = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/refresh`,
      payload: { refreshToken },
    });
    expect(refresh.statusCode).toBe(401);
  });

  it('cambia la contraseña y deja la nueva vigente', async () => {
    const reg = await registerUser(app);
    const { accessToken } = reg.json();

    const change = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/change-password`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: 'secreta123', newPassword: 'nueva-pass-8' },
    });
    expect(change.statusCode).toBe(204);

    const loginOld = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'ana@ejemplo.com', password: 'secreta123' },
    });
    expect(loginOld.statusCode).toBe(401);

    const loginNew = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'ana@ejemplo.com', password: 'nueva-pass-8' },
    });
    expect(loginNew.statusCode).toBe(200);
  });

  it('revoca las sesiones al cambiar la contraseña', async () => {
    const reg = await registerUser(app);
    const { accessToken, refreshToken } = reg.json();

    const existing = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/refresh`,
      payload: { refreshToken },
    });
    expect(existing.statusCode).toBe(200);
    const currentRefresh = existing.json().refreshToken;

    await app.inject({
      method: 'POST',
      url: `${BASE}/auth/change-password`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: 'secreta123', newPassword: 'nueva-pass-8' },
    });

    const refresh = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/refresh`,
      payload: { refreshToken: currentRefresh },
    });
    expect(refresh.statusCode).toBe(401);
  });

  it('rechaza cambio con contraseña actual incorrecta', async () => {
    const reg = await registerUser(app);
    const { accessToken } = reg.json();

    const bad = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/change-password`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: 'incorrecta', newPassword: 'nueva-pass-8' },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toMatch(/actual no es correcta/);
  });

  it('rechaza contraseña nueva corta o igual a la actual', async () => {
    const reg = await registerUser(app);
    const { accessToken } = reg.json();

    const short = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/change-password`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: 'secreta123', newPassword: 'corta' },
    });
    expect(short.statusCode).toBe(400);

    const same = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/change-password`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: 'secreta123', newPassword: 'secreta123' },
    });
    expect(same.statusCode).toBe(400);
  });

  it('rechaza cambio de contraseña sin token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/change-password`,
      headers: { authorization: 'Bearer token-invalido' },
      payload: { currentPassword: 'secreta123', newPassword: 'nueva-pass-8' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rechaza /auth/google sin idToken', async () => {
    const res = await app.inject({ method: 'POST', url: `${BASE}/auth/google`, payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it('rechaza /auth/google con idToken basura', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/google`,
      payload: { idToken: 'token-basura' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rechaza login por contraseña en cuenta creada con Google', async () => {
    await registerUser(app);
    const { default: postgres } = await import('postgres');
    const sql = postgres(TEST_DATABASE_URL, { max: 1 });
    await sql`update users set password_hash = null where email = 'ana@ejemplo.com'`;
    await sql.end();

    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'ana@ejemplo.com', password: 'secreta123' },
    });
    expect(res.statusCode).toBe(401);
  });
});