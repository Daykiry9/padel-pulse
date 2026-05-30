// Componer foreground + background como Android los renderiza (círculo) para
// confirmar visualmente que el adaptive icon quedó bien.
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const RES = resolve(here, '..', 'android', 'app', 'src', 'main', 'res', 'mipmap-xxxhdpi');
const OUT = resolve(here, '..', 'assets', 'preview-adaptive-icon.png');

const SIZE = 432; // tamaño típico de adaptive icon canvas en xxxhdpi
const MASK_RADIUS = Math.round(SIZE / 2);

const bg = await sharp(resolve(RES, 'ic_launcher_background.png')).resize(SIZE, SIZE).toBuffer();
const fg = await sharp(resolve(RES, 'ic_launcher_foreground.png')).resize(SIZE, SIZE).toBuffer();

// Composite fg sobre bg, después aplicar máscara circular.
const composed = await sharp(bg).composite([{ input: fg }]).toBuffer();

const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${MASK_RADIUS}" fill="white"/>
  </svg>`,
);

await sharp(composed)
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toFile(OUT);

console.log('✓ preview-adaptive-icon.png');
