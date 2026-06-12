import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function TournamentDetailLoading() {
  return (
    <div className="bg-background min-h-screen">
      <div className="border-border/40 bg-background/60 sticky top-0 z-40 h-16 border-b backdrop-blur-xl" />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-12 w-3/4 md:h-[72px]" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="space-y-2 p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </Card>
            ))}
          </div>

          <Card className="space-y-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
          </Card>
          <Card className="space-y-3 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
          </Card>
        </div>
      </main>
    </div>
  );
}
