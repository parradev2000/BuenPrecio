import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { db } from '../src/db.js';
import { hashPassword } from '../src/lib/password.js';
import { businessItems, businesses, categories, productCategories, users } from '../src/schema.js';
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

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

describe('gestión de usuarios (admin)', () => {
  it('lista usuarios y filtra por rol', async () => {
    const admin = await createAdmin();
    await register('Ana', 'ana@ejemplo.com');
    await register('Bruno', 'bruno@ejemplo.com');

    const all = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/users`,
      headers: auth(admin.accessToken),
    });
    expect(all.json().total).toBe(3);

    const consumers = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/users?role=consumidor`,
      headers: auth(admin.accessToken),
    });
    expect(consumers.json().total).toBe(2);
  });

  it('suspende un usuario y su sesión queda bloqueada', async () => {
    const admin = await createAdmin();
    const consumer = await register('Ana', 'ana@ejemplo.com');

    const suspend = await app.inject({
      method: 'PATCH',
      url: `${BASE}/admin/users/${consumer.user.id}`,
      headers: auth(admin.accessToken),
      payload: { status: 'suspended' },
    });
    expect(suspend.statusCode).toBe(200);
    expect(suspend.json().user.status).toBe('suspended');

    const me = await app.inject({
      method: 'GET',
      url: `${BASE}/auth/me`,
      headers: auth(consumer.accessToken),
    });
    expect(me.statusCode).toBe(403);
  });

  it('cambia el rol de un usuario', async () => {
    const admin = await createAdmin();
    const consumer = await register('Ana', 'ana@ejemplo.com');

    const change = await app.inject({
      method: 'PATCH',
      url: `${BASE}/admin/users/${consumer.user.id}`,
      headers: auth(admin.accessToken),
      payload: { role: 'productor' },
    });
    expect(change.json().user.role).toBe('productor');
  });

  it('no permite modificar la propia cuenta', async () => {
    const admin = await createAdmin();
    const adminUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.role, 'administrador'),
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `${BASE}/admin/users/${adminUser!.id}`,
      headers: auth(admin.accessToken),
      payload: { status: 'suspended' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('puede subir a admin y bajar a un segundo admin sin quedarse sin administradores', async () => {
    const admin = await createAdmin();
    const consumer = await register('Ana', 'ana@ejemplo.com');
    const promote = await app.inject({
      method: 'PATCH',
      url: `${BASE}/admin/users/${consumer.user.id}`,
      headers: auth(admin.accessToken),
      payload: { role: 'administrador' },
    });
    expect(promote.statusCode).toBe(200);

    const demote = await app.inject({
      method: 'PATCH',
      url: `${BASE}/admin/users/${consumer.user.id}`,
      headers: auth(admin.accessToken),
      payload: { role: 'consumidor' },
    });
    expect(demote.statusCode).toBe(200);
    expect(demote.json().user.role).toBe('consumidor');

    const remaining = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/users?role=administrador`,
      headers: auth(admin.accessToken),
    });
    expect(remaining.json().total).toBe(1);
  });

  it('un productor no puede usar rutas de admin', async () => {
    const admin = await createAdmin();
    const consumer = await register('Ana', 'ana@ejemplo.com');
    await app.inject({
      method: 'PATCH',
      url: `${BASE}/admin/users/${consumer.user.id}`,
      headers: auth(admin.accessToken),
      payload: { role: 'productor' },
    });
    const login = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/login`,
      payload: { email: 'ana@ejemplo.com', password: 'secreta123' },
    });
    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/users`,
      headers: auth(login.json().accessToken),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('negocios (vista admin)', () => {
  it('lista todos los negocios con datos del dueño', async () => {
    const admin = await createAdmin();
    const [owner] = await db
      .insert(users)
      .values({ name: 'Luis', email: 'luis@ejemplo.com', passwordHash: 'x', role: 'productor' })
      .returning();
    const [b1] = await db
      .insert(businesses)
      .values({ name: 'Negocio A', ownerId: owner.id })
      .returning();
    await db
      .insert(businessItems)
      .values({ businessId: b1.id, type: 'producto', name: 'Pan', price: 50 })
      .returning();

    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/businesses`,
      headers: auth(admin.accessToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
    expect(res.json().items[0].ownerName).toBe('Luis');
    expect(res.json().items[0].ownerEmail).toBe('luis@ejemplo.com');
    expect(res.json().items[0].itemsCount).toBe(1);
  });
});

