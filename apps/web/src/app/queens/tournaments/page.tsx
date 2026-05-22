import Link from 'next/link';
import { Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-footer';
import { TournamentListView, type TournamentRow } from '@/components/marketing/tournament-list-view';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function QueensTournamentsPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('tournaments')
    .select(
      'id, slug, name, format, status, starts_at, category_kind, category, min_sum, tier, max_teams, price_per_team, clubs(name, city)',
    )
    .in('category_kind', ['queens_estandar', 'queens_suma', 'mixto_estandar', 'mixto_suma'])
    .eq('status', 'open')
    .order('starts_at', { ascending: true });
  const tournaments = (data ?? []) as unknown as TournamentRow[];

  // Fetch reg counts
  let tournamentsWithCount: TournamentRow[] = tournaments;
  if (tournaments.length > 0) {
    const ids = tournaments.map((t) => t.id);
    const { data: regs } = await supabase
      .from('tournament_registrations')
      .select('tournament_id')
      .in('tournament_id', ids)
      .eq('status', 'confirmed');
    const countMap = new Map<string, number>();
    for (const r of (regs ?? []) as { tournament_id: string }[]) {
      countMap.set(r.tournament_id, (countMap.get(r.tournament_id) ?? 0) + 1);
    }
    tournamentsWithCount = tournaments.map((t) => ({
      ...t,
      registrations_count: countMap.get(t.id) ?? 0,
    }));
  }

  return (
    <div className="theme-queens">
      <div className="bg-background min-h-screen">
        <PublicHeader brand="queens" />

        <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
          <div className="mb-10">
            <Badge variant="queens">Torneos</Badge>
            <h1 className="font-display mt-4 text-5xl tracking-tight md:text-6xl">
              TORNEOS <span className="text-magenta-500">QUEENS</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl text-sm md:text-base">
              Femeninos + mixtos. ¿Buscas masculinos?{' '}
              <Link href="/tournaments" className="text-gold-400 underline-offset-2 hover:underline">
                Ver Kings →
              </Link>
            </p>
          </div>

          {tournamentsWithCount.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="text-muted-foreground mx-auto size-10" />
              <p className="text-foreground/80 font-display mt-4 text-xl">
                No hay torneos Queens publicados.
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Crea una comunidad Queens y publica el primero.
              </p>
              <Button variant="queens" className="mt-4" asChild>
                <Link href="/signup">Crear cuenta</Link>
              </Button>
            </Card>
          ) : (
            <TournamentListView tournaments={tournamentsWithCount} brand="queens" />
          )}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
