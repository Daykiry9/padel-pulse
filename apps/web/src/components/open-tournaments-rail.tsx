import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { Countdown } from '@/components/ui/countdown';
import { PriceTag } from '@/components/ui/price-tag';
import { formatShort } from '@/lib/format-date';
import type { getSupabaseServerClient } from '@/lib/supabase/server';

export type OpenTournament = {
  id: string;
  slug: string;
  name: string;
  starts_at: string;
  category_kind: string;
  category: string | null;
  max_teams: number;
  price_per_team: number;
  clubs: { city: string } | null;
  taken: number;
};

/** Torneos abiertos que aun no arrancan, con cupos ocupados (2 queries). */
export async function getOpenTournaments(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  limit = 12,
): Promise<OpenTournament[]> {
  const { data } = await supabase
    .from('tournaments')
    .select('id, slug, name, starts_at, category_kind, category, max_teams, price_per_team, clubs(city)')
    .eq('status', 'open')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(limit);
  const rows = (data ?? []) as unknown as Omit<OpenTournament, 'taken'>[];
  const counts = new Map<string, number>();
  if (rows.length) {
    const { data: regs } = await supabase
      .from('tournament_registrations')
      .select('tournament_id')
      .in('tournament_id', rows.map((t) => t.id))
      .eq('status', 'confirmed');
    for (const r of (regs ?? []) as { tournament_id: string }[]) {
      counts.set(r.tournament_id, (counts.get(r.tournament_id) ?? 0) + 1);
    }
  }
  return rows.map((t) => ({ ...t, taken: Math.min(counts.get(t.id) ?? 0, t.max_teams) }));
}

/** Carrusel horizontal (snap en movil) de torneos abiertos con medidor de cupos. */
export function OpenTournamentsRail({ tournaments }: { tournaments: OpenTournament[] }) {
  return (
    <div className="flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tournaments.map((t) => {
        const left = t.max_teams - t.taken;
        const almostFull = left > 0 && left <= Math.max(2, Math.ceil(t.max_teams * 0.25));
        return (
          <Link key={t.id} href={`/tournaments/${t.slug}`} className="w-[78%] shrink-0 snap-start sm:w-72">
            <Card className="hover:border-crown/50 flex h-full flex-col gap-3 p-5 transition-colors">
              <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
                <span className="text-muted-foreground truncate">{t.clubs?.city ?? 'Colombia'}</span>
                <Countdown target={t.starts_at} size="sm" className="text-crown shrink-0" />
              </div>
              <div className="font-display line-clamp-2 min-h-[3.25rem] text-xl leading-tight tracking-tight">
                {t.name.toUpperCase()}
              </div>
              <div className="text-muted-foreground text-xs">{formatShort(t.starts_at)}</div>
              <div className="mt-auto space-y-2 pt-2">
                <div className="flex gap-0.5" aria-hidden>
                  {Array.from({ length: t.max_teams }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < t.taken ? (almostFull ? 'bg-live' : 'bg-crown') : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-xs uppercase tracking-widest ${
                      almostFull ? 'text-live font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {left === 0 ? 'Cupo completo' : left === 1 ? 'Queda 1 cupo' : `Quedan ${left} cupos`}
                  </span>
                  <PriceTag value={t.price_per_team} />
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
