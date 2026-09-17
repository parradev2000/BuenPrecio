import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { db } from '../src/db.js';
import { hashPassword } from '../src/lib/password.js';
import { businessItems, businesses, productCategories, users } from '../src/schema.js';
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

async function createUser(name: string, email: string, role: 'productor' | 'administrador') {
  await db.insert(users).values({ name, email, passwordHash: await hashPassword('clave123'), role });
  const login = await app.inject({
    method: 'POST',
    url: `${BASE}/auth/login`,
    payload: { email, password: 'clave123' },
  });
  return login.json() as { accessToken: string };
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

describe('categorías de producto (nomenclador)', () => {
  it('lista categorías de producto público', async () => {
    await db.insert(productCategories).values({ name: 'Bebidas' });
    await db.insert(productCategories).values({ name: 'Abarrotes' });

    const res = await app.inject({ method: 'GET', url: `${BASE}/product-categories` });
    expect(res.statusCode).toBe(200);
    const { items } = res.json();
    expect(items.map((c: { name: string }) => c.name)).toEqual(['Abarrotes', 'Bebidas']);
  });

  it('solo admin crea y elimina categorías', async () => {
    const producer = await createUser('Luis', 'luis@ejemplo.com', 'productor');
    const forbidden = await app.inject({
      method: 'POST',
      url: `${BASE}/product-categories`,
      headers: auth(producer.accessToken),
      payload: { name: 'Frutas' },
    });
    expect(forbidden.statusCode).toBe(403);

    const admin = await createUser('Root', 'root@buenprecio.app', 'administrador');
    const create = await app.inject({
      method: 'POST',
      url: `${BASE}/product-categories`,
      headers: auth(admin.accessToken),
      payload: { name: 'Frutas' },
    });
    expect(create.statusCode).toBe(201);
    const id = create.json().category.id;

    const dup = await app.inject({
      method: 'POST',
      url: `${BASE}/product-categories`,
      headers: auth(admin.accessToken),
      payload: { name: 'Frutas' },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().message).toBe('La categoría de producto ya existe');

    const remove = await app.inject({
      method: 'DELETE',
      url: `${BASE}/product-categories/${id}`,
      headers: auth(admin.accessToken),
    });
    expect(remove.statusCode).toBe(204);
  });

  it('admin renombra categoría de producto', async () => {
    const admin = await createUser('Root', 'root@buenprecio.app', 'administrador');
    const [cat] = await db.insert(productCategories).values({ name: 'Verduras' }).returning();

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/product-categories/${cat.id}`,
      headers: auth(admin.accessToken),
      payload: { name: 'Frutas y Verduras' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().category.name).toBe('Frutas y Verduras');
  });

  it('no permite eliminar categoría en uso', async () => {
    const admin = await createUser('Root', 'root@buenprecio.app', 'administrador');
    const [cat] = await db.insert(productCategories).values({ name: 'Panadería' }).returning();
    const [owner] = await db
      .insert(users)
      .values({ name: 'Luis', email: 'luis@ejemplo.com', passwordHash: 'x', role: 'productor' })
      .returning();
    const [biz] = await db
      .insert(businesses)
      .values({ name: 'Panadería Doña José', ownerId: owner.id })
      .returning();
    await db.insert(businessItems).values({
      businessId: biz.id,
      type: 'producto',
      name: 'Pan',
      price: 50,
      categoryId: cat.id,
    });

    const remove = await app.inject({
      method: 'DELETE',
      url: `${BASE}/product-categories/${cat.id}`,
      headers: auth(admin.accessToken),
    });
    expect(remove.statusCode).toBe(409);
    expect(remove.json().message).toBe('La categoría de producto está en uso');
  });

  it('404 para categoría inexistente', async () => {
    const admin = await createUser('Root', 'root@buenprecio.app', 'administrador');
    const remove = await app.inject({
      method: 'DELETE',
      url: `${BASE}/product-categories/00000000-0000-0000-0000-000000000000`,
      headers: auth(admin.accessToken),
    });
    expect(remove.statusCode).toBe(404);
  });
});