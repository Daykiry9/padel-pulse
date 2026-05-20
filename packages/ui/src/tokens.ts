/**
 * Padel Pulse — design tokens compartidos entre web (Tailwind v4) y mobile (NativeWind).
 *
 * Filosofía visual:
 * - Court Teal: profundidad, profesionalismo (color de pista de pádel sintética).
 * - Pulse Magenta: energía, comunidad, gen-z friendly. Acento/CTAs.
 * - Lime Smash: secundario para datos positivos (rankings, wins).
 * - Dark surfaces: el dashboard de torneos lee como una consola en vivo.
 */
export const tokens = {
  color: {
    courtTeal: {
      50: '#eafdf8',
      100: '#cef9ee',
      200: '#9ef1dc',
      300: '#5fe1c3',
      400: '#2dcaa6',
      500: '#13b18d',
      600: '#0a8e73',
      700: '#0a715c',
      800: '#0c5a4b',
      900: '#0b4a3f',
      950: '#042a24',
    },
    pulseMagenta: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
      950: '#500724',
    },
    limeSmash: {
      50: '#f7fee7',
      100: '#ecfccb',
      200: '#d9f99d',
      300: '#bef264',
      400: '#a3e635',
      500: '#84cc16',
      600: '#65a30d',
      700: '#4d7c0f',
      800: '#3f6212',
      900: '#365314',
      950: '#1a2e05',
    },
    ink: {
      50: '#f6f7f9',
      100: '#eceef2',
      200: '#d5dae3',
      300: '#b0b9c9',
      400: '#8590a8',
      500: '#67738d',
      600: '#525c74',
      700: '#444c5e',
      800: '#3b414f',
      900: '#343844',
      950: '#0f1117',
    },
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  font: {
    display: '"Space Grotesk", "Inter", system-ui, -apple-system, sans-serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
} as const;

export type Tokens = typeof tokens;
