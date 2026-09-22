import type { FastifyInstance } from 'fastify';
import { count, eq } from 'drizzle-orm';
import {
  createProductCategorySchema,
  updateProductCategorySchema,
} from '@buenprecio/shared';
import { db } from '../db.js';
import { sendError } from '../lib/errors.js';
import { requireRole } from '../middleware/auth.js';
import { businessItems, productCategories } from '../schema.js';

async function isInUse(categoryId: string): Promise<boolean> {
  const [itemHits] = await Promise.all([
    db
      .select({ value: count() })
      .from(businessItems)
      .where(eq(businessItems.categoryId, categoryId)),
  ]);
  return itemHits[0].value > 0;
}

export async function productCategoryRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: requireRole('administrador') };

  app.get('/product-categories', async () => {
    const rows = await db.query.productCategories.findMany({
      orderBy: (productCategories, { asc }) => [asc(productCategories.name)],
    });
    return { items: rows, total: rows.length };
  });

  app.post('/product-categories', adminOnly, async (request, reply) => {
    const parsed = createProductCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const existing = await db.query.productCategories.findFirst({
      where: eq(productCategories.name, parsed.data.name),
    });
    if (existing) {
      return sendError(reply, 409, 'La categoría de producto ya existe');
    }
    const [category] = await db.insert(productCategories).values(parsed.data).returning();
    return reply.code(201).send({ category });
  });

  app.patch('/product-categories/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateProductCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const target = await db.query.productCategories.findFirst({
      where: eq(productCategories.id, id),
    });
    if (!target) {
      return sendError(reply, 404, 'Categoría de producto no encontrada');
    }
    const values = parsed.data;
    if (values.name && values.name !== target.name) {
      const existing = await db.query.productCategories.findFirst({
        where: eq(productCategories.name, values.name),
      });
      if (existing) {
        return sendError(reply, 409, 'La categoría de producto ya existe');
      }
    }
    const [updated] = await db
      .update(productCategories)
      .set(values)
      .where(eq(productCategories.id, target.id))
      .returning();
    return { category: updated };
  });

  app.delete('/product-categories/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const target = await db.query.productCategories.findFirst({
      where: eq(productCategories.id, id),
    });
    if (!target) {
      return sendError(reply, 404, 'Categoría de producto no encontrada');
    }
    if (await isInUse(target.id)) {
      return sendError(reply, 409, 'La categoría de producto está en uso');
    }
    await db.delete(productCategories).where(eq(productCategories.id, target.id));
    return reply.code(204).send();
  });
}