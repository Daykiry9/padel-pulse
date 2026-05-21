import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Crown, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { KingLogo } from '@/components/marketing/king-logo';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function LiveTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();

  type TournamentRow = { id: string; name: string; slug: string; status: string };
  const tRes = await supabase.from('tournaments').select('id, name, slug, status').eq('slug', slug).single();
  const tournament = tRes.data as unknown as TournamentRow | null;
  if (!tournament) notFound();

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/40 bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <KingLogo />
            <span className="font-display text-base tracking-tight">
              PADEL<span className="text-crown">KING</span>
            </span>
          </Link>
          <Link
            href={`/tournaments/${slug}`}
            className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest"
          >
            <ArrowLeft className="inline size-3 mr-1" />
            Volver al detalle
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-live animate-pulse" />
            <span className="text-live font-mono text-xs uppercase tracking-widest">EN VIVO</span>
            <Badge variant="crown">{tournament.status}</Badge>
          </div>
          <h1 className="font-display text-4xl tracking-tight md:text-6xl">
            {tournament.name.toUpperCase()}
          </h1>

          <Card className="p-12 text-center">
            <Trophy className="text-muted-foreground mx-auto size-12" />
            <p className="text-foreground/80 font-display mt-4 text-2xl">
              VISTA EN VIVO — <span className="text-crown">PRÓXIMAMENTE</span>
            </p>
            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm">
              Cuando el torneo esté en curso aquí verás el bracket en tiempo real, marcadores
              editables, doble confirmación de scores y ranking que se actualiza ronda a ronda.
            </p>
            <p className="text-muted-foreground/70 mt-6 text-xs uppercase tracking-widest">
              Implementación: Fase 2 · usa el algoritmo de pareo en `packages/domain`
            </p>
          </Card>

          <Card className="border-crown/20 bg-crown/[0.03] p-6">
            <div className="flex items-center gap-2">
              <Crown className="text-crown size-4" />
              <span className="font-display text-sm tracking-tight uppercase">
                Listo en backend
              </span>
            </div>
            <ul className="text-foreground/80 mt-3 space-y-1.5 text-sm">
              <li>✓ Algoritmo de pareo americano (fijo + random) con tests</li>
              <li>✓ Vistas SQL: team_ranking_official, team_ranking_by_sum, player_ranking_casual</li>
              <li>✓ Doble confirmación en matches (confirmed_by_one + confirmed_by_two)</li>
              <li>✓ Validación de elegibilidad por Suma con tope individual</li>
              <li>✓ Auto-progresión de categoría (trigger SQL)</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
