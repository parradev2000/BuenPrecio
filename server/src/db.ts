import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env.js';
import * as schema from './schema.js';

const client = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });

export type Db = typeof db;

export async function checkDbConnection(): Promise<void> {
  await db.execute(sql`select 1`);
}

export async function closeDb(): Promise<void> {
  await client.end();
}