import { cn } from '@/lib/utils';

export interface PriceTagProps {
  value: number;
  currency?: 'COP' | 'USD';
  freeLabel?: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function PriceTag({
  value,
  currency = 'COP',
  freeLabel = 'Gratis',
  size = 'default',
  className,
}: PriceTagProps) {
  if (value <= 0) {
    return (
      <span
        className={cn(
          'text-success inline-flex items-center font-display tabular-nums',
          size === 'sm' && 'text-xs',
          size === 'default' && 'text-sm',
          size === 'lg' && 'text-lg',
          className,
        )}
      >
        {freeLabel}
      </span>
    );
  }

  const formatted =
    currency === 'COP'
      ? `$${value.toLocaleString('es-CO')}`
      : `US$${value.toLocaleString('en-US')}`;

  return (
    <span
      className={cn(
        'text-foreground inline-flex items-baseline gap-1 font-display tabular-nums',
        size === 'sm' && 'text-xs',
        size === 'default' && 'text-sm',
        size === 'lg' && 'text-lg',
        className,
      )}
    >
      {formatted}
      <span className="text-muted-foreground text-[10px] font-normal uppercase tracking-widest">
        {currency}
      </span>
    </span>
  );
}
