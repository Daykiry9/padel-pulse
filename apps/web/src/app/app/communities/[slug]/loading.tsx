import { Skeleton } from '@/components/ui/skeleton';
import {
  MemberAvatarSkeleton,
  RankingRowSkeleton,
  TournamentCardSkeleton,
} from '@/components/ui/skeletons';

export default function CommunityDetailLoading() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <RankingRowSkeleton count={8} />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <TournamentCardSkeleton count={3} />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <MemberAvatarSkeleton count={7} />
      </div>
    </div>
  );
}
