import { CATEGORY_LABELS_SHORT } from '@padelking/domain';

import { cn } from '@/lib/utils';

interface BaseBadgeProps {
  className?: string;
  size?: 'sm' | 'default';
}

interface CategoryProps extends BaseBadgeProps {
  kind: 'category';
  category: string;
}

interface SumaProps extends BaseBadgeProps {
  kind: 'suma';
  minSum: number;
  variant?: 'kings' | 'queens' | 'mixto';
}

interface TierProps extends BaseBadgeProps {
  kind: 'tier';
  tier: 'competitivo' | 'casual';
}

interface FormatProps extends BaseBadgeProps {
  kind: 'format';
  format: string;
}

type Props = CategoryProps | SumaProps | TierProps | FormatProps;

const FORMAT_LABELS: Record<string, string> = {
  americano_fijo: 'Americano',
  americano_random: 'Am. Random',
  liguilla_casual: 'Liguilla',
  liga: 'Liga',
  express: 'Express',
  eliminacion: 'Eliminación',
};

export function CategoryBadge(props: Props) {
  const sizeClasses =
    props.size === 'sm'
      ? 'px-1.5 py-0.5 text-[9px]'
      : 'px-2 py-0.5 text-[10px]';
  const base = cn(
    'inline-flex items-center gap-1 rounded-full border font-medium uppercase tabular-nums tracking-[0.1em] whitespace-nowrap',
    sizeClasses,
    props.className,
  );

  if (props.kind === 'category') {
    const isQueens =
      props.category.startsWith('queens_') || props.category.startsWith('femenino_');
    const isMixto = props.category.startsWith('mixto_');
    const cls = isQueens
      ? 'border-magenta-500/30 bg-magenta-500/10 text-magenta-300'
      : isMixto
        ? 'border-data/30 bg-data/10 text-data'
        : 'border-gold-400/30 bg-gold-400/10 text-gold-300';
    return (
      <span className={cn(base, cls)}>
        {CATEGORY_LABELS_SHORT[props.category as keyof typeof CATEGORY_LABELS_SHORT] ?? props.category}
      </span>
    );
  }

  if (props.kind === 'suma') {
    const variantCls = {
      kings: 'border-gold-400/30 bg-gold-400/10 text-gold-300',
      queens: 'border-magenta-500/30 bg-magenta-500/10 text-magenta-300',
      mixto: 'border-data/30 bg-data/10 text-data',
    }[props.variant ?? 'kings'];
    return <span className={cn(base, variantCls)}>Suma ≥ {props.minSum}</span>;
  }

  if (props.kind === 'tier') {
    const isComp = props.tier === 'competitivo';
    const cls = isComp
      ? 'border-gold-400/40 bg-gold-400/15 text-gold-300'
      : 'border-data/30 bg-data/10 text-data';
    return <span className={cn(base, cls)}>{isComp ? 'Tier 1' : 'Tier 2'}</span>;
  }

  // format
  return (
    <span className={cn(base, 'border-border bg-muted text-muted-foreground')}>
      {FORMAT_LABELS[props.format] ?? props.format}
    </span>
  );
}
