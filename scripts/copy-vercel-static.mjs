import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, '..', 'web', 'dist', 'index.html');
const destDir = join(root, '..', 'api', '_static');
const dest = join(destDir, 'index.html');

await mkdir(destDir, { recursive: true });
await copyFile(src, dest);
console.log('Copia de web/dist/index.html a api/_static/index.html lista');