import Link from 'next/link';
import { CalendarDays, Plus, Trophy, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryBadge } from '@/components/ui/category-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { getSupabaseServerClient } from '@/lib/supabase/server';

interface TournamentsTabProps {
  communityId: string;
  isOwner: boolean;
}

type TournamentRow = {
  id: string;
  name: string;
  slug: string;
  format: string;
  status: 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';
  starts_at: string;
  category: string | null;
  category_kind: string | null;
  min_sum: number | null;
  max_teams: number;
};

type RegCountRow = { tournament_id: string };

type BucketKey = 'upcoming' | 'in_progress' | 'finished';

const BUCKET_LABEL: Record<BucketKey, string> = {
  upcoming: 'PRÓXIMOS',
  in_progress: 'EN CURSO',
  finished: 'FINALIZADOS',
};

const BUCKET_DESCRIPTION: Record<BucketKey, string> = {
  upcoming: 'Abiertos para inscripción o programados.',
  in_progress: 'Jugándose ahora.',
  finished: 'Cerrados con resultados.',
};

function bucketOf(status: TournamentRow['status']): BucketKey | null {
  if (status === 'open' || status === 'draft') return 'upcoming';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'finished') return 'finished';
  return null; // cancelled → no se muestra
}

export async function TournamentsTab({ communityId, isOwner }: TournamentsTabProps) {
  const supabase = await getSupabaseServerClient();

  const [tournamentsRes, regsRes] = await Promise.all([
    supabase
      .from('tournaments')
      .select(
        'id, name, slug, format, status, starts_at, category, category_kind, min_sum, max_teams',
      )
      .eq('community_id', communityId)
      .order('starts_at', { ascending: false }),
    supabase
      .from('tournament_registrations')
      .select('tournament_id')
      .eq('status', 'confirmed'),
  ]);

  const tournaments = (tournamentsRes.data ?? []) as TournamentRow[];
  const regs = (regsRes.data ?? []) as RegCountRow[];

  const regCount = new Map<string, number>();
  for (const r of regs) {
    regCount.set(r.tournament_id, (regCount.get(r.tournament_id) ?? 0) + 1);
  }

  const buckets: Record<BucketKey, TournamentRow[]> = {
    upcoming: [],
    in_progress: [],
    finished: [],
  };
  for (const t of tournaments) {
    const b = bucketOf(t.status);
    if (b) buckets[b].push(t);
  }

  const totalVisible = buckets.upcoming.length + buckets.in_progress.length + buckets.finished.length;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-tight">TORNEOS</h2>
          <p className="text-muted-foreground mt-1 text-xs uppercase tracking-widest">
            Agrupados por estado · {totalVisible} totales
          </p>
        </div>
        {isOwner && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/tournaments/new?community=${communityId}`}>
              <Plus className="size-3" />
              Crear torneo
            </Link>
          </Button>
        )}
      </div>

      {totalVisible === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Aún no hay torneos"
          description={
            isOwner
              ? 'Creá el primer torneo de la comunidad. Podés elegir Suma, categoría fija o random.'
              : 'No hay torneos activos en esta comunidad todavía.'
          }
          bullets={[
            'Formatos: Americano, Liguilla, Liga, Express, Eliminación.',
            'Por categoría fija, suma de niveles, o random.',
            'Ranking interno se actualiza al cerrar cada partido.',
          ]}
          primaryAction={
            isOwner ? (
              <Button asChild>
                <Link href={`/app/tournaments/new?community=${communityId}`}>
                  <Plus className="size-3" />
                  Crear el primer torneo
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        (Object.keys(buckets) as BucketKey[]).map((bucket) => {
          const items = buckets[bucket];
          if (items.length === 0) return null;
          return (
            <div key={bucket} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-sm uppercase tracking-widest">
                  {BUCKET_LABEL[bucket]}
                </h3>
                <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                  {items.length} · {BUCKET_DESCRIPTION[bucket]}
                </span>
              </div>
              <div className="grid gap-2">
                {items.map((t) => (
                  <TournamentCard key={t.id} t={t} registered={regCount.get(t.id) ?? 0} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

function TournamentCard({ t, registered }: { t: TournamentRow; registered: number }) {
  const isSuma = t.category_kind === 'suma' || t.category_kind === 'mixto_suma';
  return (
    <Link href={`/tournaments/${t.slug}`}>
      <Card className="hover:border-crown/40 px-4 py-3 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display truncate text-sm">{t.name}</span>
              <Badge
                variant={
                  t.status === 'open'
                    ? 'success'
                    : t.status === 'in_progress'
                      ? 'crown'
                      : 'muted'
                }
                className="text-[9px]"
              >
                {t.status}
              </Badge>
            </div>
            <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {new Date(t.starts_at).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
              <CategoryBadge kind="format" format={t.format} size="sm" />
              {isSuma && t.min_sum != null ? (
                <CategoryBadge kind="suma" minSum={t.min_sum} size="sm" />
              ) : t.category ? (
                <CategoryBadge kind="category" category={t.category} size="sm" />
              ) : null}
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {registered} / {t.max_teams}
              </span>
            </div>
          </div>
          <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Ver detalle →
          </span>
        </div>
      </Card>
    </Link>
  );
}
