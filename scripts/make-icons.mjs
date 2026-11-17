// Gera os ícones PNG do PWA (192, 512 e apple-touch-icon 180) sem dependências.
// Uso: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// Letra "T" em verde sobre fundo escuro. Fica dentro da área segura (maskable).
function render(size) {
  const bg = [9, 9, 11];
  const fg = [16, 185, 129];
  const rowLen = size * 4 + 1;
  const raw = Buffer.alloc(rowLen * size);
  const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x < x1 && y >= y0 && y < y1;

  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filtro "none"
    for (let x = 0; x < size; x++) {
      const onT =
        inRect(x, y, 0.25 * size, 0.25 * size, 0.75 * size, 0.37 * size) ||
        inRect(x, y, 0.42 * size, 0.25 * size, 0.58 * size, 0.75 * size);
      const c = onT ? fg : bg;
      const o = y * rowLen + 1 + x * 4;
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
      raw[o + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profundidade de bits
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'icon-192.png'), render(192));
writeFileSync(join(outDir, 'icon-512.png'), render(512));
writeFileSync(join(outDir, 'apple-touch-icon.png'), render(180));
console.log('Ícones gerados em', outDir);
