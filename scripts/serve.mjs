// SPDX-License-Identifier: MIT
// Minimal static server: `npm start`, then open http://127.0.0.1:8140/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain' };

export async function serveStatic(req, res) {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root) || file.includes('node_modules')) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}

export const port = Number(process.env.PORT) || 8140;

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  createServer(serveStatic).listen(port, '127.0.0.1', () => console.log(`Ranger Music Creator on http://127.0.0.1:${port}/`));
}
