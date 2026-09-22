import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../server/src/app.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!app) {
    app = await buildApp();
  }
  app.server.emit('request', req, res);
}