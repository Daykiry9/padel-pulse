import { cn } from '@/lib/utils';

type RankingRowSkeletonProps = {
  count?: number;
  className?: string;
};

export function RankingRowSkeleton({ count = 5, className }: RankingRowSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-border/40 flex items-center gap-3 rounded-lg border p-3"
        >
          <div className="bg-muted/30 size-4 animate-pulse rounded" />
          <div className="bg-muted/30 size-10 shrink-0 animate-pulse rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted/30 h-4 w-32 animate-pulse rounded" />
            <div className="bg-muted/30 h-3 w-20 animate-pulse rounded" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-muted/30 h-5 w-14 animate-pulse rounded" />
            <div className="bg-muted/30 h-3 w-10 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
