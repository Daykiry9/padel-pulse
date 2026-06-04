import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MemberAvatarSkeleton,
  RankingRowSkeleton,
  TournamentCardSkeleton,
} from '@/components/ui/skeletons';
import { StatCard } from '@/components/ui/stat-card';

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <div>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-2 h-10 w-72" />
        <Skeleton className="mt-3 h-3 w-56" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="" value="" loading />
        <StatCard label="" value="" loading />
        <StatCard label="" value="" loading />
        <StatCard label="" value="" loading />
      </div>

      <div>
        <Skeleton className="h-5 w-48" />
        <Card className="mt-4 space-y-3 p-6 md:p-8">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex items-center justify-between pt-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <TournamentCardSkeleton count={3} />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <RankingRowSkeleton count={5} />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <MemberAvatarSkeleton count={6} />
      </div>
    </div>
  );
}
