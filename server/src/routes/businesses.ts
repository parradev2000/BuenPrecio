import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { count, eq, inArray } from 'drizzle-orm';
import {
  createBusinessSchema,
  createItemSchema,
  updateBusinessSchema,
  updateItemSchema,
} from '@buenprecio/shared';
import { db } from '../db.js';
import { sendError } from '../lib/errors.js';
import { requireRole } from '../middleware/auth.js';
import { businessItems, businessPhones, businesses, categories, productCategories, type Business } from '../schema.js';

function pickDefined(obj: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries(keys.filter((key) => obj[key] !== undefined).map((key) => [key, obj[key]]));
}

async function ownedBusiness(
  request: FastifyRequest,
  reply: FastifyReply,
  businessId: string,
): Promise<Business | null> {
  const user = request.currentUser!;
  const business = await db.query.businesses.findFirst({ where: eq(businesses.id, businessId) });
  if (!business) {
    sendError(reply, 404, 'Negocio no encontrado');
    return null;
  }
  if (user.role !== 'administrador' && business.ownerId !== user.id) {
    sendError(reply, 403, 'No tienes permisos sobre este negocio');
    return null;
  }
  return business;
}

async function businessCategoryExists(categoryId: string | undefined) {
  if (!categoryId) return true;
  const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
  return category?.kind === 'negocio';
}

async function resolveProductCategory(
  categoryId: string | null | undefined,
  newCategoryName: string | null | undefined,
) {
  if (categoryId) {
    return (
      (await db.query.productCategories.findFirst({ where: eq(productCategories.id, categoryId) })) ?? null
    );
  }
  if (newCategoryName) {
    const name = newCategoryName.trim();
    const existing = await db.query.productCategories.findFirst({ where: eq(productCategories.name, name) });
    if (existing) {
      return existing;
    }
    const [created] = await db.insert(productCategories).values({ name }).returning();
    return created ?? null;
  }
  return null;
}

async function businessContact(businessId: string): Promise<string[]> {
  const rows = await db.query.businessPhones.findMany({
    where: eq(businessPhones.businessId, businessId),
    orderBy: (phones, { asc }) => [asc(phones.position)],
  });
  return rows.map((row) => row.phone);
}

