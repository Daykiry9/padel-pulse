/**
 * PadelKing — design tokens compartidos entre web (Tailwind v4) y mobile (NativeWind).
 *
 * Dos universos de marca con paridad estructural:
 * - PadelKing (masculino + mixto): negro + dorado real (corona del rey)
 * - PadelQueens (femenino): negro + magenta premium (no rosa cliché)
 *
 * Surfaces oscuras: la plataforma es premium deportivo, no app pastel.
 * Inspiración: Kings League + ATP/WTA broadcast graphics.
 */

const ink = {
  50: '#F1EFEA',
  100: '#D6D4CD',
  200: '#A8A6A0',
  300: '#7B7976',
  400: '#52514F',
  500: '#3A3937',
  600: '#26262A',
  700: '#1B1D22',
  800: '#15171B',
  900: '#0F1115',
  950: '#0A0A0A',
} as const;

const gold = {
  50: '#FFF9E5',
  100: '#FFEFB8',
  200: '#FFE286',
  300: '#FFD55A',
  400: '#FFC53D',
  500: '#FBB217',
  600: '#D78F0A',
  700: '#A86C07',
  800: '#7C4F05',
  900: '#523503',
  950: '#2A1B01',
} as const;

const magenta = {
  50: '#FDF2F8',
  100: '#FCE7F3',
  200: '#FBCFE8',
  300: '#F9A8D4',
  400: '#F472B6',
  500: '#EC4899',
  600: '#DB2777',
  700: '#BE185D',
  800: '#9D174D',
  900: '#831843',
  950: '#500724',
} as const;

const data = {
  cyan: '#5EEAD4',
  cyanDeep: '#0EA5A5',
  cream: '#F1EFEA',
  success: '#4ADE80',
  warning: '#FB7185',
  live: '#FB7185',
} as const;

export const tokens = {
  brand: {
    king: {
      accent: gold[400],
      accentMuted: gold[200],
      accentDeep: gold[600],
    },
    queens: {
      accent: magenta[500],
      accentMuted: magenta[300],
      accentDeep: magenta[700],
    },
  },
  color: {
    ink,
    gold,
    magenta,
    data,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    '2xl': 32,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  font: {
    display: '"Archivo Black", "Anton", "Bebas Neue", system-ui, sans-serif',
    body: '"Manrope", "Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
} as const;

export type Tokens = typeof tokens;
export type BrandKey = keyof typeof tokens.brand;
