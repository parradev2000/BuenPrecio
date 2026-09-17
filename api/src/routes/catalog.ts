import type { FastifyInstance } from 'fastify';
import { and, asc, count, eq, ilike, inArray, sql } from 'drizzle-orm';
import { businessItems, businesses, categories } from '../schema.js';
import { db } from '../db.js';
import { sendError } from '../lib/errors.js';

function parseCoord(value: string | undefined, min: number, max: number): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function haversineKm(lat: number, lng: number) {
  return sql`(
    6371 * acos(greatest(-1, least(1,
      cos(radians(${lat})) * cos(radians(${businesses.latitude})) *
      cos(radians(${businesses.longitude}) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(${businesses.latitude}))
    )))
  )`;
}

function roundKm(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/catalog/products', async (request) => {
    const query = request.query as { search?: string; place?: string; lat?: string; lng?: string; limit?: string };
    const lat = parseCoord(query.lat, -90, 90);
    const lng = parseCoord(query.lng, -180, 180);
    const useDistance = lat != null && lng != null;

    const conditions = [eq(businesses.active, true), eq(businessItems.available, true)];
    if (query.search?.trim()) {
      conditions.push(ilike(businessItems.name, `%${query.search.trim()}%`));
    }
    if (query.place?.trim()) {
      conditions.push(ilike(businesses.address, `%${query.place.trim()}%`));
    }
    const limit = Math.min(Math.max(Number(query.limit) || 40, 1), 50);
    const distanceExpr = useDistance ? haversineKm(lat!, lng!) : sql<number>`null`;

    const rows = await db
      .select({
        id: businessItems.id,
        type: businessItems.type,
        name: businessItems.name,
        description: businessItems.description,
        price: businessItems.price,
        unit: businessItems.unit,
        photoUrl: businessItems.photoUrl,
        categoryName: categories.name,
        businessId: businesses.id,
        businessName: businesses.name,
        businessAddress: businesses.address,
        businessLatitude: businesses.latitude,
        businessLongitude: businesses.longitude,
        distanceKm: distanceExpr,
      })
      .from(businessItems)
      .innerJoin(businesses, eq(businessItems.businessId, businesses.id))
      .leftJoin(categories, eq(businessItems.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(useDistance ? asc(distanceExpr) : businessItems.name)
      .limit(limit);

    const items = rows.map((row) => ({ ...row, distanceKm: roundKm(row.distanceKm) }));
    return { items, total: items.length, limit };
  });

  app.get('/catalog/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { lat?: string; lng?: string };
    const lat = parseCoord(query.lat, -90, 90);
    const lng = parseCoord(query.lng, -180, 180);
    const useDistance = lat != null && lng != null;

    const [row] = await db
      .select({
        id: businessItems.id,
        type: businessItems.type,
        name: businessItems.name,
        description: businessItems.description,
        price: businessItems.price,
        unit: businessItems.unit,
        photoUrl: businessItems.photoUrl,
        categoryName: categories.name,
        businessId: businesses.id,
        businessName: businesses.name,
        businessAddress: businesses.address,
        businessPhone: businesses.phone,
        businessPhotoUrl: businesses.photoUrl,
        businessLatitude: businesses.latitude,
        businessLongitude: businesses.longitude,
        distanceKm: useDistance ? haversineKm(lat!, lng!) : sql<number>`null`,
      })
      .from(businessItems)
      .innerJoin(businesses, eq(businessItems.businessId, businesses.id))
      .leftJoin(categories, eq(businessItems.categoryId, categories.id))
      .where(and(eq(businessItems.id, id), eq(businessItems.available, true), eq(businesses.active, true)))
      .limit(1);

    if (!row) {
      return sendError(reply, 404, 'Producto no encontrado');
    }
    return { item: { ...row, distanceKm: roundKm(row.distanceKm) } };
  });

  app.get('/catalog', async (request) => {
    const query = request.query as { search?: string; place?: string; categoryId?: string; limit?: string };

    const conditions = [eq(businesses.active, true)];
    if (query.search?.trim()) {
      conditions.push(ilike(businesses.name, `%${query.search.trim()}%`));
    }
    if (query.place?.trim()) {
      conditions.push(ilike(businesses.address, `%${query.place.trim()}%`));
    }
    if (query.categoryId) {
      conditions.push(eq(businesses.categoryId, query.categoryId));
    }
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50);

    const rows = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        photoUrl: businesses.photoUrl,
        latitude: businesses.latitude,
        longitude: businesses.longitude,
        categoryId: businesses.categoryId,
        categoryName: categories.name,
      })
      .from(businesses)
      .leftJoin(categories, eq(businesses.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(businesses.name)
      .limit(limit);

    const ids = rows.map((row) => row.id);
    const counts = ids.length
      ? await db
          .select({ businessId: businessItems.businessId, value: count() })
          .from(businessItems)
          .where(
            and(
              eq(businessItems.available, true),
              inArray(businessItems.businessId, ids),
            ),
          )
          .groupBy(businessItems.businessId)
      : [];
    const countMap = new Map(counts.map((c) => [c.businessId, c.value]));

    const items = rows.map((row) => ({ ...row, itemsCount: countMap.get(row.id) ?? 0 }));
    return { items, total: items.length, limit };
  });

  app.get('/catalog/businesses/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [business] = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        photoUrl: businesses.photoUrl,
        latitude: businesses.latitude,
        longitude: businesses.longitude,
        categoryId: businesses.categoryId,
        categoryName: categories.name,
      })
      .from(businesses)
      .leftJoin(categories, eq(businesses.categoryId, categories.id))
      .where(and(eq(businesses.id, id), eq(businesses.active, true)))
      .limit(1);
    if (!business) {
      return sendError(reply, 404, 'Negocio no encontrado');
    }

    const itemRows = await db
      .select({
        id: businessItems.id,
        type: businessItems.type,
        name: businessItems.name,
        description: businessItems.description,
        price: businessItems.price,
        unit: businessItems.unit,
        photoUrl: businessItems.photoUrl,
        categoryId: businessItems.categoryId,
        categoryName: categories.name,
      })
      .from(businessItems)
      .leftJoin(categories, eq(businessItems.categoryId, categories.id))
      .where(and(eq(businessItems.businessId, id), eq(businessItems.available, true)))
      .orderBy(businessItems.name);

    return { business: { ...business, items: itemRows } };
  });
}