// Genera el sistema de marca PadelKing (isotipo / logotipo / imagotipo / isologo)
// reusando la pala con corona en negativo del concepto #04.
// Uso: GEMINI_API_KEY=... node scripts/generate-brand-system.mjs
import { writeFile, mkdir } from 'node:fs/promises';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const MODEL = 'gemini-2.5-flash-image';

const ATOM = `
THE BRAND ATOM (the same in every variant):
A PADEL paddle silhouette in solid champagne gold (#c9a85c) on pure black (#0a0a0a) background.

Padel paddle anatomy — MANDATORY, do not deviate:
- The HEAD is a rounded teardrop / oval, slightly wider at the top, smooth contour, NO holes drilled (clean silhouette).
- The HEAD takes ~65% of total paddle height.
- The HANDLE is THICK and SHORT (max 1/3 of total height), straight grip, with subtle grip wrap lines.
- The handle connects to the head through a brief V-shaped THROAT (no stem).
- NOT a tennis racket (no long thin handle, no stringed face).
- NOT a ping-pong paddle (no flat rectangular handle).
- NOT a beach paddle. Strict padel proportions.

Inside the gold paddle head face, cut out as NEGATIVE SPACE (revealing the black background through the gold):
A flat geometric 5-point CROWN. The crown has:
- A flat horizontal base across the bottom.
- 5 triangular peaks rising up (central peak slightly taller).
- NO ball ornaments on top of peaks. NO crosses. NO jewels. Pure geometric silhouette.
- The crown occupies ~55% of the paddle head face, well-centered horizontally and slightly above vertical center.

Style: flat vector, no gradients, no drop shadows, no 3D, no texture, no outline strokes. Solid champagne gold + pure black only.
`;

const BASE_CONSTRAINTS = `
Brand asset for "PadelKing" — an amateur padel league in Colombia.
Visual references: ATP World Tour, Champions League, Premier Padel.
Output: high-resolution square PNG. Centered composition. Generous padding around the artwork. No tagline. No subtitle. No country name. No year. ONLY the elements requested below.
${ATOM}
`;

const VARIANTS = [
  {
    name: '01-isotipo',
    prompt: `${BASE_CONSTRAINTS}

VARIANT — ISOTIPO (icon only).
Render ONLY the brand atom described above. NO TEXT AT ALL anywhere in the image — no "PADELKING", no letters, no numbers. Single centered icon. Square canvas. Generous black padding around the icon.`,
  },
  {
    name: '02-logotipo',
    prompt: `${BASE_CONSTRAINTS}

VARIANT — LOGOTIPO (wordmark only, no separate icon).
Render the text "PADELKING" as ONE single word, no space. Set in a tight uppercase grotesque sans-serif (GT America Condensed or Söhne Breit feel). Letter-spacing very tight, slightly negative.
- "PADEL" in pure white (#f4f4f5).
- "KING" in champagne gold (#c9a85c).
The "I" letter in "KING" is REPLACED by a small vertical version of THE BRAND ATOM (padel paddle with negative-space crown) — same proportions as described, scaled to fit the cap-height of the letters.
The brand atom paddle is the only icon — there is no separate logo next to the word. Centered on black background. Generous padding.`,
  },
  {
    name: '03-imagotipo',
    prompt: `${BASE_CONSTRAINTS}

VARIANT — IMAGOTIPO (icon + wordmark separated, horizontal lockup).
Layout: horizontal composition.
- LEFT: the brand atom (padel paddle with negative-space crown), about the same height as the text cap-height x 1.6.
- A clear vertical gap separates icon and text (about half the icon's width).
- RIGHT: the text "PADELKING" set in tight uppercase grotesque sans-serif. "PADEL" white (#f4f4f5), "KING" champagne gold (#c9a85c). Letter-spacing tight.
Icon and text are vertically center-aligned. Black background. Generous padding around the full lockup. The icon and text are SEPARATE (visible gap between them).`,
  },
  {
    name: '04-isologo',
    prompt: `${BASE_CONSTRAINTS}

VARIANT — ISOLOGO (icon and text INTEGRATED into one inseparable mark).
Composition: a circular emblem / stamp / seal.
- A large brand atom (padel paddle with negative-space crown) is CENTERED.
- The text "PADELKING" runs CURVED along an invisible circle ABOVE the paddle head — uppercase, tight tracking, champagne gold (#c9a85c).
- Below the paddle, also along the invisible circle, the text "EST. 2026" or just two small champagne stars / dots, very subtle.
- A thin champagne gold circular outline rings the whole emblem (very subtle, hairline).
Looks like a Champions League / FIFA / official-sport seal. Premium broadcast quality.
Black background. Generous padding around the seal.`,
  },
];

const outDir = 'apps/web/public/logo-experiments/brand-system';
await mkdir(outDir, { recursive: true });

async function generate(variant) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: variant.prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data?.error?.message ?? JSON.stringify(data)}`);
  }
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData ?? p.inline_data);
  const inline = imgPart?.inlineData ?? imgPart?.inline_data;
  if (!inline?.data) {
    throw new Error(`No image: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return Buffer.from(inline.data, 'base64');
}

for (const v of VARIANTS) {
  try {
    console.log(`Generating ${v.name}...`);
    const buf = await generate(v);
    const path = `${outDir}/${v.name}.png`;
    await writeFile(path, buf);
    console.log(`  ✓ ${path} (${buf.length} bytes)`);
  } catch (e) {
    console.error(`  × ${v.name}: ${e.message}`);
  }
}

console.log('\nDone. See apps/web/public/logo-experiments/brand-system/');
