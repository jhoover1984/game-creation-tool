import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT ?? 4173);
const root = resolve(process.cwd(), 'packages');

const mimeByExt = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function toLocalPath(urlPath) {
  const clean = urlPath.split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(clean);
  const withDefault = decoded === '/' ? '/ui-editor/src/app.html' : decoded;
  const candidate = normalize(join(root, withDefault));
  if (!candidate.startsWith(root)) return null;
  return candidate;
}

const server = createServer((req, res) => {
  const filePath = toLocalPath(req.url ?? '/');
  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Directory listing disabled');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = mimeByExt[ext] ?? 'application/octet-stream';
  const body = readFileSync(filePath);
  res.writeHead(200, { 'content-type': contentType });
  res.end(body);
});

server.listen(port, () => {
  console.log(`GCS editor dev server running at http://localhost:${port}/ui-editor/src/app.html`);
  console.log(`Serving root: ${root}`);
});
