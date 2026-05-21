import * as React from 'react';

import { cn } from '@/lib/utils';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      style={{ colorScheme: 'dark' }}
      className={cn(
        'flex h-11 w-full appearance-none rounded-lg border border-input bg-card px-3.5 py-2 pr-9 text-sm text-foreground',
        'transition-[border-color,box-shadow] duration-[120ms] [transition-timing-function:var(--ease-out)]',
        'hover:border-foreground/15',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-ring/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        '[&>option]:bg-card [&>option]:text-foreground [&>option]:py-2',
        '[&>optgroup]:bg-card [&>optgroup]:text-muted-foreground [&>optgroup]:font-semibold',
        // chevron en color crown sutil
        "bg-[url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23FFC53D' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")] bg-[right_0.875rem_center] bg-no-repeat",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Select };
