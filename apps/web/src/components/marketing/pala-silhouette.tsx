/**
 * Silueta de pala para uso decorativo (backgrounds, watermarks).
 * Proporciones reales de pala de padel: cabeza teardrop + garganta + mango grueso corto.
 * Usa currentColor — el parent define el tono via className.
 */
export function PalaSilhouette({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      {/* Cabeza teardrop */}
      <path d="M 16 3 C 22 3 26 7 26 13 C 26 18 22 22 18 22 L 14 22 C 10 22 6 18 6 13 C 6 7 10 3 16 3 Z" />
      {/* Garganta */}
      <path d="M 13 22 L 14 24 L 18 24 L 19 22 Z" />
      {/* Mango */}
      <rect x="13.5" y="24" width="5" height="6" rx="0.5" />
    </svg>
  );
}
