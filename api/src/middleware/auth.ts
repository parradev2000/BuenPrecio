import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import type { Role } from '@buenprecio/shared';
import { db } from '../db.js';
import { sendError } from '../lib/errors.js';
import { users } from '../schema.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<{ sub: string }>();
    const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
    if (!user) {
      return sendError(reply, 401, 'Usuario no encontrado');
    }
    if (user.status !== 'active') {
      return sendError(reply, 403, 'Tu cuenta está suspendida');
    }
    request.currentUser = user;
    return;
  } catch {
    return sendError(reply, 401, 'Sesión inválida o expirada');
  }
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;
    const user = request.currentUser;
    if (!user || !roles.includes(user.role)) {
      return sendError(reply, 403, 'No tienes permisos para esta acción');
    }
  };
}