import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5',
    'text-[10px] font-semibold uppercase tracking-[0.1em] leading-none',
    'transition-[background-color,border-color,color] duration-[120ms] [transition-timing-function:var(--ease-out)]',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-transparent bg-crown/15 text-crown',
        crown: 'border-crown/25 bg-crown/12 text-crown',
        queens: 'border-queens/25 bg-queens/12 text-queens',
        data: 'border-transparent bg-data/15 text-data',
        live: 'border-live/35 bg-live/15 text-live',
        success: 'border-transparent bg-success/15 text-success',
        outline: 'border-border text-foreground/80',
        muted: 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