describe('categorías', () => {
  it('la lectura es pública y solo admin puede crear', async () => {
    const admin = await createAdmin();
    const publicRead = await app.inject({ method: 'GET', url: `${BASE}/categories` });
    expect(publicRead.statusCode).toBe(200);

    const consumer = await register('Ana', 'ana@ejemplo.com');
    const byConsumer = await app.inject({
      method: 'POST',
      url: `${BASE}/categories`,
      headers: auth(consumer.accessToken),
      payload: { name: 'Café', kind: 'negocio' },
    });
    expect(byConsumer.statusCode).toBe(403);

    const create = await app.inject({
      method: 'POST',
      url: `${BASE}/categories`,
      headers: auth(admin.accessToken),
      payload: { name: 'Frutas', kind: 'negocio' },
    });
    expect(create.statusCode).toBe(201);
  });

  it('requiere sesión para crear categorías', async () => {
    const anonymous = await app.inject({
      method: 'POST',
      url: `${BASE}/categories`,
      payload: { name: 'Café', kind: 'negocio' },
    });
    expect(anonymous.statusCode).toBe(401);
  });

  it('no deja crear un duplicado', async () => {
    const admin = await createAdmin();
    const payload = { name: 'Café', kind: 'negocio' };
    await app.inject({
      method: 'POST',
      url: `${BASE}/categories`,
      headers: auth(admin.accessToken),
      payload,
    });
    const dup = await app.inject({
      method: 'POST',
      url: `${BASE}/categories`,
      headers: auth(admin.accessToken),
      payload,
    });
    expect(dup.statusCode).toBe(409);
  });

  it('admin renombra un tipo de negocio', async () => {
    const admin = await createAdmin();
    const [cat] = await db
      .insert(categories)
      .values({ name: 'Panadería', kind: 'negocio' })
      .returning();

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/categories/${cat.id}`,
      headers: auth(admin.accessToken),
      payload: { name: 'Panadería y Repostería' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().category.name).toBe('Panadería y Repostería');
  });

  it('rechaza renombrar a un tipo de negocio duplicado', async () => {
    const admin = await createAdmin();
    const payload = { name: 'Café', kind: 'negocio' };
    await app.inject({
      method: 'POST',
      url: `${BASE}/categories`,
      headers: auth(admin.accessToken),
      payload,
    });
    const [other] = await db
      .insert(categories)
      .values({ name: 'Cafetería', kind: 'negocio' })
      .returning();

    const patch = await app.inject({
      method: 'PATCH',
      url: `${BASE}/categories/${other.id}`,
      headers: auth(admin.accessToken),
      payload: { name: 'Café' },
    });
    expect(patch.statusCode).toBe(409);
    expect(patch.json().message).toBe('El tipo de negocio ya existe');
  });

  it('permite borrar una categoría sin uso y bloquea si está en uso', async () => {
    const admin = await createAdmin();
    const [cat] = await db.insert(categories).values({ name: 'Café', kind: 'negocio' }).returning();
    const unused = await app.inject({
      method: 'DELETE',
      url: `${BASE}/categories/${cat.id}`,
      headers: auth(admin.accessToken),
    });
    expect(unused.statusCode).toBe(204);

    const [cat2] = await db.insert(categories).values({ name: 'Café', kind: 'negocio' }).returning();
    const [owner] = await db
      .insert(users)
      .values({ name: 'Luis', email: 'luis@ejemplo.com', passwordHash: 'x', role: 'productor' })
      .returning();
    await db.insert(businesses).values({ name: 'Cafetería', ownerId: owner.id, categoryId: cat2.id });
    const inUse = await app.inject({
      method: 'DELETE',
      url: `${BASE}/categories/${cat2.id}`,
      headers: auth(admin.accessToken),
    });
    expect(inUse.statusCode).toBe(409);
  });

  it('el admin puede editar el nombre y el tipo de una categoría', async () => {
    const admin = await createAdmin();
    const create = await app.inject({
      method: 'POST',
      url: `${BASE}/categories`,
      headers: auth(admin.accessToken),
      payload: { name: 'Café', kind: 'negocio' },
    });
    const id = create.json().category.id;

    const renamed = await app.inject({
      method: 'PATCH',
      url: `${BASE}/categories/${id}`,
      headers: auth(admin.accessToken),
      payload: { name: 'Cafetería' },
    });
    expect(renamed.statusCode).toBe(200);
    expect(renamed.json().category).toMatchObject({ name: 'Cafetería', kind: 'negocio' });

    const moved = await app.inject({
      method: 'PATCH',
      url: `${BASE}/categories/${id}`,
      headers: auth(admin.accessToken),
      payload: { kind: 'item' },
    });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().category.kind).toBe('item');
  });

  it('solo el admin puede editar categorías', async () => {
    const consumer = await register('Ana', 'ana@ejemplo.com');
    const [cat] = await db.insert(categories).values({ name: 'Café', kind: 'negocio' }).returning();
    const res = await app.inject({
      method: 'PATCH',
      url: `${BASE}/categories/${cat.id}`,
      headers: auth(consumer.accessToken),
      payload: { name: 'Otra' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('no deja editar a un nombre existente ni cambiar de tipo si está en uso', async () => {
    const admin = await createAdmin();
    await db.insert(categories).values({ name: 'Café', kind: 'negocio' });
    const [target] = await db.insert(categories).values({ name: 'Frutas', kind: 'negocio' }).returning();

    const dup = await app.inject({
      method: 'PATCH',
      url: `${BASE}/categories/${target.id}`,
      headers: auth(admin.accessToken),
      payload: { name: 'Café' },
    });
    expect(dup.statusCode).toBe(409);

    const [owner] = await db
      .insert(users)
      .values({ name: 'Luis', email: 'luis@ejemplo.com', passwordHash: 'x', role: 'productor' })
      .returning();
    await db.insert(businesses).values({ name: 'Cafetería', ownerId: owner.id, categoryId: target.id });
    const changeKind = await app.inject({
      method: 'PATCH',
      url: `${BASE}/categories/${target.id}`,
      headers: auth(admin.accessToken),
      payload: { kind: 'item' },
    });
    expect(changeKind.statusCode).toBe(409);
  });

  it('devuelve estadísticas generales solo a admin', async () => {
    const consumer = await register('Ana', 'ana@ejemplo.com');
    const forbidden = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/stats`,
      headers: auth(consumer.accessToken),
    });
    expect(forbidden.statusCode).toBe(403);

    const admin = await createAdmin();
    const [owner] = await db
      .insert(users)
      .values({ name: 'Luis', email: 'luis@ejemplo.com', passwordHash: 'x', role: 'productor' })
      .returning();
    const [cat] = await db.insert(categories).values({ name: 'Café', kind: 'negocio' }).returning();
    const [prodCat] = await db.insert(productCategories).values({ name: 'Bebidas' }).returning();
    const [biz] = await db
      .insert(businesses)
      .values({ name: 'Cafetería', ownerId: owner.id, active: true, categoryId: cat.id })
      .returning();
    await db.insert(businessItems).values({
      businessId: biz.id,
      type: 'producto',
      name: 'Café',
      price: 50,
      categoryId: prodCat.id,
    });
    await db.insert(businessItems).values({
      businessId: biz.id,
      type: 'servicio',
      name: 'Barista a domicilio',
      price: 100,
    });

    const res = await app.inject({
      method: 'GET',
      url: `${BASE}/admin/stats`,
      headers: auth(admin.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const stats = res.json();
    expect(stats.totals.businesses).toBeGreaterThanOrEqual(1);
    expect(stats.totals.products).toBe(1);
    expect(stats.totals.services).toBe(1);
    expect(stats.byBusiness).toContainEqual({ name: 'Cafetería', products: 1, services: 1 });
    expect(stats.businessesByCategory).toContainEqual({ name: 'Café', count: 1 });
    expect(stats.productsByCategory).toContainEqual(
      expect.objectContaining({ name: expect.any(String), count: expect.any(Number) }),
    );
  });
});