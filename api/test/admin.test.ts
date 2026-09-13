import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { db } from '../src/db.js';
import { hashPassword } from '../src/lib/password.js';
import { users } from '../src/schema.js';
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

async function register(name: string, email: string) {
  const res = await app.inject({
    method: 'POST',
    url: `${BASE}/auth/register`,
    payload: { name, email, password: 'secreta123' },
  });
  return res.json() as { accessToken: string; user: { id: string; role: string } };
}

async function createAdmin() {
  const email = 'root@buenprecio.app';
  await db.insert(users).values({
    name: 'Root',
    email,
    passwordHash: await hashPassword('clave123'),
    role: 'administrador',
  });
  const login = await app.inject({
    method: 'POST',
    url: `${BASE}/auth/login`,
    payload: { email, password: 'clave123' },
  });
  return login.json() as { accessToken: string };
}

async function makeProductor(name: string, email: string, adminToken: string) {
  const { accessToken } = await register(name, email);
  await requestProducer(accessToken);
  const list = await app.inject({
    method: 'GET',
    url: `${BASE}/admin/applications`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const { id } = list.json().items[0];
  await app.inject({
    method: 'POST',
    url: `${BASE}/admin/applications/${id}/approve`,
    headers: { authorization: `Bearer ${adminToken}` },
  });
  const login = await app.inject({
    method: 'POST',
    url: `${BASE}/auth/login`,
    payload: { email, password: 'secreta123' },
  });
  return login.json() as { accessToken: string; user: { id: string } };
}

async function requestProducer(token: string) {
  return app.inject({
    method: 'POST',
    url: `${BASE}/me/producer-application`,
    headers: { authorization: `Bearer ${token}` },
  });
}

describe('solicitud de productor', () => {
  it('un consumidor solicita ser productor', async () => {
    const { accessToken } = await register('Luis', 'luis@ejemplo.com');
    const res = await requestProducer(accessToken);
    expect(res.statusCode).toBe(201);
    expect(res.json().application.status).toBe('pending');
  });

  it('no permite una segunda solicitud mientras espera', async () => {
    const { accessToken } = await register('Luis', 'luis@ejemplo.com');
    await requestProducer(accessToken);
    const res = await requestProducer(accessToken);
    expect(res.statusCode).toBe(409);
  });

  it('no permite consultar la solicitud sin token', async () => {
    const res = await app.inject({ method: 'GET', url: `${BASE}/me/producer-application` });
    expect(res.statusCode).toBe(401);
  });
});

describe('aprobacion de solicitudes (admin)', () => {
  it('aprueba la solicitud y el usuario pasa a productor', async () => {
    const { accessToken } = await register('Luis', 'luis@ejemplo.com');
    await requestProducer(accessToken);
    const admin = await createAdmin();

    const list = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/applications`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toHaveLength(1);
    const { id } = list.json().items[0];

    const approve = await app.inject({
      method: 'POST',
      url: `${BASE}/admin/applications/${id}/approve`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(approve.statusCode).toBe(200);
    expect(approve.json().application.status).toBe('approved');

    const reLogin = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'luis@ejemplo.com', password: 'secreta123' },
    });
    expect(reLogin.json().user.role).toBe('productor');
  });

  it('rechaza la solicitud y permite volver a solicitarla', async () => {
    const { accessToken } = await register('Luis', 'luis@ejemplo.com');
    await requestProducer(accessToken);
    const admin = await createAdmin();

    const list = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/applications`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    const { id } = list.json().items[0];

    const reject = await app.inject({
      method: 'POST',
      url: `${BASE}/admin/applications/${id}/reject`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(reject.statusCode).toBe(200);
    expect(reject.json().application.status).toBe('rejected');

    const retry = await requestProducer(accessToken);
    expect(retry.statusCode).toBe(200);
    expect(retry.json().application.status).toBe('pending');
  });

  it('solo el admin puede aprobar solicitudes', async () => {
    const { accessToken } = await register('Luis', 'luis@ejemplo.com');
    const res = await requestProducer(accessToken);

    const tryApprove = await app.inject({
      method: 'POST',
      url: `${BASE}/admin/applications/${res.json().application.id}/approve`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(tryApprove.statusCode).toBe(403);
  });
});

describe('eliminación de usuarios (admin)', () => {
  it('elimina un consumidor y no permite volver a entrar', async () => {
    const { accessToken, user } = await register('Ana', 'ana@ejemplo.com');
    const admin = await createAdmin();

    const del = await app.inject({
      method: 'DELETE',
      url: `${BASE}/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/users`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(list.json().items.some((u: { id: string }) => u.id === user.id)).toBe(false);

    const login = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'ana@ejemplo.com', password: 'secreta123' },
    });
    expect(login.statusCode).toBe(401);
    expect(accessToken).toBeTruthy();
  });

  it('no permite eliminar la propia cuenta', async () => {
    const admin = await createAdmin();
    const me = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/users`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    const self = me.json().items.find((u: { role: string }) => u.role === 'administrador');

    const del = await app.inject({
      method: 'DELETE',
      url: `${BASE}/admin/users/${self.id}`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(del.statusCode).toBe(400);
  });

  it('no permite eliminar al último administrador', async () => {
    const admin = await createAdmin();
    const list = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/users`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    const admins = list.json().items.filter((u: { role: string }) => u.role === 'administrador');
    expect(admins).toHaveLength(1);

    const del = await app.inject({
      method: 'DELETE',
      url: `${BASE}/admin/users/${admins[0].id}`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(del.statusCode).toBe(400);
  });

  it('elimina un productor y cascadea sus negocios', async () => {
    const admin = await createAdmin();
    const productor = await makeProductor('Luis', 'luis@ejemplo.com', admin.accessToken);
    const created = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: { authorization: `Bearer ${productor.accessToken}` },
      payload: { name: 'Panadería de Luis' },
    });
    expect(created.statusCode).toBe(201);

    const del = await app.inject({
      method: 'DELETE',
      url: `${BASE}/admin/users/${productor.user.id}`,
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(del.statusCode).toBe(204);

    const catalog = await app.inject({ method: 'GET', url: `${BASE}/catalog` });
    expect(catalog.json().items).toHaveLength(0);

    const login = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'luis@ejemplo.com', password: 'secreta123' },
    });
    expect(login.statusCode).toBe(401);
  });
});