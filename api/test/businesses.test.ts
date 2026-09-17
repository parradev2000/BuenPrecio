import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { db } from '../src/db.js';
import { hashPassword } from '../src/lib/password.js';
import { businessItems, businesses, categories, users } from '../src/schema.js';
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
  return res.json() as { accessToken: string; user: { id: string } };
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

async function createProducer(name: string, email: string) {
  const { accessToken, user } = await register(name, email);
  await app.inject({
    method: 'POST',
    url: `${BASE}/me/producer-application`,
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const admin = await createAdmin();
  const list = await app.inject({
    method: 'GET',
    url: `${BASE}/admin/applications`,
    headers: { authorization: `Bearer ${admin.accessToken}` },
  });
  const { id } = list.json().items[0];
  await app.inject({
    method: 'POST',
    url: `${BASE}/admin/applications/${id}/approve`,
    headers: { authorization: `Bearer ${admin.accessToken}` },
  });
  const login = await app.inject({
    method: 'POST',
    url: `${BASE}/auth/login`,
    payload: { email, password: 'secreta123' },
  });
  return { ...login.json() as { accessToken: string }, userId: user.id };
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

describe('negocios (productor)', () => {
  it('crea y lista sus negocios', async () => {
    const producer = await createProducer('Luis', 'luis@ejemplo.com');
    const crea = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(producer.accessToken),
      payload: { name: 'Cafetería La Esquina', address: 'Calle 12, Playa' },
    });
    expect(crea.statusCode).toBe(201);
    const businessId = crea.json().business.id;

    const list = await app.inject({
      method: 'GET',
      url: `${BASE}/my/businesses`,
      headers: auth(producer.accessToken),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toHaveLength(1);
    expect(list.json().items[0].name).toBe('Cafetería La Esquina');
    expect(list.json().items[0].active).toBe(true);
    expect(list.json().items[0].itemsCount).toBe(0);
    expect(businessId).toBeTruthy();
  });

  it('un consumidor no puede crear negocios', async () => {
    const consumer = await register('Clara', 'clara@ejemplo.com');
    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(consumer.accessToken),
      payload: { name: 'Salón Clara' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('no permite ver ni modificar un negocio ajeno', async () => {
    const p1 = await createProducer('Luis', 'luis@ejemplo.com');
    const [b1] = await db
      .insert(businesses)
      .values({ name: 'Negocio de Luis', ownerId: p1.userId })
      .returning();
    const p2 = await createProducer('Marta', 'marta@ejemplo.com');

    const view = await app.inject({
      method: 'GET',
      url: `${BASE}/businesses/${b1.id}`,
      headers: auth(p2.accessToken),
    });
    expect(view.statusCode).toBe(403);

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/businesses/${b1.id}`,
      headers: auth(p2.accessToken),
      payload: { name: 'Hackeado' },
    });
    expect(patch.statusCode).toBe(403);
  });

  it('el admin sí puede ver negocios de otros', async () => {
    const p1 = await createProducer('Luis', 'luis@ejemplo.com');
    const [b1] = await db
      .insert(businesses)
      .values({ name: 'Negocio de Luis', ownerId: p1.userId })
      .returning();
    const admin = await createAdmin();

    const view = await app.inject({
      method: 'GET',
      url: `${BASE}/businesses/${b1.id}`,
      headers: auth(admin.accessToken),
    });
    expect(view.statusCode).toBe(200);
    expect(view.json().business.name).toBe('Negocio de Luis');
  });

  it('actualiza sus datos y desaparece del catálogo al desactivarse', async () => {
    const producer = await createProducer('Luis', 'luis@ejemplo.com');
    const create = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(producer.accessToken),
      payload: { name: 'Tienda', phone: '5555555' },
    });
    const id = create.json().business.id;

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/businesses/${id}`,
      headers: auth(producer.accessToken),
      payload: { name: 'Tienda Central', phone: '7777777' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().business.name).toBe('Tienda Central');

    const catalog = await app.inject({ method: 'GET', url: `${BASE}/catalog` });
    expect(catalog.json().items).toHaveLength(1);

    const remove = await app.inject({
      method: 'DELETE',
      url: `${BASE}/businesses/${id}`,
      headers: auth(producer.accessToken),
    });
    expect(remove.json().business.active).toBe(false);

    const catalogAfter = await app.inject({ method: 'GET', url: `${BASE}/catalog` });
    expect(catalogAfter.json().items).toHaveLength(0);
  });

  it('reactiva un negocio desactivado y vuelve al catálogo', async () => {
    const producer = await createProducer('Luis', 'luis@ejemplo.com');
    const create = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(producer.accessToken),
      payload: { name: 'Tienda Reactivable' },
    });
    const id = create.json().business.id;

    await app.inject({
      method: 'DELETE',
      url: `${BASE}/businesses/${id}`,
      headers: auth(producer.accessToken),
    });

    const catalogOff = await app.inject({ method: 'GET', url: `${BASE}/catalog` });
    expect(catalogOff.json().items).toHaveLength(0);

    const reactivate = await app.inject({
      method: 'PATCH',
      url: `${BASE}/businesses/${id}`,
      headers: auth(producer.accessToken),
      payload: { active: true },
    });
    expect(reactivate.statusCode).toBe(200);
    expect(reactivate.json().business.active).toBe(true);

    const catalogOn = await app.inject({ method: 'GET', url: `${BASE}/catalog` });
    expect(catalogOn.json().items).toHaveLength(1);
  });

  it('valida categoría de negocio', async () => {
    const producer = await createProducer('Luis', 'luis@ejemplo.com');
    const [itemCategory] = await db
      .insert(categories)
      .values({ name: 'Café', kind: 'item' })
      .returning();
    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(producer.accessToken),
      payload: { name: 'Tienda', categoryId: itemCategory.id },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('Tipo de negocio inválido');
  });

  it('guarda coordenadas al crear y actualizar', async () => {
    const producer = await createProducer('Luis', 'luis@ejemplo.com');
    const create = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(producer.accessToken),
      payload: { name: 'Tienda', latitude: 14.634915, longitude: -90.506882 },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().business.latitude).toBeCloseTo(14.634915, 5);
    expect(create.json().business.longitude).toBeCloseTo(-90.506882, 5);
    const id = create.json().business.id;

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/businesses/${id}`,
      headers: auth(producer.accessToken),
      payload: { latitude: 15.7121, longitude: -87.4768 },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().business.latitude).toBeCloseTo(15.7121, 5);
    expect(patch.json().business.longitude).toBeCloseTo(-87.4768, 5);
  });
});

describe('ítems (productor)', () => {
  it('crea, lista, actualiza y elimina ítems', async () => {
    const producer = await createProducer('Luis', 'luis@ejemplo.com');
    const createBiz = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(producer.accessToken),
      payload: { name: 'Cafetería' },
    });
    const businessId = createBiz.json().business.id;

    const create = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses/${businessId}/items`,
      headers: auth(producer.accessToken),
      payload: { type: 'producto', name: 'Café con leche', price: 120, unit: 'unidad' },
    });
    expect(create.statusCode).toBe(201);
    const itemId = create.json().item.id;
    expect(create.json().item.unit).toBe('unidad');

    const list = await app.inject({
      method: 'GET',
      url: `${BASE}/businesses/${businessId}/items`,
      headers: auth(producer.accessToken),
    });
    expect(list.json().items).toHaveLength(1);

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/items/${itemId}`,
      headers: auth(producer.accessToken),
      payload: { price: 140 },
    });
    expect(patch.json().item.price).toBe(140);

    const remove = await app.inject({
      method: 'DELETE',
      url: `${BASE}/items/${itemId}`,
      headers: auth(producer.accessToken),
    });
    expect(remove.statusCode).toBe(204);

    const listAfter = await app.inject({
      method: 'GET',
      url: `${BASE}/businesses/${businessId}/items`,
      headers: auth(producer.accessToken),
    });
    expect(listAfter.json().items).toHaveLength(0);
  });

  it('un servicio no puede llevar unidad', async () => {
    const producer = await createProducer('Luis', 'luis@ejemplo.com');
    const createBiz = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(producer.accessToken),
      payload: { name: 'Salón' },
    });
    const businessId = createBiz.json().business.id;

    const ok = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses/${businessId}/items`,
      headers: auth(producer.accessToken),
      payload: { type: 'servicio', name: 'Corte de pelo', price: 350 },
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().item.unit).toBeNull();

    const bad = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses/${businessId}/items`,
      headers: auth(producer.accessToken),
      payload: { type: 'servicio', name: 'Arreglo', price: 200, unit: 'kg' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('no permite manipular ítems de negocio ajeno', async () => {
    const p1 = await createProducer('Luis', 'luis@ejemplo.com');
    const [b1] = await db
      .insert(businesses)
      .values({ name: 'Negocio de Luis', ownerId: p1.userId })
      .returning();
    const [item] = await db
      .insert(businessItems)
      .values({ businessId: b1.id, type: 'producto', name: 'Pan', price: 50, unit: 'unidad' })
      .returning();
    const p2 = await createProducer('Marta', 'marta@ejemplo.com');

    const res = await app.inject({
      method: 'PATCH',
      url: `${BASE}/items/${item.id}`,
      headers: auth(p2.accessToken),
      payload: { price: 1 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('guarda y retorna photoUrl del ítem', async () => {
    const producer = await createProducer('Luis', 'luis@ejemplo.com');
    const createBiz = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses`,
      headers: auth(producer.accessToken),
      payload: { name: 'Tienda' },
    });
    const businessId = createBiz.json().business.id;

    const create = await app.inject({
      method: 'POST',
      url: `${BASE}/businesses/${businessId}/items`,
      headers: auth(producer.accessToken),
      payload: { type: 'producto', name: 'Pan', price: 50, unit: 'unidad', photoUrl: 'https://ejemplo.com/pan.jpg' },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().item.photoUrl).toBe('https://ejemplo.com/pan.jpg');

    const detail = await app.inject({
      method: 'GET',
      url: `${BASE}/businesses/${businessId}`,
      headers: auth(producer.accessToken),
    });
    expect(detail.json().business.items[0].photoUrl).toBe('https://ejemplo.com/pan.jpg');

    const cat = await app.inject({
      method: 'GET',
      url: `${BASE}/catalog/businesses/${businessId}`,
    });
    expect(cat.json().business.items[0].photoUrl).toBe('https://ejemplo.com/pan.jpg');

    const clear = await app.inject({
      method: 'PATCH',
      url: `${BASE}/items/${create.json().item.id}`,
      headers: auth(producer.accessToken),
      payload: { photoUrl: null },
    });
    expect(clear.statusCode).toBe(200);
    expect(clear.json().item.photoUrl).toBeNull();
  });
});