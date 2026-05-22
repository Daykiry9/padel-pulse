import { cn } from '@/lib/utils';

export interface CountdownProps {
  target: Date | string;
  className?: string;
  /** Mostrar palabras (en 3 días) vs digits (03:24:11:42) */
  format?: 'words' | 'digits';
  size?: 'sm' | 'default';
}

export function Countdown({
  target,
  className,
  format = 'words',
  size = 'default',
}: CountdownProps) {
  const targetDate = typeof target === 'string' ? new Date(target) : target;
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return (
      <span
        className={cn(
          'text-live inline-flex items-center gap-1 font-mono uppercase tracking-[0.15em]',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          className,
        )}
      >
        Ya empezó
      </span>
    );
  }

  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;

  if (format === 'words') {
    let text = '';
    if (days > 0) text = days === 1 ? 'mañana' : `en ${days} días`;
    else if (hours > 0) text = `en ${hours}h ${mins}m`;
    else text = `en ${mins}m`;

    const urgent = days === 0 && hours < 6;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-mono uppercase tracking-[0.15em]',
          urgent ? 'text-live' : 'text-muted-foreground',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          className,
        )}
      >
        {text}
      </span>
    );
  }

  // digits format
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    <span
      className={cn(
        'text-foreground/85 inline-flex items-baseline gap-0.5 font-mono tabular-nums',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      {days > 0 && (
        <>
          <span>{days}</span>
          <span className="text-muted-foreground">d</span>{' '}
        </>
      )}
      <span>{pad(hours)}</span>
      <span className="text-muted-foreground">:</span>
      <span>{pad(mins)}</span>
    </span>
  );
}
