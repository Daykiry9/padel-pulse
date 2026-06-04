import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type TournamentCardSkeletonProps = {
  count?: number;
  className?: string;
};

export function TournamentCardSkeleton({ count = 3, className }: TournamentCardSkeletonProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="bg-muted/30 h-3 w-20 animate-pulse rounded" />
              <div className="bg-muted/30 h-5 w-3/4 animate-pulse rounded" />
            </div>
            <div className="bg-muted/30 h-6 w-16 animate-pulse rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="bg-muted/30 h-3 w-1/2 animate-pulse rounded" />
            <div className="bg-muted/30 h-3 w-2/3 animate-pulse rounded" />
            <div className="bg-muted/30 h-3 w-1/3 animate-pulse rounded" />
          </div>
          <div className="border-border/40 flex items-center justify-between border-t pt-3">
            <div className="bg-muted/30 h-3 w-16 animate-pulse rounded" />
            <div className="bg-muted/30 h-9 w-28 animate-pulse rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}
