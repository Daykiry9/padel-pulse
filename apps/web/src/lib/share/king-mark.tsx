/**
 * Versión inline del isotipo PadelKing para `next/og` (Satori).
 * Mantener en sync con `components/marketing/king-logo.tsx` — Satori no
 * puede importar componentes 'use client'/svg con tooling extra, así que
 * vivimos con un duplicado pequeño y muy estable.
 */
export function KingMark({ size = 72, accent = '#ffc53d' }: { size?: number; accent?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cabeza teardrop */}
      <path
        d="M 16 3 C 22 3 26 7 26 13 C 26 18 22 22 18 22 L 14 22 C 10 22 6 18 6 13 C 6 7 10 3 16 3 Z"
        fill={accent}
      />
      {/* Corona en negative space */}
      <path
        d="M 10 16 L 10 14 L 11 11 L 12 13 L 13.5 10 L 15 13 L 16 9 L 17 13 L 18.5 10 L 20 13 L 21 11 L 22 14 L 22 16 Z"
        fill="#0a0a0a"
      />
      {/* Mango */}
      <path
        d="M 12 22 L 11 26 Q 11 29 14 29 L 18 29 Q 21 29 21 26 L 20 22 Z"
        fill={accent}
      />
    </svg>
  );
}
