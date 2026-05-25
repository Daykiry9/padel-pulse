import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourceIcon = path.join(root, 'assets', 'icon-only.png');
const publicDir = path.join(root, 'public');
const iconsDir = path.join(publicDir, 'icons');

const BG = { r: 10, g: 10, b: 10, alpha: 1 };

const SIZES = [48, 72, 96, 128, 192, 256, 384, 512];

async function main() {
  await fs.mkdir(iconsDir, { recursive: true });

  for (const size of SIZES) {
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'contain', background: BG })
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
  }

  const maskableSize = 512;
  const innerSize = Math.round(maskableSize * 0.7);
  await sharp({
    create: { width: maskableSize, height: maskableSize, channels: 4, background: BG },
  })
    .composite([
      {
        input: await sharp(sourceIcon)
          .resize(innerSize, innerSize, { fit: 'contain', background: BG })
          .toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));

  await sharp(sourceIcon)
    .resize(180, 180, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(sourceIcon)
    .resize(32, 32, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(publicDir, 'favicon-32.png'));

  await sharp(sourceIcon)
    .resize(16, 16, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(publicDir, 'favicon-16.png'));

  console.log(`Generated PWA icons in ${iconsDir} + apple-touch + favicons in ${publicDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
