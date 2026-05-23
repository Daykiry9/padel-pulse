import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function RankingsLoading() {
  return (
    <div className="bg-background min-h-screen">
      <div className="border-border/40 bg-background/60 sticky top-0 z-40 h-16 border-b backdrop-blur-xl" />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-3 h-14 w-96 max-w-full" />
        <Skeleton className="mt-3 h-4 w-3/4" />

        {/* Filters */}
        <div className="border-border/40 mt-8 flex flex-wrap gap-2 border-b pb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-32 rounded-full" />
          ))}
        </div>

        {/* Podio */}
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-6">
              <Skeleton className="h-10 w-12" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-24" />
            </Card>
          ))}
        </div>

        {/* Tabla */}
        <div className="mt-10">
          <Skeleton className="h-6 w-32" />
          <Card className="mt-3 divide-border/30 divide-y p-0">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3">
                <Skeleton className="h-5 w-6" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-48" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </Card>
        </div>
      </main>
    </div>
  );
}
