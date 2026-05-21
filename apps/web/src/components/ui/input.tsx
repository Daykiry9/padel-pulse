import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground',
          // transition específica, sin `all`
          'transition-[border-color,box-shadow] duration-[120ms] [transition-timing-function:var(--ease-out)]',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground/70',
          // hover sutil — no movemos border-color por completo, solo subtle
          'hover:border-foreground/15',
          // focus ring: 2px solid en color ring, sin offset agresivo
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-ring/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
