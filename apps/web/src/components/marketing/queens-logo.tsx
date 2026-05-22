/**
 * Isotipo PadelQueens: misma pala teardrop con corona negative space, pero en rosa Queens.
 */
export function QueensLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M 16 3 C 22 3 26 7 26 13 C 26 18 22 22 18 22 L 14 22 C 10 22 6 18 6 13 C 6 7 10 3 16 3 Z"
        fill="#ec4899"
      />
      <path
        d="M 10 16 L 10 14 L 11 11 L 12 13 L 13.5 10 L 15 13 L 16 9 L 17 13 L 18.5 10 L 20 13 L 21 11 L 22 14 L 22 16 Z"
        fill="#0a0a0a"
      />
      <path d="M 13 22 L 14 24 L 18 24 L 19 22 Z" fill="#ec4899" />
      <rect x="13.5" y="24" width="5" height="6" rx="0.5" fill="#ec4899" />
      <g stroke="#0a0a0a" strokeWidth="0.35" strokeLinecap="round">
        <line x1="13.8" y1="26" x2="18.2" y2="26.4" />
        <line x1="13.8" y1="27.5" x2="18.2" y2="27.9" />
        <line x1="13.8" y1="29" x2="18.2" y2="29.4" />
      </g>
    </svg>
  );
}
