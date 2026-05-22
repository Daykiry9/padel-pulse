import { ArrowDown, ArrowUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type Accent = 'crown' | 'queens' | 'data' | 'live' | 'success' | 'warning' | 'neutral';

const ACCENT_BORDER: Record<Accent, string> = {
  crown: 'border-gold-400/30 bg-gradient-to-br from-gold-400/[0.06] to-transparent',
  queens: 'border-magenta-500/30 bg-gradient-to-br from-magenta-500/[0.06] to-transparent',
  data: 'border-data/30 bg-gradient-to-br from-data/[0.05] to-transparent',
  live: 'border-live/30 bg-gradient-to-br from-live/[0.05] to-transparent',
  success: 'border-success/30 bg-gradient-to-br from-success/[0.05] to-transparent',
  warning: 'border-warning/30 bg-gradient-to-br from-warning/[0.05] to-transparent',
  neutral: '',
};

const ACCENT_NUMBER: Record<Accent, string> = {
  crown: 'text-gold-400',
  queens: 'text-magenta-500',
  data: 'text-data',
  live: 'text-live',
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-foreground',
};

const ACCENT_ICON_BG: Record<Accent, string> = {
  crown: 'bg-gold-400/15 text-gold-400',
  queens: 'bg-magenta-500/15 text-magenta-500',
  data: 'bg-data/15 text-data',
  live: 'bg-live/15 text-live',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  neutral: 'bg-muted text-muted-foreground',
};

export interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  delta?: { value: number; unit?: string; direction: 'up' | 'down' | 'flat' };
  accent?: Accent;
  size?: 'sm' | 'default' | 'lg';
  loading?: boolean;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  delta,
  accent = 'neutral',
  size = 'default',
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'border-border bg-card rounded-xl border p-5',
          size === 'sm' && 'p-4',
          size === 'lg' && 'p-6',
          className,
        )}
      >
        <div className="shimmer h-3 w-20 rounded" />
        <div className="shimmer mt-3 h-10 w-32 rounded" />
        <div className="shimmer mt-2 h-3 w-24 rounded" />
      </div>
    );
  }

  const numberSize =
    size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-5xl md:text-6xl' : 'text-3xl md:text-4xl';

  return (
    <div
      className={cn(
        'border-border bg-card rounded-xl border transition-[border-color,background-color] duration-[var(--duration-base)] [transition-timing-function:var(--ease-out)]',
        ACCENT_BORDER[accent],
        size === 'sm' && 'p-4',
        size === 'default' && 'p-5',
        size === 'lg' && 'p-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em]">
          {Icon && <Icon className="size-3" />}
          {label}
        </div>
        {delta && size !== 'sm' && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
              delta.direction === 'up' && 'bg-success/10 text-success',
              delta.direction === 'down' && 'bg-live/10 text-live',
              delta.direction === 'flat' && 'bg-muted text-muted-foreground',
            )}
          >
            {delta.direction === 'up' && <ArrowUp className="size-2.5" />}
            {delta.direction === 'down' && <ArrowDown className="size-2.5" />}
            {delta.value > 0 && delta.direction === 'up' ? '+' : ''}
            {delta.value}
            {delta.unit && <span className="ml-0.5 opacity-70">{delta.unit}</span>}
          </span>
        )}
      </div>

      <div className={cn('mt-2 flex items-baseline gap-2', size === 'lg' && 'mt-3')}>
        {size === 'lg' && Icon && (
          <div className={cn('mr-1 flex size-14 items-center justify-center rounded-xl', ACCENT_ICON_BG[accent])}>
            <Icon className="size-7" />
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'font-display tabular-nums leading-none tracking-tight',
              numberSize,
              ACCENT_NUMBER[accent],
            )}
          >
            {typeof value === 'number' ? value.toLocaleString('es-CO') : value}
          </span>
          {unit && (
            <span className="text-muted-foreground text-sm font-medium normal-case">{unit}</span>
          )}
        </div>
      </div>

      {hint && (
        <div className="text-muted-foreground mt-2 text-xs normal-case leading-snug">{hint}</div>
      )}
    </div>
  );
}
