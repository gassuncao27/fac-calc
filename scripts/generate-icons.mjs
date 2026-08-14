// Gera os ícones PWA (PNG) sem dependências externas.
// Desenha um "F" minimalista sobre fundo escuro, com cantos arredondados.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro "None"
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [0x0f, 0x17, 0x2a]; // slate-900
const FG = [0x34, 0xd3, 0x99]; // emerald-400

function insideRoundedRect(x, y, size, radius) {
  const r = radius;
  const cx = x < r ? r : x > size - r ? size - r : x;
  const cy = y < r ? r : y > size - r ? size - r : y;
  if ((x < r || x > size - r) && (y < r || y > size - r)) {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }
  return true;
}

function drawIcon(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  // Zona segura menor no ícone maskable
  const g = maskable ? 0.78 : 1;
  const rects = [
    // haste vertical do "F"
    [0.32, 0.26, 0.44, 0.74],
    // barra superior
    [0.32, 0.26, 0.72, 0.375],
    // barra do meio
    [0.32, 0.505, 0.64, 0.615],
  ].map(([x1, y1, x2, y2]) => [
    (x1 - 0.5) * g + 0.5,
    (y1 - 0.5) * g + 0.5,
    (x2 - 0.5) * g + 0.5,
    (y2 - 0.5) * g + 0.5,
  ]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inside = maskable || insideRoundedRect(x + 0.5, y + 0.5, size, radius);
      if (!inside) continue; // transparente
      const fx = (x + 0.5) / size;
      const fy = (y + 0.5) / size;
      const isGlyph = rects.some(([x1, y1, x2, y2]) => fx >= x1 && fx <= x2 && fy >= y1 && fy <= y2);
      const [r, g2, b] = isGlyph ? FG : BG;
      rgba[i] = r;
      rgba[i + 1] = g2;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, rgba);
}

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192, { maskable: false }));
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512, { maskable: false }));
writeFileSync(join(outDir, 'icon-maskable-512.png'), drawIcon(512, { maskable: true }));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0F172A"/>
  <rect x="32" y="26" width="12" height="48" fill="#34D399"/>
  <rect x="32" y="26" width="40" height="11.5" fill="#34D399"/>
  <rect x="32" y="50.5" width="32" height="11" fill="#34D399"/>
</svg>
`;
writeFileSync(join(outDir, 'icon.svg'), svg);

console.log('Ícones gerados em public/.');
