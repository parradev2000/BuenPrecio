import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mkdir } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import Fastify from 'fastify';
import { CURRENCY, ROLE_NAMES } from '@buenprecio/shared';
import { checkDbConnection, db } from './db.js';
import { env } from './env.js';
import { UPLOADS_DIR } from './uploads.js';
import { catalogRoutes } from './routes/catalog.js';
import { authRoutes } from './routes/auth.js';
import { producerRoutes } from './routes/producer.js';
import { adminRoutes } from './routes/admin.js';
import { categoryRoutes } from './routes/categories.js';
import { businessRoutes } from './routes/businesses.js';
import { uploadRoutes } from './routes/uploads.js';

export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  await mkdir(UPLOADS_DIR, { recursive: true });
  await app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: '/uploads/' });

  app.get('/health', async () => {
    await checkDbConnection();
    return { status: 'ok' };
  });

  app.get('/meta', async () => {
    const [{ now }] = await db.execute(sql`select now() as now`);
    return { roles: ROLE_NAMES, currency: CURRENCY, dbTime: now };
  });

  app.get('/', async () => ({ service: 'BuenPrecio API', version: '0.0.1' }));

  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(catalogRoutes, { prefix: '/api/v1' });
  await app.register(producerRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1' });
  await app.register(categoryRoutes, { prefix: '/api/v1' });
  await app.register(businessRoutes, { prefix: '/api/v1' });
  await app.register(uploadRoutes, { prefix: '/api/v1' });

  return app;
}