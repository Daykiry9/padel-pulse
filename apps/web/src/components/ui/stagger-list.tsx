'use client';

import { motion, type Variants } from 'framer-motion';
import { Children, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface StaggerListProps {
  children: ReactNode;
  stagger?: number;
  initialDelay?: number;
  className?: string;
  itemClassName?: string;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function StaggerList({
  children,
  stagger = 0.06,
  initialDelay = 0,
  className,
  itemClassName,
}: StaggerListProps) {
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: initialDelay,
      },
    },
  };

  return (
    <motion.ul
      className={cn('list-none', className)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {Children.map(children, (child, index) => (
        <motion.li key={index} variants={itemVariants} className={itemClassName}>
          {child}
        </motion.li>
      ))}
    </motion.ul>
  );
}
