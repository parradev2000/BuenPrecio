import type { FastifyInstance } from 'fastify';
import { count, eq } from 'drizzle-orm';
import { createCategorySchema, updateCategorySchema } from '@buenprecio/shared';
import { db } from '../db.js';
import { sendError } from '../lib/errors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { businessItems, businesses, categories } from '../schema.js';

async function isInUse(categoryId: string): Promise<boolean> {
  const [businessHits, itemHits] = await Promise.all([
    db.select({ value: count() }).from(businesses).where(eq(businesses.categoryId, categoryId)),
    db.select({ value: count() }).from(businessItems).where(eq(businessItems.categoryId, categoryId)),
  ]);
  return businessHits[0].value + itemHits[0].value > 0;
}

export async function categoryRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: requireRole('administrador') };

  app.get('/categories', async (request) => {
    const { kind } = request.query as { kind?: string };
    const rows = await db.query.categories.findMany({
      where: kind === 'negocio' || kind === 'item' ? eq(categories.kind, kind) : undefined,
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });
    return { items: rows, total: rows.length };
  });

  app.post('/categories', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const existing = await db.query.categories.findFirst({
      where: (categories, { and }) =>
        and(eq(categories.kind, parsed.data.kind), eq(categories.name, parsed.data.name)),
    });
    if (existing) {
      return sendError(reply, 409, 'El tipo de negocio ya existe');
    }
    const [category] = await db.insert(categories).values(parsed.data).returning();
    return reply.code(201).send({ category });
  });

  app.patch('/categories/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const target = await db.query.categories.findFirst({ where: eq(categories.id, id) });
    if (!target) {
      return sendError(reply, 404, 'Tipo de negocio no encontrado');
    }
    const values = parsed.data;
    if (values.kind && values.kind !== target.kind && (await isInUse(target.id))) {
      return sendError(reply, 409, 'El tipo de negocio está en uso y no puede cambiar de tipo');
    }
    const name = values.name ?? target.name;
    const kind = values.kind ?? target.kind;
    if (name !== target.name || kind !== target.kind) {
      const duplicate = await db.query.categories.findFirst({
        where: (categories, { and, eq: equals, ne }) =>
          and(eq(categories.kind, kind), equals(categories.name, name), ne(categories.id, target.id)),
      });
      if (duplicate) {
        return sendError(reply, 409, 'Ya existe una categoría con ese nombre');
      }
    }
    const [updated] = await db
      .update(categories)
      .set(values)
      .where(eq(categories.id, target.id))
      .returning();
    return { category: updated };
  });

  app.delete('/categories/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const target = await db.query.categories.findFirst({ where: eq(categories.id, id) });
    if (!target) {
      return sendError(reply, 404, 'Tipo de negocio no encontrado');
    }
    if (await isInUse(target.id)) {
      return sendError(reply, 409, 'El tipo de negocio está en uso');
    }
    await db.delete(categories).where(eq(categories.id, target.id));
    return reply.code(204).send();
  });
}