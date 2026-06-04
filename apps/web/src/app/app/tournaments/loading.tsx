import { Skeleton } from '@/components/ui/skeleton';
import { TournamentCardSkeleton } from '@/components/ui/skeletons';

export default function TournamentsLoading() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <TournamentCardSkeleton count={6} />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <TournamentCardSkeleton count={3} />
      </div>
    </div>
  );
}
