import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { toSafeApplication } from '../lib/application.js';
import { sendError } from '../lib/errors.js';
import { requireRole } from '../middleware/auth.js';
import { producerApplications } from '../schema.js';

export async function producerRoutes(app: FastifyInstance) {
  app.post(
    '/me/producer-application',
    { preHandler: requireRole('consumidor') },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const existing = await db.query.producerApplications.findFirst({
        where: eq(producerApplications.userId, userId),
      });
      if (existing?.status === 'pending') {
        return sendError(reply, 409, 'Ya tienes una solicitud en revisión');
      }
      if (existing?.status === 'approved') {
        return sendError(reply, 409, 'Ya eres productor');
      }
      const [application] = existing
        ? await db
            .update(producerApplications)
            .set({ status: 'pending', reviewedBy: null, reviewedAt: null })
            .where(eq(producerApplications.id, existing.id))
            .returning({ id: producerApplications.id, status: producerApplications.status, createdAt: producerApplications.createdAt })
        : await db
            .insert(producerApplications)
            .values({ userId })
            .returning({ id: producerApplications.id, status: producerApplications.status, createdAt: producerApplications.createdAt });
      return reply.code(existing ? 200 : 201).send({ application });
    },
  );

  app.get(
    '/me/producer-application',
    { preHandler: requireRole('consumidor') },
    async (request) => {
      const application = await db.query.producerApplications.findFirst({
        where: eq(producerApplications.userId, request.currentUser!.id),
      });
      if (!application) {
        return { application: null, available: true };
      }
      return { application: toSafeApplication(application), available: application.status !== 'pending' };
    },
  );
}