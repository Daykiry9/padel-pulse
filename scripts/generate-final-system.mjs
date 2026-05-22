// Genera el sistema final (imagotipo + isologo) usando isotipo y wordmark aprobados como referencias.
// Copia tambien el isotipo y logotipo aprobados al folder final.
// Uso: GEMINI_API_KEY=... node scripts/generate-final-system.mjs
import { writeFile, mkdir, readFile, copyFile } from 'node:fs/promises';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const MODEL = 'gemini-2.5-flash-image';

const ISOTIPO_SRC = 'apps/web/public/logo-experiments/brand-system/01-isotipo.png';
const WORDMARK_SRC = 'apps/web/public/logo-experiments/wordmark/wordmark-v1.png';

const isotipoB64 = (await readFile(ISOTIPO_SRC)).toString('base64');
const wordmarkB64 = (await readFile(WORDMARK_SRC)).toString('base64');

const REFS = [
  { inline_data: { mime_type: 'image/png', data: isotipoB64 } },
  { inline_data: { mime_type: 'image/png', data: wordmarkB64 } },
];

const PROMPTS = {
  imagotipo: `You are looking at two OFFICIAL PadelKing brand assets:
- IMAGE 1: The official ISOTIPO — a padel paddle (teardrop head) with a 5-peak negative-space crown inside the head face, grip wrap on the handle, champagne gold on black.
- IMAGE 2: The official LOGOTIPO/wordmark — "PADELKING" set with a paddle replacing the "I" in KING, "PADEL" in white, "KING" in champagne gold.

DESIGN BRIEF — IMAGOTIPO (horizontal lockup, icon + text SEPARATED):
- LEFT: the EXACT isotipo from IMAGE 1. Same proportions, same crown shape, same grip wrap, same gold color. Do not redraw — replicate.
- A clear vertical gap separates icon and text (about 60% of the paddle's width). Optional: a thin vertical champagne gold hairline line as elegant divider.
- RIGHT: the wordmark text "PADELKING" — PADEL in white, KING in champagne gold, same bold uppercase grotesque sans-serif as IMAGE 2, tight letter-spacing. In THIS imagotipo, use a NORMAL "I" letter (not the paddle), because the paddle is already on the left as the standalone icon.
- The isotipo height should be approximately 1.4x the cap-height of the text. Vertically center-aligned.
- Pure black background (#0a0a0a). Generous padding around the full lockup.
- No tagline. No subtitle. No country.
- Output a high-resolution square PNG with the horizontal lockup centered.
- Flat vector style, no gradients, no shadows.`,

  isologo: `You are looking at two OFFICIAL PadelKing brand assets:
- IMAGE 1: The official ISOTIPO — padel paddle with negative-space crown.
- IMAGE 2: The official LOGOTIPO/wordmark — PADELKING with paddle in the "I".

DESIGN BRIEF — ISOLOGO (one integrated seal/emblem, icon + text INSEPARABLE):
COMPOSITION: a circular seal / sports crest.
- CENTER: a large version of the EXACT isotipo from IMAGE 1. Same paddle silhouette, same negative-space crown, same grip wrap, same gold.
- TOP: the word "PADELKING" curves along an invisible upper arc, ABOVE the paddle head. Uppercase, tight tracking, champagne gold (same gold as paddle). The text follows the curve — letters tilt with the arc.
- BOTTOM: the small text "EST · 2026" curves along an invisible lower arc, BELOW the paddle handle. Same gold, smaller size.
- A thin champagne gold hairline circle outlines the entire emblem (very subtle, like a coin edge).
- Two small champagne gold 5-point stars on either side, flanking the bottom text (between PADELKING upper arc and EST · 2026 lower arc).
- Pure black background. Generous padding around the seal.
- Looks like a Champions League / FIFA / NBA team official seal. Broadcast-quality, editorial polish.
- Flat vector, no gradients, no drop shadows.
- Output a high-resolution square PNG centered.`,
};

const outDir = 'apps/web/public/logo-experiments/final-system';
await mkdir(outDir, { recursive: true });

// Copy approved assets
await copyFile(ISOTIPO_SRC, `${outDir}/01-isotipo.png`);
console.log(`  ✓ copied 01-isotipo.png`);
await copyFile(WORDMARK_SRC, `${outDir}/02-logotipo.png`);
console.log(`  ✓ copied 02-logotipo.png`);

async function generate(name, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [...REFS, { text: prompt }] }],
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

// Generate imagotipo (2 variants) and isologo (2 variants) to have options
const tasks = [
  { name: '03-imagotipo-v1', prompt: PROMPTS.imagotipo },
  { name: '03-imagotipo-v2', prompt: PROMPTS.imagotipo },
  { name: '04-isologo-v1', prompt: PROMPTS.isologo },
  { name: '04-isologo-v2', prompt: PROMPTS.isologo },
];

for (const t of tasks) {
  try {
    console.log(`Generating ${t.name}...`);
    const buf = await generate(t.name, t.prompt);
    const path = `${outDir}/${t.name}.png`;
    await writeFile(path, buf);
    console.log(`  ✓ ${path} (${buf.length} bytes)`);
  } catch (e) {
    console.error(`  × ${t.name}: ${e.message}`);
  }
}

console.log('\nDone. See apps/web/public/logo-experiments/final-system/');
