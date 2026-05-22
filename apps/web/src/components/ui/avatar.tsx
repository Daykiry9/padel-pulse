import { cn } from '@/lib/utils';

/**
 * Avatar procedural: a partir de un seed (id/slug/name) genera un gradient
 * único y estable. No reemplaza un upload real — cubre el caso default sin
 * cuadros marrones genéricos.
 */

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES = [
  ['#FFC53D', '#7C4F05'],
  ['#EC4899', '#831843'],
  ['#5EEAD4', '#0EA5A5'],
  ['#FB7185', '#9F1239'],
  ['#A78BFA', '#5B21B6'],
  ['#60A5FA', '#1E3A8A'],
  ['#34D399', '#065F46'],
  ['#F472B6', '#831843'],
  ['#FCD34D', '#92400E'],
  ['#818CF8', '#3730A3'],
];

function gradientFor(seed: string): { from: string; to: string; angle: number } {
  const h = hashSeed(seed);
  const palette = PALETTES[h % PALETTES.length]!;
  const angle = (h >> 4) % 360;
  return { from: palette[0]!, to: palette[1]!, angle };
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'size-5 text-[9px]',
  sm: 'size-7 text-[10px]',
  default: 'size-9 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-base',
  '2xl': 'size-24 text-xl',
};

export interface AvatarProps {
  seed: string;
  name?: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | '2xl';
  className?: string;
  ring?: boolean;
}

function getInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function Avatar({ seed, name, src, size = 'default', className, ring = false }: AvatarProps) {
  const { from, to, angle } = gradientFor(seed);
  const initials = getInitials(name ?? seed);

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-medium tabular-nums uppercase tracking-tight text-white/90 select-none',
        SIZE_CLASSES[size],
        ring && 'ring-2 ring-background',
        className,
      )}
      style={
        src
          ? undefined
          : { background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)` }
      }
      aria-label={name ?? seed}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ''} className="size-full object-cover" />
      ) : (
        <span className="leading-none drop-shadow-sm">{initials || '?'}</span>
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  avatars: { seed: string; name?: string; src?: string | null }[];
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = Math.max(0, avatars.length - visible.length);

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((a, i) => (
        <Avatar key={`${a.seed}-${i}`} seed={a.seed} name={a.name} src={a.src} size={size} ring />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'border-background bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-full border-2 font-medium tabular-nums',
            SIZE_CLASSES[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
