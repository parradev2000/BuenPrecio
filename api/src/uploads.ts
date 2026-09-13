import { resolve } from 'node:path';
import { env } from './env.js';

export const UPLOADS_DIR = resolve(process.cwd(), env.UPLOADS_DIR ?? 'uploads');