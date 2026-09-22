import { resolve } from 'node:path';
import { env } from './env.js';

export const UPLOADS_DIR = resolve(process.cwd(), env.UPLOADS_DIR ?? 'uploads');
export const BLOB_TOKEN = env.BLOB_READ_WRITE_TOKEN;
export const USE_BLOB = Boolean(BLOB_TOKEN || env.BLOB_STORE_ID);