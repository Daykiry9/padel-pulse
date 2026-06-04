/**
 * Carga remota de fuentes para next/og (Satori). Sin estos buffers,
 * el render cae a la fuente fallback del SO y los textos se ven genéricos.
 *
 * Cacheamos en memoria del proceso para que requests subsecuentes no vuelvan
 * a descargar las fuentes desde Google.
 */
type FontWeight = 400 | 700 | 800 | 900;
type FontSpec = {
  name: string;
  url: string;
  weight: FontWeight;
  style: 'normal' | 'italic';
};

const FONT_SPECS: FontSpec[] = [
  // Manrope (sans body) — 400, 700, 800
  {
    name: 'Manrope',
    url: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggexSg.woff',
    weight: 400,
    style: 'normal',
  },
  {
    name: 'Manrope',
    url: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggOxSg.woff',
    weight: 700,
    style: 'normal',
  },
  {
    name: 'Manrope',
    url: 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggGxSg.woff',
    weight: 800,
    style: 'normal',
  },
  // Archivo Black (display, only 400 exists upstream)
  {
    name: 'ArchivoBlack',
    url: 'https://fonts.gstatic.com/s/archivoblack/v23/HTxqL289NzCGg4MzN6KJ7eW6CYyF_g.woff',
    weight: 400,
    style: 'normal',
  },
];

let cached: Promise<
  { name: string; data: ArrayBuffer; weight: FontWeight; style: 'normal' | 'italic' }[]
> | null = null;

export async function loadShareFonts() {
  if (cached) return cached;
  cached = (async () => {
    const buffers = await Promise.all(
      FONT_SPECS.map(async (f) => {
        try {
          const res = await fetch(f.url, { cache: 'force-cache' });
          if (!res.ok) throw new Error(`font ${f.name} ${f.weight} ${res.status}`);
          const data = await res.arrayBuffer();
          return { name: f.name, data, weight: f.weight, style: f.style };
        } catch {
          return null;
        }
      }),
    );
    return buffers.filter((x): x is NonNullable<typeof x> => x !== null);
  })();
  return cached;
}
