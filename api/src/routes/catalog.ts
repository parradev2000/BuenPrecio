import type { FastifyInstance } from 'fastify';
import { and, count, eq, ilike, inArray } from 'drizzle-orm';
import { businessItems, businesses, categories } from '../schema.js';
import { db } from '../db.js';
import { sendError } from '../lib/errors.js';

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/catalog', async (request) => {
    const query = request.query as { search?: string; categoryId?: string; limit?: string };

    const conditions = [eq(businesses.active, true)];
    if (query.search?.trim()) {
      conditions.push(ilike(businesses.name, `%${query.search.trim()}%`));
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