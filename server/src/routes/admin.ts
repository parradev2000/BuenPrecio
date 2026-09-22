import type { FastifyInstance } from 'fastify';
import { and, count, eq, ilike, inArray, isNull } from 'drizzle-orm';
import {
  PRODUCER_APPLICATION_STATUS,
  ROLE_NAMES,
  USER_STATUS_NAMES,
  updateUserSchema,
  type ProducerApplicationStatus,
  type Role,
} from '@buenprecio/shared';
import { db } from '../db.js';
import { sendError } from '../lib/errors.js';
import { toSafeApplication } from '../lib/application.js';
import { requireRole } from '../middleware/auth.js';
import {
  businessItems,
  businesses,
  categories,
  priceReports,
  producerApplications,
  productCategories,
  refreshTokens,
  users,
} from '../schema.js';

function pickDefined(obj: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries(keys.filter((key) => obj[key] !== undefined).map((key) => [key, obj[key]]));
}

export async function adminRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: requireRole('administrador') };

  app.get('/admin/users', adminOnly, async (request) => {
    const { role, status, search } = request.query as { role?: string; status?: string; search?: string };
    const conditions = [];
    if (role && (ROLE_NAMES as readonly string[]).includes(role)) {
      conditions.push(eq(users.role, role as Role));
    }
    if (status && (USER_STATUS_NAMES as readonly string[]).includes(status)) {
      conditions.push(eq(users.status, status as 'active' | 'suspended'));
    }
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(ilike(users.name, term));
    }

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(users.name);
    return { items: rows, total: rows.length };
  });

  app.patch('/admin/users/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id === request.currentUser!.id) {
      return sendError(reply, 400, 'No puedes modificar tu propia cuenta');
    }
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const target = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!target) {
      return sendError(reply, 404, 'Usuario no encontrado');
    }
    const values = pickDefined(parsed.data, ['status', 'role']);

    if (values.role && values.role !== target.role && target.role === 'administrador') {
      const [{ value: adminCount }] = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.role, 'administrador'));
      if (Number(adminCount) <= 1) {
        return sendError(reply, 409, 'Debe existir al menos un administrador');
      }
    }

    const [updated] = await db
      .update(users)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(users.id, target.id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        updatedAt: users.updatedAt,
      });

    if (updated.status === 'suspended') {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, target.id), isNull(refreshTokens.revokedAt)));
    }
    return { user: updated };
  });

  app.delete('/admin/users/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return sendError(reply, 404, 'Usuario no encontrado');
    }
    if (id === request.currentUser!.id) {
      return sendError(reply, 400, 'No puedes eliminar tu propia cuenta');
    }
    const target = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!target) {
      return sendError(reply, 404, 'Usuario no encontrado');
    }
    if (target.role === 'administrador') {
      const [{ value: adminCount }] = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.role, 'administrador'));
      if (Number(adminCount) <= 1) {
        return sendError(reply, 409, 'Debe existir al menos un administrador');
      }
    }
    await db.transaction(async (tx) => {
      await tx
        .update(priceReports)
        .set({ reportedBy: null })
        .where(eq(priceReports.reportedBy, target.id));
      await tx
        .update(producerApplications)
        .set({ reviewedBy: null })
        .where(eq(producerApplications.reviewedBy, target.id));
      await tx.delete(users).where(eq(users.id, target.id));
    });
    return reply.code(204).send();
  });

  app.get('/admin/businesses', adminOnly, async (request) => {
    const { active, search } = request.query as { active?: string; search?: string };
    const conditions = [];
    if (active === 'true') conditions.push(eq(businesses.active, true));
    if (active === 'false') conditions.push(eq(businesses.active, false));
    if (search?.trim()) {
      conditions.push(ilike(businesses.name, `%${search.trim()}%`));
    }

    const rows = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        categoryId: businesses.categoryId,
        active: businesses.active,
        createdAt: businesses.createdAt,
        ownerId: businesses.ownerId,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(businesses)
      .leftJoin(users, eq(businesses.ownerId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(businesses.name);

    const ids = rows.map((row) => row.id);
    const counts = ids.length
      ? await db
          .select({ businessId: businessItems.businessId, value: count() })
          .from(businessItems)
          .where(inArray(businessItems.businessId, ids))
          .groupBy(businessItems.businessId)
      : [];
    const countMap = new Map(counts.map((c) => [c.businessId, c.value]));
    const items = rows.map((row) => ({ ...row, itemsCount: countMap.get(row.id) ?? 0 }));
    return { items, total: items.length };
  });

  app.delete('/admin/businesses/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return sendError(reply, 404, 'Negocio no encontrado');
    }
    const target = await db.query.businesses.findFirst({ where: eq(businesses.id, id) });
    if (!target) {
      return sendError(reply, 404, 'Negocio no encontrado');
    }
    // Ítems y reportes de precio se borran en cascada.
    await db.delete(businesses).where(eq(businesses.id, target.id));
    return reply.code(204).send();
  });

  app.get('/admin/applications', adminOnly, async (request) => {
    const { status } = request.query as { status?: string };
    const filter =
      status && (PRODUCER_APPLICATION_STATUS as readonly string[]).includes(status)
        ? eq(producerApplications.status, status as ProducerApplicationStatus)
        : eq(producerApplications.status, 'pending');

    const rows = await db
      .select({
        id: producerApplications.id,
        status: producerApplications.status,
        createdAt: producerApplications.createdAt,
        reviewedAt: producerApplications.reviewedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(producerApplications)
      .innerJoin(users, eq(producerApplications.userId, users.id))
      .where(filter)
      .orderBy(producerApplications.createdAt);

    return { items: rows, total: rows.length };
  });

  app.post('/admin/applications/:id/approve', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const application = await db.query.producerApplications.findFirst({
      where: eq(producerApplications.id, id),
    });
    if (!application) {
      return sendError(reply, 404, 'Solicitud no encontrada');
    }
    if (application.status === 'approved') {
      return { application: toSafeApplication(application) };
    }

    const updated = await db.transaction(async (tx) => {
      const [approved] = await tx
        .update(producerApplications)
        .set({
          status: 'approved',
          reviewedBy: request.currentUser!.id,
          reviewedAt: new Date(),
        })
        .where(eq(producerApplications.id, application.id))
        .returning();
      await tx.update(users).set({ role: 'productor' }).where(eq(users.id, application.userId));
      return approved;
    });

    return { application: toSafeApplication(updated) };
  });

  app.post('/admin/applications/:id/reject', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string };
    const application = await db.query.producerApplications.findFirst({
      where: eq(producerApplications.id, id),
    });
    if (!application) {
      return sendError(reply, 404, 'Solicitud no encontrada');
    }
    if (application.status !== 'pending') {
      return sendError(reply, 409, 'La solicitud ya fue revisada');
    }
    const [updated] = await db
      .update(producerApplications)
      .set({
        status: 'rejected',
        reviewedBy: request.currentUser!.id,
        reviewedAt: new Date(),
      })
      .where(eq(producerApplications.id, application.id))
      .returning();
    return { application: toSafeApplication(updated) };
  });

  app.get('/admin/stats', adminOnly, async () => {
    const [totalBusinesses, totalProducts, totalServices, byBusinessRows, businessesByCategory, productsByCategory] =
      await Promise.all([
        db.select({ value: count() }).from(businesses),
        db.select({ value: count() }).from(businessItems).where(eq(businessItems.type, 'producto')),
        db.select({ value: count() }).from(businessItems).where(eq(businessItems.type, 'servicio')),
        db
          .select({
            businessId: businessItems.businessId,
            name: businesses.name,
            type: businessItems.type,
            count: count(),
          })
          .from(businessItems)
          .innerJoin(businesses, eq(businessItems.businessId, businesses.id))
          .groupBy(businessItems.businessId, businesses.name, businessItems.type),
        db
          .select({ name: categories.name, count: count() })
          .from(businesses)
          .leftJoin(categories, eq(businesses.categoryId, categories.id))
          .groupBy(categories.id, categories.name),
        db
          .select({ name: productCategories.name, count: count() })
          .from(businessItems)
          .leftJoin(productCategories, eq(businessItems.categoryId, productCategories.id))
          .groupBy(productCategories.id, productCategories.name),
      ]);

    const countsByBusiness = new Map<string, { products: number; services: number }>();
    for (const row of byBusinessRows) {
      const current = countsByBusiness.get(row.businessId) ?? { products: 0, services: 0 };
      if (row.type === 'producto') current.products = row.count;
      if (row.type === 'servicio') current.services = row.count;
      countsByBusiness.set(row.businessId, current);
    }

    const allBusinesses = await db.select({ id: businesses.id, name: businesses.name }).from(businesses);

    return {
      totals: {
        businesses: totalBusinesses[0].value,
        products: totalProducts[0].value,
        services: totalServices[0].value,
      },
      byBusiness: allBusinesses
        .map((b) => {
          const current = countsByBusiness.get(b.id) ?? { products: 0, services: 0 };
          return { name: b.name, products: current.products, services: current.services };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
      businessesByCategory: businessesByCategory
        .map((row) => ({ name: row.name ?? 'Sin categoría', count: row.count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      productsByCategory: productsByCategory
        .map((row) => ({ name: row.name ?? 'Sin categoría', count: row.count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  });
}