import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

// Feature graphic para Play Store: 1024x500 PNG. Identidad PadelKing:
// fondo negro (#0a0a0a), isotipo dorado a la izquierda, wordmark + tagline.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '..', 'assets');

const W = 1024;
const H = 500;
const BG = { r: 10, g: 10, b: 10, alpha: 1 };
const GOLD = '#ffc53d';
const OFFWHITE = '#f1efea';
const MUTED = '#a8a6a0';

async function main() {
  const ISO = 300;
  const iso = await sharp(path.join(assetsDir, 'icon-only.png'))
    .resize(ISO, ISO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const textX = 430;
  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <!-- línea de acento sutil abajo -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="${GOLD}"/>
  <text x="${textX}" y="228" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="86" letter-spacing="-1">
    <tspan fill="${OFFWHITE}">PADEL</tspan><tspan fill="${GOLD}">KING</tspan>
  </text>
  <text x="${textX + 3}" y="286" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="30" fill="${MUTED}" letter-spacing="1">
    La liga amateur del pádel colombiano
  </text>
  <text x="${textX + 3}" y="330" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="22" fill="${GOLD}" letter-spacing="3">
    TORNEOS · RANKING · COMUNIDADES
  </text>
</svg>`;

  await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite([
      { input: iso, left: 95, top: Math.round((H - ISO) / 2) },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(assetsDir, 'feature-graphic.png'));

  console.log(`feature-graphic.png (1024x500) escrito en ${assetsDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