export async function businessRoutes(app: FastifyInstance) {
  const producerOrAdmin = { preHandler: requireRole('productor', 'administrador') };

  app.post('/businesses', producerOrAdmin, async (request, reply) => {
    const parsed = createBusinessSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    if (!(await businessCategoryExists(parsed.data.categoryId))) {
      return sendError(reply, 400, 'Tipo de negocio inválido');
    }
    const phones = (parsed.data.phones ?? []).filter((phone) => phone.trim() !== '');
    const values = pickDefined(parsed.data, ['description', 'categoryId', 'address', 'latitude', 'longitude', 'photoUrl']);
    if (parsed.data.email != null && parsed.data.email.trim() !== '') {
      values.email = parsed.data.email.trim();
    }
    const primaryPhone = phones[0] ?? (parsed.data.phone?.trim() ? parsed.data.phone.trim() : null);
    const [business] = await db
      .insert(businesses)
      .values({ name: parsed.data.name, ownerId: request.currentUser!.id, phone: primaryPhone, ...values })
      .returning();
    if (phones.length > 0) {
      await db.insert(businessPhones).values(
        phones.map((phone, index) => ({ businessId: business.id, phone, position: index })),
      );
    }
    return reply.code(201).send({ business });
  });

  app.get('/my/businesses', producerOrAdmin, async (request) => {
    const user = request.currentUser!;
    const where = user.role === 'administrador' ? undefined : eq(businesses.ownerId, user.id);
    const rows = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        description: businesses.description,
        address: businesses.address,
        phone: businesses.phone,
        email: businesses.email,
        photoUrl: businesses.photoUrl,
        categoryId: businesses.categoryId,
        categoryName: categories.name,
        latitude: businesses.latitude,
        longitude: businesses.longitude,
        active: businesses.active,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
      })
      .from(businesses)
      .leftJoin(categories, eq(businesses.categoryId, categories.id))
      .where(where)
      .orderBy(businesses.name);

    const ids = rows.map((row) => row.id);
    const counts = ids.length
      ? await db
          .select({ businessId: businessItems.businessId, value: count() })
          .from(businessItems)
          .where(inArray(businessItems.businessId, ids))
          .groupBy(businessItems.businessId)
      : [];
    const phoneRows = ids.length
      ? await db
          .select({ businessId: businessPhones.businessId, phone: businessPhones.phone, position: businessPhones.position })
          .from(businessPhones)
          .where(inArray(businessPhones.businessId, ids))
      : [];
    const phonesByBusiness = new Map<string, string[]>();
    for (const row of phoneRows) {
      const list = phonesByBusiness.get(row.businessId) ?? [];
      list[row.position] = row.phone;
      phonesByBusiness.set(row.businessId, list);
    }
    const countMap = new Map(counts.map((c) => [c.businessId, c.value]));
    const items = rows.map((row) => ({
      ...row,
      itemsCount: countMap.get(row.id) ?? 0,
      phones: phonesByBusiness.get(row.id)?.filter(Boolean) ?? [],
    }));
    return { items, total: items.length };
  });

  app.get('/businesses/:id', producerOrAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    const business = await ownedBusiness(request, reply, id);
    if (!business) return;
    const itemRows = await db.query.businessItems.findMany({
      where: eq(businessItems.businessId, id),
      orderBy: (items, { asc }) => [asc(items.name)],
    });
    const phones = await businessContact(id);
    if (phones.length === 0 && business.phone) {
      phones.push(business.phone);
    }
    return { business: { ...business, phones, items: itemRows } };
  });

  app.patch('/businesses/:id', producerOrAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    const business = await ownedBusiness(request, reply, id);
    if (!business) return;
    const parsed = updateBusinessSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    if (!(await businessCategoryExists(parsed.data.categoryId))) {
      return sendError(reply, 400, 'Tipo de negocio inválido');
    }
    if (Object.keys(parsed.data).length === 0) {
      return sendError(reply, 400, 'No hay campos para actualizar');
    }
    const values: Record<string, unknown> = pickDefined(parsed.data, ['name', 'description', 'categoryId', 'address', 'latitude', 'longitude', 'photoUrl', 'active', 'phone']);
    let phones: string[] | undefined;
    if (parsed.data.phones !== undefined) {
      phones = parsed.data.phones.filter((phone) => phone.trim() !== '');
      values.phone = phones[0] ?? null;
    }
    if (parsed.data.email !== undefined) {
      values.email = parsed.data.email?.trim() || null;
    }
    const [updated] = await db
      .update(businesses)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(businesses.id, business.id))
      .returning();
    if (phones !== undefined) {
      await db.delete(businessPhones).where(eq(businessPhones.businessId, business.id));
      if (phones.length > 0) {
        await db.insert(businessPhones).values(
          phones.map((phone, index) => ({ businessId: business.id, phone, position: index })),
        );
      }
    }
    return { business: updated };
  });

  app.delete('/businesses/:id', producerOrAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    const business = await ownedBusiness(request, reply, id);
    if (!business) return;
    const [updated] = await db
      .update(businesses)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(businesses.id, business.id))
      .returning();
    return { business: updated };
  });

  app.post('/businesses/:businessId/items', producerOrAdmin, async (request, reply) => {
    const { businessId } = request.params as { businessId: string };
    const business = await ownedBusiness(request, reply, businessId);
    if (!business) return;
    const parsed = createItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const resolvedCategory = await resolveProductCategory(parsed.data.categoryId, parsed.data.newCategoryName);
    if (!resolvedCategory) {
      return sendError(reply, 400, 'Categoría inválida');
    }
    const values = pickDefined(parsed.data, ['description', 'unit', 'photoUrl', 'available']);
    const [item] = await db
      .insert(businessItems)
      .values({
        businessId,
        type: parsed.data.type,
        name: parsed.data.name,
        price: parsed.data.price,
        categoryId: resolvedCategory.id,
        ...values,
      })
      .returning();
    return reply.code(201).send({ item });
  });

  app.get('/businesses/:businessId/items', producerOrAdmin, async (request, reply) => {
    const { businessId } = request.params as { businessId: string };
    const business = await ownedBusiness(request, reply, businessId);
    if (!business) return;
    const items = await db.query.businessItems.findMany({
      where: eq(businessItems.businessId, businessId),
      orderBy: (items, { asc }) => [asc(items.name)],
    });
    return { items, total: items.length };
  });

  app.patch('/items/:id', producerOrAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await db.query.businessItems.findFirst({ where: eq(businessItems.id, id) });
    if (!item) {
      return sendError(reply, 404, 'Producto no encontrado');
    }
    const business = await ownedBusiness(request, reply, item.businessId);
    if (!business) return;
    const parsed = updateItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    let categoryId = item.categoryId;
    if (parsed.data.newCategoryName) {
      const resolved = await resolveProductCategory(undefined, parsed.data.newCategoryName);
      if (!resolved) {
        return sendError(reply, 400, 'Categoría inválida');
      }
      categoryId = resolved.id;
    } else if (parsed.data.categoryId !== undefined) {
      if (parsed.data.categoryId === null) {
        categoryId = null;
      } else {
        const resolved = await resolveProductCategory(parsed.data.categoryId, undefined);
        if (!resolved) {
          return sendError(reply, 400, 'Categoría inválida');
        }
        categoryId = resolved.id;
      }
    }
    if (Object.keys(parsed.data).length === 0 && categoryId === item.categoryId) {
      return sendError(reply, 400, 'No hay campos para actualizar');
    }
    const values = pickDefined(parsed.data, ['type', 'name', 'description', 'price', 'unit', 'photoUrl', 'available']);
    const [updated] = await db
      .update(businessItems)
      .set({ ...values, categoryId, updatedAt: new Date() })
      .where(eq(businessItems.id, item.id))
      .returning();
    return { item: updated };
  });

  app.delete('/items/:id', producerOrAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await db.query.businessItems.findFirst({ where: eq(businessItems.id, id) });
    if (!item) {
      return sendError(reply, 404, 'Producto no encontrado');
    }
    const business = await ownedBusiness(request, reply, item.businessId);
    if (!business) return;
    await db.delete(businessItems).where(eq(businessItems.id, item.id));
    return reply.code(204).send();
  });
}