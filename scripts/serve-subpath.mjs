// Simula o GitHub Pages: serve dist/ sob uma subpasta (ex.: /fac-calc/),
// sem fallback de SPA — exatamente como o Pages se comporta.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PREFIX = process.env.PREFIX ?? '/fac-calc';
const PORT = Number(process.env.PORT ?? 4174);
const ROOT = join(process.cwd(), 'dist');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith(PREFIX)) {
    res.writeHead(404).end('404 - fora do escopo do Pages');
    return;
  }
  let rel = url.pathname.slice(PREFIX.length) || '/';
  if (rel === '/' || rel === '') rel = '/index.html';
  try {
    const body = await readFile(join(ROOT, rel));
    res.writeHead(200, { 'Content-Type': TYPES[extname(rel)] ?? 'application/octet-stream' }).end(body);
  } catch {
    // Pages devolve 404 real — sem fallback para index.html
    res.writeHead(404).end('404');
  }
}).listen(PORT, () => console.log(`Servindo dist/ em http://localhost:${PORT}${PREFIX}/`));
