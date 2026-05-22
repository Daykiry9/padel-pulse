import { cn } from '@/lib/utils';

export interface LiveIndicatorProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function LiveIndicator({ label = 'EN VIVO', className, size = 'default' }: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        'text-live inline-flex items-center gap-1.5 font-mono font-semibold uppercase tracking-[0.18em]',
        size === 'sm' ? 'text-[9px]' : 'text-[10px]',
        className,
      )}
    >
      <span className="bg-live pulse-live inline-block size-1.5 rounded-full" />
      {label}
    </span>
  );
}
