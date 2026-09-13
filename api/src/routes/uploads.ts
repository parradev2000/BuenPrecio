import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { sendError } from '../lib/errors.js';
import { UPLOADS_DIR } from '../uploads.js';

const pump = promisify(pipeline);

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/uploads', { preHandler: authenticate }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return sendError(reply, 400, 'Se requiere un archivo');
    }
    const ext = MIME_EXT[data.mimetype];
    if (!ext) {
      return sendError(reply, 400, 'Solo se permiten imágenes (JPEG, PNG, WebP o GIF)');
    }
    await mkdir(UPLOADS_DIR, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    const filePath = join(UPLOADS_DIR, name);
    await pump(data.file, createWriteStream(filePath));
    const url = `/uploads/${name}`;
    return reply.code(201).send({ url, name });
  });
}