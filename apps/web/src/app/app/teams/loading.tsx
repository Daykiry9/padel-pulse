import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamsLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-3/4 max-w-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-5">
            <div className="flex gap-1.5">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="size-10 rounded-full -ml-2" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="border-border/40 flex items-center justify-between border-t pt-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-7 w-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
