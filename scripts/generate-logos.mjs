// Generador de alternativas de logo PadelKing con Gemini 2.5 Flash Image.
// Uso: GEMINI_API_KEY=... node scripts/generate-logos.mjs
import { writeFile, mkdir } from 'node:fs/promises';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const MODELS = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'];

const BASE = `Design a professional sports league logo for "PadelKing" — an amateur padel league in Colombia. Visual references: ATP World Tour, Premier Padel, Champions League wordmarks. Premium, editorial, broadcast-ready quality. Constraints: solid dark near-black background (#0a0a0a), single accent color in champagne gold (#c9a85c). Vector-style flat illustration, no photoreal, no soft gradients, no drop shadows. The mark must read cleanly at 24px navbar size. A padel paddle silhouette must be integrated somewhere in the design. Centered, generous padding. Output a single high-resolution square PNG.`;

const VARIANTS = [
  {
    name: '01-monogram-pk',
    prompt: `${BASE}

DESIGN BRIEF — Monogram PK with paddle. Create a clean geometric "PK" monogram where the vertical stem of the K is shaped like a slim padel paddle (oval head, narrow handle). The P is set tight against it. Use only one color (champagne gold) on black. No outline boxes, no shield, no extra ornament. Think Premier Padel meets a luxury brand logomark. Composition: centered, balanced.`,
  },
  {
    name: '02-heraldic-shield',
    prompt: `${BASE}

DESIGN BRIEF — Modern heraldic shield. A minimalist shield silhouette containing two padel paddles crossed in X formation behind the shield, with a slim refined crown (3 peaks, very subtle, not medieval) sitting atop the shield. Below the shield a tight uppercase wordmark "PADELKING". Champagne gold linework only, on black. No fills inside the shield other than thin outline. Editorial, not gothic.`,
  },
  {
    name: '03-paddle-crown-edge',
    prompt: `${BASE}

DESIGN BRIEF — Single padel paddle, vertical orientation, viewed straight on. The top edge of the paddle head is refined into 3 subtle crown peaks (central peak slightly taller, outer peaks lower, smooth transitions — looks like a paddle AND a crown simultaneously). Honeycomb hole pattern faintly visible on the face. Wood-grip lines on the handle. Solid champagne gold fill on black background. Confident proportions, no extra elements.`,
  },
  {
    name: '04-negative-space-crown',
    prompt: `${BASE}

DESIGN BRIEF — Negative space crown. A solid padel paddle in champagne gold viewed from above on black background. Inside the gold paddle face, a five-point crown shape is CUT OUT as negative space (revealing the black background through the gold). The crown appears as a black silhouette inside the gold paddle. Very smart, magazine-cover quality. Single mark, no wordmark. Confident, modern.`,
  },
  {
    name: '05-wordmark-lockup',
    prompt: `${BASE}

DESIGN BRIEF — Wordmark dominant lockup. The text "PADELKING" set as a single word in a tight, confident uppercase grotesque sans-serif (Söhne / GT America style), letter-spacing slightly negative. The "I" in "KING" is replaced by a thin vertical padel paddle silhouette acting as the letter. "PADEL" in white, "KING" in champagne gold (or both gold, your call). No box, no icon beside it — the wordmark IS the logo. Black background. Champions-League-tier polish.`,
  },
];

const outDir = 'apps/web/public/logo-experiments';
await mkdir(outDir, { recursive: true });

async function generate(model, variant) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
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
    const err = data?.error?.message ?? JSON.stringify(data);
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData ?? p.inline_data);
  const inline = imgPart?.inlineData ?? imgPart?.inline_data;
  if (!inline?.data) {
    throw new Error(`No image in response: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return Buffer.from(inline.data, 'base64');
}

let modelToUse = null;
for (const m of MODELS) {
  try {
    console.log(`Probing ${m}...`);
    const buf = await generate(m, VARIANTS[0]);
    const path = `${outDir}/${VARIANTS[0].name}.png`;
    await writeFile(path, buf);
    console.log(`  ✓ ${path} (${buf.length} bytes)`);
    modelToUse = m;
    break;
  } catch (e) {
    console.warn(`  × ${m}: ${e.message}`);
  }
}

if (!modelToUse) {
  console.error('No image model worked. Aborting.');
  process.exit(1);
}

for (const v of VARIANTS.slice(1)) {
  try {
    console.log(`Generating ${v.name} with ${modelToUse}...`);
    const buf = await generate(modelToUse, v);
    const path = `${outDir}/${v.name}.png`;
    await writeFile(path, buf);
    console.log(`  ✓ ${path} (${buf.length} bytes)`);
  } catch (e) {
    console.error(`  × ${v.name}: ${e.message}`);
  }
}

console.log('\nDone. Open apps/web/public/logo-experiments/ to compare.');
