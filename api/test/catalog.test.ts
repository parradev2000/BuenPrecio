import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { db } from '../src/db.js';
import { businessItems, businesses, categories, users } from '../src/schema.js';
import { truncateAll } from './helpers.js';

const BASE = '/api/v1';

let app: FastifyInstance;

async function seedCatalog() {
  const [catNegocio] = await db
    .insert(categories)
    .values({ name: 'Alimentos', kind: 'negocio' })
    .returning();
  const [catItem] = await db
    .insert(categories)
    .values({ name: 'Repostería', kind: 'item' })
    .returning();
  const [owner] = await db
    .insert(users)
    .values({ name: 'Don Pedro', email: 'pedro@ejemplo.com', passwordHash: 'x', role: 'productor' })
    .returning();
  const [business] = await db
    .insert(businesses)
    .values({
      ownerId: owner.id,
      name: 'Cafetería La Esquina',
      description: 'Comida y café artesanal',
      categoryId: catNegocio.id,
      address: 'Calle Central #12',
      active: true,
    })
    .returning();
  const [activeItem] = await db
    .insert(businessItems)
    .values({
      businessId: business.id,
      type: 'producto',
      name: 'Pan con queso',
      price: 45,
      unit: 'unidad',
      categoryId: catItem.id,
      available: true,
    })
    .returning();
  const [inactiveItem] = await db
    .insert(businessItems)
    .values({
      businessId: business.id,
      type: 'servicio',
      name: 'Catering',
      price: 5000,
      available: false,
    })
    .returning();
  return { catNegocio, catItem, owner, business, activeItem, inactiveItem };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterEach(async () => {
  await truncateAll(app);
});

describe('catálogo público', () => {
  it('lista negocios activos sin contar ítems no disponibles', async () => {
    const { business } = await seedCatalog();

    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog` });
    expect(res.statusCode).toBe(200);
    const { items } = res.json();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(business.id);
    expect(items[0].categoryName).toBe('Alimentos');
    expect(items[0].itemsCount).toBe(1);
  });

  it('filtra por búsqueda de nombre', async () => {
    await seedCatalog();
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog?search=esquina` });
    const { items } = res.json();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Cafetería La Esquina');
  });

  it('no expone negocios inactivos', async () => {
    const [owner] = await db
      .insert(users)
      .values({ name: 'Inactivo', email: 'inactivo@ejemplo.com', passwordHash: 'x', role: 'productor' })
      .returning();
    await db.insert(businesses).values({
      ownerId: owner.id,
      name: 'Negocio Oculto',
      active: false,
    });
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog?search=oculto` });
    expect(res.json().items).toHaveLength(0);
  });

  it('detalle de negocio incluye solo ítems disponibles', async () => {
    const { business, activeItem } = await seedCatalog();
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog/businesses/${business.id}` });
    expect(res.statusCode).toBe(200);
    const { business: detail } = res.json();
    expect(detail.name).toBe('Cafetería La Esquina');
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0].id).toBe(activeItem.id);
    expect(detail.items[0].price).toBe(45);
  });

  it('404 para negocio inexistente o inactivo', async () => {
    await seedCatalog();
    const missing = await app.inject({
      method: 'GET',
      url: `${BASE}/catalog/businesses/00000000-0000-0000-0000-000000000000`,
    });
    expect(missing.statusCode).toBe(404);
  });
});