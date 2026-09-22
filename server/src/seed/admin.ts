import { eq } from 'drizzle-orm';
import { closeDb, db } from '../db.js';
import { env } from '../env.js';
import { hashPassword } from '../lib/password.js';
import { users, type NewUser } from '../schema.js';

async function main() {
  const email = (env.ADMIN_EMAIL ?? 'admin@buenprecio.app').toLowerCase();
  const password = env.ADMIN_PASSWORD ?? 'admin123';
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
  }
  const passwordHash = await hashPassword(password);
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (existing) {
    await db
      .update(users)
      .set({ role: 'administrador', status: 'active', passwordHash, name: env.ADMIN_NAME ?? existing.name })
      .where(eq(users.id, existing.id));
    // eslint-disable-next-line no-console
    console.log(`Admin actualizado: ${email}`);
    return;
  }

  const admin: NewUser = {
    name: env.ADMIN_NAME ?? 'Administrador',
    email,
    passwordHash,
    role: 'administrador',
    status: 'active',
  };
  await db.insert(users).values(admin);
  // eslint-disable-next-line no-console
  console.log(`Admin creado: ${email}`);
}

try {
  await main();
} finally {
  await closeDb();
}