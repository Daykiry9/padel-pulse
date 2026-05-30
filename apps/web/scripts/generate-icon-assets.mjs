// Genera los assets fuente para capacitor-assets:
//   - assets/icon.png             (1024x1024, logo sobre fondo negro — fallback)
//   - assets/icon-foreground.png  (1024x1024, logo centrado en safe zone, bg transparente)
//   - assets/icon-background.png  (1024x1024, negro sólido #0a0a0a)
//
// Después correr: pnpm -F web exec capacitor-assets generate --android
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(here, '..', 'assets');

const GOLD = '#ffc53d';
const INK = '#0a0a0a';

// SVG del KingLogo (king-logo.tsx) escalado a 1024 — el viewBox sigue siendo 32x32.
const logoSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <path d="M 16 3 C 22 3 26 7 26 13 C 26 18 22 22 18 22 L 14 22 C 10 22 6 18 6 13 C 6 7 10 3 16 3 Z" fill="${GOLD}"/>
  <path d="M 10 16 L 10 14 L 11 11 L 12 13 L 13.5 10 L 15 13 L 16 9 L 17 13 L 18.5 10 L 20 13 L 21 11 L 22 14 L 22 16 Z" fill="${INK}"/>
  <path d="M 12 22 L 11 26 Q 11 29 14 29 L 18 29 Q 21 29 21 26 L 20 22 Z" fill="${GOLD}"/>
  <g stroke="${INK}" stroke-width="0.4" stroke-linecap="round">
    <line x1="12.5" y1="25" x2="19.5" y2="25"/>
    <line x1="12.3" y1="27" x2="19.7" y2="27"/>
  </g>
</svg>
`;

const CANVAS = 1024;
// Adaptive icon safe-zone = 66% central. Renderizamos el logo a 640px (≈62.5%)
// para dejar margen y que no se recorte por el mask (squircle/círculo).
const LOGO_FG_SIZE = 640;

// 1) icon-background.png — negro sólido
await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: INK },
})
  .png()
  .toFile(resolve(ASSETS, 'icon-background.png'));
console.log('✓ icon-background.png');

// 2) icon-foreground.png — logo centrado, fondo transparente
const fgLogo = await sharp(Buffer.from(logoSvg(LOGO_FG_SIZE)))
  .resize(LOGO_FG_SIZE, LOGO_FG_SIZE)
  .png()
  .toBuffer();

await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: fgLogo,
      left: Math.round((CANVAS - LOGO_FG_SIZE) / 2),
      top: Math.round((CANVAS - LOGO_FG_SIZE) / 2),
    },
  ])
  .png()
  .toFile(resolve(ASSETS, 'icon-foreground.png'));
console.log('✓ icon-foreground.png');

// 3) icon.png — logo sobre fondo negro (Play Store / fallback no-adaptive)
const ICON_LOGO_SIZE = 720; // ocupa más porque ya no hay safe-zone aquí
const iconLogo = await sharp(Buffer.from(logoSvg(ICON_LOGO_SIZE)))
  .resize(ICON_LOGO_SIZE, ICON_LOGO_SIZE)
  .png()
  .toBuffer();

await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: INK },
})
  .composite([
    {
      input: iconLogo,
      left: Math.round((CANVAS - ICON_LOGO_SIZE) / 2),
      top: Math.round((CANVAS - ICON_LOGO_SIZE) / 2),
    },
  ])
  .png()
  .toFile(resolve(ASSETS, 'icon.png'));
console.log('✓ icon.png');

// Reemplazo también icon-only.png con la versión nueva (mismo contenido que icon.png).
await sharp(resolve(ASSETS, 'icon.png')).toFile(resolve(ASSETS, 'icon-only.png'));
console.log('✓ icon-only.png (sobrescrito)');
