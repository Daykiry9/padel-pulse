import { cn } from '@/lib/utils';

export interface SectionProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Variants compactos vs aireados (rhythm: tight groupings vs generous separations) */
  density?: 'tight' | 'default' | 'airy';
}

export function Section({
  title,
  subtitle,
  action,
  children,
  className,
  density = 'default',
}: SectionProps) {
  return (
    <section
      className={cn(
        density === 'tight' && 'space-y-3',
        density === 'default' && 'space-y-4',
        density === 'airy' && 'space-y-6',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-end justify-between gap-3">
          <div>
            {title && (
              <h2 className="font-display text-xl tracking-tight md:text-2xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-muted-foreground mt-1 text-xs normal-case md:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
