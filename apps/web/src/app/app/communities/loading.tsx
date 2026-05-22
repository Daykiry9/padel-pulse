import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CommunitiesLoading() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <div className="border-border/40 flex items-center justify-between border-t pt-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-10" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
