import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Lista de bullets para enseñar/explicar, no formularios pelados */
  bullets?: string[];
  /** CTAs visibles */
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** Preview de "así se vería" — un componente que muestra el resultado */
  preview?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  bullets,
  primaryAction,
  secondaryAction,
  preview,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-card relative overflow-hidden rounded-xl border p-8 md:p-12',
        className,
      )}
    >
      <div className="grid gap-8 md:grid-cols-[1fr_auto]">
        <div className="max-w-md">
          {Icon && (
            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </div>
          )}
          <h3 className="font-display text-2xl tracking-tight md:text-3xl">{title.toUpperCase()}</h3>
          {description && (
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{description}</p>
          )}

          {bullets && bullets.length > 0 && (
            <ul className="mt-5 space-y-2">
              {bullets.map((b, i) => (
                <li key={i} className="text-foreground/85 flex items-start gap-2 text-sm">
                  <span className="text-crown mt-1 size-1.5 shrink-0 rounded-full" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          )}

          {(primaryAction || secondaryAction) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {primaryAction}
              {secondaryAction}
            </div>
          )}
        </div>

        {preview && (
          <div className="border-border/40 md:border-l md:pl-8">
            <div className="text-muted-foreground mb-3 text-[10px] uppercase tracking-[0.15em]">
              Así se vería
            </div>
            <div className="opacity-90">{preview}</div>
          </div>
        )}
      </div>
    </div>
  );
}
