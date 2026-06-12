import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      {/* Barra hub: full-bleed como la real (-mx-6 + border-b) */}
      <Skeleton className="border-border/40 -mx-6 h-12 rounded-none border-b" />

      <div className="space-y-4">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );
}
