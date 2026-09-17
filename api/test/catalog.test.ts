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

async function seedProducts() {
  const [owner] = await db
    .insert(users)
    .values({ name: 'Doña Ana', email: 'ana@ejemplo.com', passwordHash: 'x', role: 'productor' })
    .returning();
  const [near] = await db
    .insert(businesses)
    .values({
      ownerId: owner.id,
      name: 'Bodega Cercana',
      address: 'Avenida 10, Centro',
      latitude: 23.1136,
      longitude: -82.3666,
      active: true,
    })
    .returning();
  const [far] = await db
    .insert(businesses)
    .values({
      ownerId: owner.id,
      name: 'Tienda Lejana',
      address: 'Calle Grande, Oriente',
      latitude: 20.022,
      longitude: -75.8,
      active: true,
    })
    .returning();
  const [nearItem] = await db
    .insert(businessItems)
    .values({ businessId: near.id, type: 'producto', name: 'Producto Cercano', price: 10, available: true })
    .returning();
  const [farItem] = await db
    .insert(businessItems)
    .values({ businessId: far.id, type: 'producto', name: 'Producto Lejano', price: 20, available: true })
    .returning();
  return { near, far, nearItem, farItem };
}

describe('catálogo de productos', () => {
  it('lista productos disponibles con datos del negocio', async () => {
    const { activeItem, business } = await seedCatalog();
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog/products` });
    expect(res.statusCode).toBe(200);
    const { items } = res.json();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(activeItem.id);
    expect(items[0].businessId).toBe(business.id);
    expect(items[0].businessName).toBe('Cafetería La Esquina');
    expect(items[0].categoryName).toBe('Repostería');
    expect(items[0].distanceKm).toBeNull();
    expect(items[0].price).toBe(45);
  });

  it('excluye productos no disponibles y negocios inactivos', async () => {
    await seedCatalog();
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog/products?search=catering` });
    expect(res.json().items).toHaveLength(0);
  });

  it('filtra por nombre del producto', async () => {
    const { nearItem } = await seedProducts();
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog/products?search=cercano` });
    const { items } = res.json();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(nearItem.id);
  });

  it('filtra por categoría de producto', async () => {
    const { catItem, activeItem } = await seedCatalog();
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog/products?categoryId=${catItem.id}` });
    const { items } = res.json();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(activeItem.id);
    const empty = await app.inject({
      method: 'GET',
      url: `${BASE}/catalog/products?categoryId=${catItem.id}&search=otro`,
    });
    expect(empty.json().items).toHaveLength(0);
  });

  it('ordena por cercanía cuando se envían lat/lng', async () => {
    const { nearItem, farItem } = await seedProducts();
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog/products?lat=23.1&lng=-82.3666` });
    expect(res.statusCode).toBe(200);
    const { items } = res.json();
    expect(items.map((i: { id: string }) => i.id)).toEqual([nearItem.id, farItem.id]);
    expect(items[0].distanceKm).toBeGreaterThan(0);
    expect(items[0].distanceKm).toBeLessThan(5);
    expect(items[0].distanceKm).toBeLessThan(items[1].distanceKm);
    // sin coordenadas, vuelve a ordenar por nombre
    const plain = await app.inject({ method: 'GET', url: `${BASE}/catalog/products` });
    const plainItems = plain.json().items as { name: string }[];
    expect(plainItems.map((i) => i.name)).toEqual(['Producto Cercano', 'Producto Lejano']);
  });

  it('detalle de producto con datos del negocio', async () => {
    const { nearItem, near } = await seedProducts();
    const res = await app.inject({ method: 'GET', url: `${BASE}/catalog/products/${nearItem.id}` });
    expect(res.statusCode).toBe(200);
    const { item } = res.json();
    expect(item.name).toBe('Producto Cercano');
    expect(item.businessName).toBe('Bodega Cercana');
    expect(item.businessAddress).toBe('Avenida 10, Centro');
    expect(item.businessLatitude).toBeCloseTo(near.latitude ?? 0, 4);
  });

  it('404 para producto inexistente o no disponible', async () => {
    await seedProducts();
    const missing = await app.inject({
      method: 'GET',
      url: `${BASE}/catalog/products/00000000-0000-0000-0000-000000000000`,
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().message).toBe('Producto no encontrado');
  });
});