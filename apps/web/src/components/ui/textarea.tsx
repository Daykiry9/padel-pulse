import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[100px] w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground leading-relaxed',
      'transition-[border-color,box-shadow] duration-[120ms] [transition-timing-function:var(--ease-out)]',
      'placeholder:text-muted-foreground/70',
      'hover:border-foreground/15',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-ring/40',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
