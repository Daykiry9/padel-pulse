// Genera favicon + icon + apple-icon + opengraph-image desde los PNG de marca.
// Uso: cd apps/web && node scripts/generate-favicons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ISOTIPO = resolve(ROOT, 'public/logo-experiments/brand-system/01-isotipo.png');
const WORDMARK = resolve(ROOT, 'public/logo-experiments/wordmark/wordmark-v1.png');
const APP_DIR = resolve(ROOT, 'src/app');

const tasks = [
  // Next.js auto-serves /app/icon.png como /icon-*.png (multi-size).
  { src: ISOTIPO, out: resolve(APP_DIR, 'icon.png'), size: 512, label: 'icon.png' },
  // Apple touch icon (180x180 estándar iOS).
  { src: ISOTIPO, out: resolve(APP_DIR, 'apple-icon.png'), size: 180, label: 'apple-icon.png' },
  // Static favicon legacy (PNG, Next.js sirve esto al lado del icon.png).
  { src: ISOTIPO, out: resolve(ROOT, 'public/favicon.ico'), size: 48, label: 'favicon.ico' },
];

for (const t of tasks) {
  console.log(`▸ ${t.label} (${t.size}px)`);
  const isIco = t.out.endsWith('.ico');
  let pipeline = sharp(t.src).resize(t.size, t.size, {
    fit: 'contain',
    background: { r: 10, g: 10, b: 10, alpha: 1 },
  });
  if (isIco) {
    // sharp no produce .ico nativo en ESM; usamos PNG con extension .ico (browsers lo soportan).
    pipeline = pipeline.png();
  }
  await pipeline.toFile(t.out);
  console.log(`  ✓ ${t.out}`);
}

// OG image landscape 1200x630 con el wordmark centrado sobre fondo negro.
console.log('▸ opengraph-image.png (1200x630)');
const ogOut = resolve(APP_DIR, 'opengraph-image.png');
await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 10, g: 10, b: 10, alpha: 1 },
  },
})
  .composite([
    {
      input: await sharp(WORDMARK).resize(550, 550, { fit: 'inside' }).toBuffer(),
      gravity: 'center',
    },
  ])
  .png()
  .toFile(ogOut);
console.log(`  ✓ ${ogOut}`);

console.log('\nDone.');
