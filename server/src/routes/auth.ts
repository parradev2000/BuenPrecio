import type { FastifyInstance } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import {
  changePasswordSchema,
  googleAuthSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from '@buenprecio/shared';
import { db } from '../db.js';
import { env } from '../env.js';
import { sendError } from '../lib/errors.js';
import { verifyGoogleIdToken } from '../lib/google.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { toSafeUser } from '../lib/user.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  generateRefreshToken,
  hashToken,
  refreshExpiryInMs,
} from '../lib/tokens.js';
import { authenticate } from '../middleware/auth.js';
import { refreshTokens, users, type User } from '../schema.js';

async function issueAuthResponse(app: FastifyInstance, user: User) {
  const accessToken = app.jwt.sign({ sub: user.id }, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  const refreshToken = generateRefreshToken();
  await db
    .insert(refreshTokens)
    .values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(refreshExpiryInMs()),
    });
  return { accessToken, refreshToken, user: toSafeUser(user) };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const existing = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
    if (existing) {
      return sendError(reply, 409, 'Ya existe una cuenta con este correo');
    }
    const [user] = await db
      .insert(users)
      .values({
        name,
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        role: 'consumidor',
      })
      .returning();
    return reply.code(201).send(await issueAuthResponse(app, user));
  });

  app.post('/auth/google', async (request, reply) => {
    const parsed = googleAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    if (!env.GOOGLE_CLIENT_ID) {
      return sendError(reply, 501, 'Iniciar sesión con Google no está configurado');
    }
    const claims = await verifyGoogleIdToken(parsed.data.idToken, env.GOOGLE_CLIENT_ID);
    if (!claims) {
      return sendError(reply, 401, 'No se pudo verificar la cuenta de Google');
    }
    const email = claims.email.toLowerCase();
    let user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      [user] = await db
        .insert(users)
        .values({ name: claims.name ?? email, email, role: 'consumidor', passwordHash: null })
        .returning();
    }
    if (user.status !== 'active') {
      return sendError(reply, 403, 'Tu cuenta está suspendida');
    }
    return reply.send(await issueAuthResponse(app, user));
  });

  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const { email, password } = parsed.data;
    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return sendError(reply, 401, 'Correo o contraseña incorrectos');
    }
    if (user.status !== 'active') {
      return sendError(reply, 403, 'Tu cuenta está suspendida');
    }
    return reply.send(await issueAuthResponse(app, user));
  });

  app.post('/auth/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'Refresh token inválido');
    }
    const { refreshToken } = parsed.data;
    const tokenHash = hashToken(refreshToken);
    const token = await db.query.refreshTokens.findFirst({
      where: and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)),
      with: { user: true },
    });
    if (!token || token.expiresAt.getTime() < Date.now()) {
      return sendError(reply, 401, 'Sesión expirada, vuelve a entrar');
    }
    if (token.user.status !== 'active') {
      return sendError(reply, 403, 'Tu cuenta está suspendida');
    }
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, token.id));
    return reply.send(await issueAuthResponse(app, token.user));
  });

  app.post('/auth/logout', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (parsed.success) {
      const tokenHash = hashToken(parsed.data.refreshToken);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
    }
    return reply.code(204).send();
  });

  app.post('/auth/change-password', { preHandler: authenticate }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
    }
    const userId = request.currentUser!.id;
    const { currentPassword, newPassword } = parsed.data;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
      return sendError(reply, 401, 'Usuario no encontrado');
    }
    if (!user.passwordHash) {
      return sendError(reply, 400, 'Esta cuenta se creó con Google y no tiene contraseña');
    }
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return sendError(reply, 400, 'La contraseña actual no es correcta');
    }
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, userId));
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
    return reply.code(204).send();
  });

  app.get('/auth/me', { preHandler: authenticate }, async (request) => {
    return { user: toSafeUser(request.currentUser!) };
  });
}