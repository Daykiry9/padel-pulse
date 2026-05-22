// Genera variantes del wordmark PADELKING usando el isotipo como referencia visual.
// Uso: GEMINI_API_KEY=... node scripts/generate-wordmark.mjs
import { writeFile, mkdir, readFile } from 'node:fs/promises';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const MODEL = 'gemini-2.5-flash-image';
const ISOTIPO_PATH = 'apps/web/public/logo-experiments/brand-system/01-isotipo.png';

const isotipoBuf = await readFile(ISOTIPO_PATH);
const isotipoB64 = isotipoBuf.toString('base64');

const PROMPT = `You are looking at the OFFICIAL ISOTIPO of the PadelKing brand (attached image).
Reuse THIS EXACT padel paddle illustration — same proportions, same crown-as-negative-space, same grip wrap on the handle, same champagne gold color, same style — as a brand element inside a wordmark logo.

DESIGN BRIEF — Wordmark "PADELKING":
- One single word: "PADELKING".
- Set in a bold uppercase grotesque sans-serif (think GT America Condensed, Söhne Breit). Very tight letter-spacing, slightly negative.
- "PADEL" in pure white (#f4f4f5).
- "KING" in champagne gold (#c9a85c), same gold as the paddle.
- Between "PADEL" and "KING", at the position of the letter "I" of KING, INSERT the EXACT paddle from the reference image as a vertical element. The paddle should be slightly TALLER than the cap-height of the letters (it can extend a bit above and below the baseline, like a hero icon between the two words). Do NOT redraw the paddle — keep the exact shape, crown details, and grip wrap from the reference.
- The paddle replaces the letter "I" entirely — meaning KING reads as "K[paddle]NG".
- Pure black background (#0a0a0a).
- Centered composition. Generous black padding around the wordmark. No tagline, no subtitle.
- Output a single high-resolution horizontal-friendly square PNG.

Style notes: editorial, Champions League / ATP World Tour broadcast quality. NO drop shadows, NO gradients, NO outlines around letters. Flat vector look.`;

const outDir = 'apps/web/public/logo-experiments/wordmark';
await mkdir(outDir, { recursive: true });

async function generate(variantIndex) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/png', data: isotipoB64 } },
            { text: PROMPT },
          ],
        },
      ],
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

// 4 generaciones para tener opciones
for (let i = 1; i <= 4; i++) {
  try {
    console.log(`Generating wordmark v${i}...`);
    const buf = await generate(i);
    const path = `${outDir}/wordmark-v${i}.png`;
    await writeFile(path, buf);
    console.log(`  ✓ ${path} (${buf.length} bytes)`);
  } catch (e) {
    console.error(`  × v${i}: ${e.message}`);
  }
}

console.log('\nDone. See apps/web/public/logo-experiments/wordmark/');
