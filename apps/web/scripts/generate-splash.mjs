import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '..', 'assets');

const CANVAS = 2732;
const ICON_TARGET = Math.round(CANVAS * 0.3);
const BG = { r: 10, g: 10, b: 10, alpha: 1 };

async function main() {
  const iconBuffer = await sharp(path.join(assetsDir, 'icon-only.png'))
    .resize(ICON_TARGET, ICON_TARGET, { fit: 'contain', background: BG })
    .toBuffer();

  await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: BG },
  })
    .composite([{ input: iconBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  await sharp(path.join(assetsDir, 'splash.png')).toFile(
    path.join(assetsDir, 'splash-dark.png'),
  );

  console.log(`splash.png + splash-dark.png written to ${assetsDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
