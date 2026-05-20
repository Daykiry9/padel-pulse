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
      <rect width="32" height="32" rx="8" fill="#0A0A0A" stroke="rgba(255,197,61,0.3)" />
      {/* corona estilizada */}
      <path
        d="M7 12 L10 18 L13 11 L16 18 L19 11 L22 18 L25 12 L25 22 L7 22 Z"
        fill="#FFC53D"
        stroke="#FFC53D"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      {/* tres gemas */}
      <circle cx="10" cy="11" r="1" fill="#0A0A0A" />
      <circle cx="16" cy="10" r="1" fill="#0A0A0A" />
      <circle cx="22" cy="11" r="1" fill="#0A0A0A" />
    </svg>
  );
}
