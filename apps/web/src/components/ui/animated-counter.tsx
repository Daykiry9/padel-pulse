'use client';

import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: 'tabular' | 'comma' | 'decimal';
  className?: string;
}

function formatValue(n: number, format: AnimatedCounterProps['format']): string {
  if (format === 'comma') return Math.round(n).toLocaleString('es-CO');
  if (format === 'decimal') return n.toFixed(1);
  return Math.round(n).toString();
}

export function AnimatedCounter({
  value,
  duration = 600,
  format = 'tabular',
  className,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (latest) => formatValue(latest, format));
  const previousRef = useRef(value);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease: 'easeOut',
      from: previousRef.current,
    });
    previousRef.current = value;
    return () => controls.stop();
  }, [value, duration, motionValue]);

  return <motion.span className={cn('tabular-nums', className)}>{rounded}</motion.span>;
}
