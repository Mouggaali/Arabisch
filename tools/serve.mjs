// Kleine statische server voor de browsertests (Playwright).  Gebruik:  node tools/serve.mjs [poort]
// Serveert dist/ (de gepubliceerde versie, met service worker) en daarnaast tools/selftest.js,
// dat niet in dist/ zit maar door de tests in de pagina geladen wordt.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const base = path.startsWith('/tools/selftest.js') ? root : dist;
    const file = normalize(join(base, path));
    if (!file.startsWith(base)) throw new Error('buiten de map');
    if (!(await stat(file)).isFile()) throw new Error('geen bestand');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Niet gevonden');
  }
}).listen(port, '127.0.0.1', () => console.log(`Darb (dist/) op http://127.0.0.1:${port}`));
