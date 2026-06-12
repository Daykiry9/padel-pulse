'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Hace que TODA animación de framer-motion respete prefers-reduced-motion
 * (transform se desactiva, opacity se conserva). Las animaciones CSS ya lo
 * respetan vía el media query global de globals.css.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
