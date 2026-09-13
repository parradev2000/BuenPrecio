import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { ADMIN_DATABASE_URL, TEST_DATABASE_URL } from './db-url.js';

export default async function globalSetup() {
  const admin = postgres(ADMIN_DATABASE_URL, { max: 1, onnotice: () => {} });
  await admin`create database buenprecio_test`.catch(() => {});
  await admin.end();

  const client = postgres(TEST_DATABASE_URL, { max: 1 });
  const migDb = drizzle(client);
  await migrate(migDb, { migrationsFolder: resolve(import.meta.dirname, '../drizzle') });
  await client.end();
}