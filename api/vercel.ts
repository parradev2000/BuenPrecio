import type { IncomingMessage, ServerResponse } from 'node:http';
import type { buildApp } from '../server/src/app.js';

type App = Awaited<ReturnType<typeof buildApp>>;

let appPromise: Promise<App> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = import('../server/src/app.js').then(async (m) => {
      const app = await m.buildApp();
      await app.ready();
      return app;
    });
  }
  const app = await appPromise;
  app.server.emit('request', req, res);
}