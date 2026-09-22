import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { UPLOADS_DIR } from '../src/uploads.js';
import { truncateAll } from './helpers.js';

const BASE = '/api/v1';
const BOUNDARY = '----bp-upload-test';

function multipartBody(filename: string, contentType: string, data: Buffer | string): Buffer {
  const head = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  return Buffer.concat([head, typeof data === 'string' ? Buffer.from(data) : data, tail]);
}

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterEach(async () => {
  await truncateAll(app);
});

describe('subida de fotos', () => {
  it('requiere sesión', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/uploads`,
      headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
      payload: multipartBody('a.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47])),
    });
    expect(res.statusCode).toBe(401);
  });

  it('sube una imagen y la sirve', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/register`,
      payload: { name: 'Luis', email: 'luis@ejemplo.com', password: 'secreta123' },
    });
    const token = reg.json().accessToken as string;

    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/uploads`,
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
      payload: multipartBody('pan.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])),
    });
    expect(res.statusCode).toBe(201);
    const { name, url } = res.json() as { name: string; url: string };
    expect(name).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(url).toContain(`/uploads/${name}`);

    const get = await app.inject({ method: 'GET', url: `/uploads/${name}` });
    expect(get.statusCode).toBe(200);
    expect(get.headers['content-type']).toContain('image/png');

    await rm(join(UPLOADS_DIR, name));
  });

  it('rechaza archivos que no son imágenes', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: `${BASE}/auth/register`,
      payload: { name: 'Luis', email: 'luis@ejemplo.com', password: 'secreta123' },
    });
    const token = reg.json().accessToken as string;

    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/uploads`,
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
      payload: multipartBody('nota.txt', 'text/plain', 'hola'),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe('Solo se permiten imágenes (JPEG, PNG, WebP o GIF)');
  });
});