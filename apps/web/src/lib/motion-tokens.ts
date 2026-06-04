/**
 * Motion tokens — durations, easings, stagger, scale y translate
 * para animaciones consistentes en toda la app.
 */

export const duration = { quick: 150, base: 250, slow: 400 } as const;

export const easing = {
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 380, damping: 30 },
} as const;

export const stagger = { fast: 0.04, base: 0.06, slow: 0.1 } as const;

export const scale = { tap: 0.96, hover: 1.02 } as const;

export const translate = { up: -2, down: 2 } as const;

export type MotionTokens = {
  duration: typeof duration;
  easing: typeof easing;
  stagger: typeof stagger;
  scale: typeof scale;
  translate: typeof translate;
};
