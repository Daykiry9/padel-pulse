/**
 * Isotipo PadelKing: pala teardrop dorada con corona de 5 picos como negative space.
 * Mango proporcionalmente más ancho para que NO parezca un signo "!" a navbar size.
 */
export function KingLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {/* Cabeza teardrop */}
      <path
        d="M 16 3 C 22 3 26 7 26 13 C 26 18 22 22 18 22 L 14 22 C 10 22 6 18 6 13 C 6 7 10 3 16 3 Z"
        fill="#ffc53d"
      />
      {/* Corona en negative space: 5 picos triangulares + headband */}
      <path
        d="M 10 16 L 10 14 L 11 11 L 12 13 L 13.5 10 L 15 13 L 16 9 L 17 13 L 18.5 10 L 20 13 L 21 11 L 22 14 L 22 16 Z"
        fill="#0a0a0a"
      />
      {/* Garganta + mango unificado y más ancho — evita el "!" look */}
      <path
        d="M 12 22 L 11 26 Q 11 29 14 29 L 18 29 Q 21 29 21 26 L 20 22 Z"
        fill="#ffc53d"
      />
      {/* Grip wrap lines */}
      <g stroke="#0a0a0a" strokeWidth="0.4" strokeLinecap="round">
        <line x1="12.5" y1="25" x2="19.5" y2="25" />
        <line x1="12.3" y1="27" x2="19.7" y2="27" />
      </g>
    </svg>
  );
}
