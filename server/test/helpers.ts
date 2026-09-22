import postgres from 'postgres';
import type { FastifyInstance } from 'fastify';
import { TEST_DATABASE_URL } from './db-url.js';

export async function truncateAll(app: FastifyInstance) {
  const sql = postgres(TEST_DATABASE_URL, { max: 1 });
  await sql`
    truncate table
      price_reports,
      refresh_tokens,
      business_items,
      businesses,
      producer_applications,
      product_categories,
      categories,
      users
    cascade
  `;
  await sql.end();
  return app;
}