import { cva } from 'class-variance-authority';

// Sin 'use client': este módulo debe poder llamarse desde server components
// (ej. un <span> con look de botón dentro de un <Link>). El Button interactivo
// vive en button.tsx (client, motion + haptics) e importa estas clases.
export const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg',
    'text-sm font-semibold uppercase tracking-wide select-none',
    'shrink-0 [&_svg]:shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4',
    'transition-[transform,background-color,color,box-shadow,filter] duration-[120ms]',
    'will-change-transform',
    '[transition-timing-function:var(--ease-out)]',
    'active:scale-[0.97] active:[transition-timing-function:var(--ease-press)]',
    'disabled:pointer-events-none disabled:opacity-50',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:brightness-110 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_4px_18px_-6px_rgba(255,197,61,0.35)]',
        crown:
          'bg-crown text-crown-foreground hover:brightness-110 font-display shadow-[0_1px_2px_rgba(0,0,0,0.5),0_8px_28px_-10px_rgba(255,197,61,0.45)]',
        queens:
          'bg-queens text-queens-foreground hover:brightness-110 font-display shadow-[0_1px_2px_rgba(0,0,0,0.5),0_8px_28px_-10px_rgba(236,72,153,0.5)]',
        destructive:
          'bg-destructive text-destructive-foreground hover:brightness-110',
        outline:
          'border border-border bg-transparent hover:bg-muted hover:border-foreground/20',
        secondary:
          'bg-secondary text-secondary-foreground hover:brightness-110',
        ghost:
          'hover:bg-muted hover:text-foreground',
        link:
          'text-crown underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-6 text-base',
        xl: 'h-14 rounded-lg px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
