import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function TournamentsLoading() {
  return (
    <div className="bg-background min-h-screen">
      <div className="border-border/40 bg-background/60 sticky top-0 z-40 h-16 border-b backdrop-blur-xl" />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="mb-10 space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-14 w-96 max-w-full" />
          <Skeleton className="h-4 w-64" />
          <div className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
        </div>

        {/* Hero card skeleton */}
        <Card className="mb-10 space-y-4 p-6 md:p-8">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="border-border/40 flex items-center justify-between border-t pt-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </Card>

        {/* Grid skeleton */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
