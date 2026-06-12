'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { easing, scale } from '@/lib/motion-tokens';
import * as haptics from '@/lib/haptics';
import { buttonVariants } from './button-variants';

/**
 * Button (Emil Kowalski principles):
 *  - transitions específicas (transform + background + filter), no `all`
 *  - duración 120ms (instant feedback)
 *  - ease custom (--ease-out), nunca ease-in
 *  - :active scale(0.97) para feedback de press
 *  - sombras sutiles (sin shadow-lg)
 *  - focus-visible: ring sin offset agresivo
 *  - motion: whileTap scale + spring (framer-motion respeta prefers-reduced-motion)
 *  - haptics: tap() en variants normales, confirm() en destructive
 *
 * Las clases (cva) viven en button-variants.ts para que los server components
 * puedan usarlas sin cruzar el boundary de 'use client'.
 */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        // Fire-and-forget: no await — el click sigue inmediato.
        if (variant === 'destructive') {
          void haptics.confirm();
        } else {
          void haptics.tap();
        }
        onClick?.(event);
      },
      [variant, onClick],
    );

    if (asChild) {
      // Slot no soporta motion wrapper sin romper la composición con el hijo.
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={handleClick}
          {...props}
        />
      );
    }

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        whileTap={{ scale: scale.tap }}
        transition={easing.spring}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
