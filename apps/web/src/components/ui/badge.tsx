import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-crown/15 text-crown',
        crown: 'border-crown/30 bg-crown/15 text-crown',
        queens: 'border-queens/30 bg-queens/15 text-queens',
        data: 'border-transparent bg-data/15 text-data',
        live: 'border-live/40 bg-live/15 text-live',
        success: 'border-transparent bg-success/15 text-success',
        outline: 'border-border text-foreground',
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
