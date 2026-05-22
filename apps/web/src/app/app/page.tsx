import Link from 'next/link';
import { ArrowRight, Crown, Globe, Plus, Trophy, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

const CATEGORY_LABELS: Record<string, string> = {
  libre: 'Libre / Pro',
  primera: '1ra',
  segunda: '2da',
  tercera: '3ra',
  cuarta: '4ta',
  quinta: '5ta',
  sexta: '6ta',
  septima: '7ma',
  queens_libre: 'Queens Libre',
  queens_a: 'Queens A',
  queens_b: 'Queens B',
  queens_c: 'Queens C',
  queens_d: 'Queens D',
  queens_e: 'Queens E',
};

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();

  const [profileRes, teamRes, communitiesRes, tournamentsRes, rankingRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('community_members')
      .select('community_id, communities(name, slug, city)')
      .eq('profile_id', user.id),
    supabase
      .from('tournaments')
      .select('id, name, slug, format, status, starts_at, category, category_kind, min_sum, tier')
      .in('status', ['open', 'in_progress'])
      .order('starts_at', { ascending: true })
      .limit(6),
    supabase
      .from('player_ranking_consolidated')
      .select('total_points, tournaments_played, raw_tier1_points, raw_tier2_points')
      .eq('profile_id', user.id)
      .maybeSingle(),
  ]);

  type Profile = { display_name: string; skill_category: string | null };
  type Team = { id: string; name: string; category: string | null; rating: number; slug: string };
  type CommunityMem = { community_id: string; communities: { name: string; slug: string; city: string } | null };
  type Tournament = {
    id: string;
    name: string;
    slug: string;
    format: string;
    status: string;
    starts_at: string;
    category: string | null;
    category_kind: string;
    min_sum: number | null;
    tier: string;
  };
  type Ranking = {
    total_points: number;
    tournaments_played: number;
    raw_tier1_points: number;
    raw_tier2_points: number;
  };

  const profile = profileRes.data as unknown as Profile | null;
  const teamRow = teamRes.data as unknown as { teams: Team | null } | null;
  const team = teamRow?.teams ?? null;
  const communities = (communitiesRes.data ?? []) as unknown as CommunityMem[];
  const tournaments = (tournamentsRes.data ?? []) as unknown as Tournament[];
  const ranking = rankingRes.data as unknown as Ranking | null;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          Hola, {profile?.display_name}
        </p>
        <h1 className="font-display mt-1 text-4xl md:text-5xl">
          BIENVENIDO A LA <span className="text-crown">CORTE</span>.
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Tu categoría:{' '}
          <span className="text-foreground font-semibold">
            {profile?.skill_category ? CATEGORY_LABELS[profile.skill_category] : '—'}
          </span>
        </p>
      </div>

      {/* Ranking personal — el principal */}
      <Card className="border-crown/30 bg-gradient-to-br from-crown/[0.06] to-transparent p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="bg-crown/15 text-crown flex size-14 items-center justify-center rounded-xl">
              <Crown className="size-7" />
            </div>
            <div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Tu ranking personal
              </div>
              <div className="font-display mt-1 text-4xl tracking-tight">
                {(ranking?.total_points ?? 0).toLocaleString('es-CO')}{' '}
                <span className="text-muted-foreground text-base normal-case">pts</span>
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {ranking?.tournaments_played ?? 0} torneos en últimos 12 meses
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Stat
              label="Tier 1 (oficiales)"
              value={ranking?.raw_tier1_points ?? 0}
              accent="text-crown"
            />
            <Stat
              label="Tier 2 (casuales)"
              value={ranking?.raw_tier2_points ?? 0}
              accent="text-data"
            />
          </div>
        </div>
      </Card>

      {/* Comunidades + equipo (opcional) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="text-crown size-4" />
                Mis comunidades
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/app/communities">Ver todas</Link>
              </Button>
            </div>
            {communities.length === 0 ? (
              <CardDescription className="normal-case">
                No estás en ninguna comunidad aún.{' '}
                <Link href="/app/communities/new" className="text-crown underline">
                  Crea la tuya
                </Link>
                .
              </CardDescription>
            ) : (
              <CardDescription className="normal-case">
                {communities
                  .map((c) => c.communities?.name)
                  .filter(Boolean)
                  .join(' · ')}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="text-crown size-4" />
                Pareja estable
                <Badge variant="muted" className="text-[9px] ml-1">
                  Opcional
                </Badge>
              </CardTitle>
              {!team && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/app/teams/new">
                    <Plus className="size-3" />
                    Registrar
                  </Link>
                </Button>
              )}
            </div>
            {team ? (
              <CardDescription className="text-base normal-case">
                <span className="text-foreground font-semibold">{team.name}</span>
                <span className="text-muted-foreground mt-1 block text-xs uppercase tracking-widest">
                  {team.category ? CATEGORY_LABELS[team.category] : 'Mixto'} · rating {team.rating}
                </span>
              </CardDescription>
            ) : (
              <CardDescription className="normal-case">
                Para torneos puedes inscribirte con compañero ad-hoc cada vez. Si juegas siempre
                con la misma persona, registren su pareja para tener ranking de equipo.
              </CardDescription>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Torneos abiertos */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl tracking-tight md:text-3xl">
              TORNEOS <span className="text-crown">ABIERTOS</span>
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Los más próximos. Filtros completos en{' '}
              <Link href="/tournaments" className="text-crown underline">
                /tournaments
              </Link>
              .
            </p>
          </div>
          <Button variant="crown" size="sm" asChild>
            <Link href="/app/tournaments/new">
              <Plus className="size-4" />
              Crear torneo
            </Link>
          </Button>
        </div>

        {tournaments.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="text-muted-foreground mx-auto size-8" />
            <p className="text-muted-foreground mt-3 text-sm">
              No hay torneos abiertos en este momento.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.slug}`}>
                <Card className="hover:border-crown/40 h-full transition-[border-color,background-color] hover:border-foreground/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={t.tier === 'competitivo' ? 'crown' : 'data'}>
                        {t.format.replace('_', ' ')}
                      </Badge>
                      <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                        {new Date(t.starts_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <CardTitle className="mt-2 text-base">{t.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 normal-case text-xs">
                      {t.category_kind === 'suma' ||
                      t.category_kind === 'mixto_suma' ||
                      t.category_kind === 'queens_suma'
                        ? `Suma ≥ ${t.min_sum}`
                        : t.category
                          ? (CATEGORY_LABELS[t.category] ?? t.category)
                          : 'Casual'}
                      <ArrowRight className="size-3" />
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Crown className="text-crown/10 fixed bottom-8 right-8 -z-10 size-32" />
    </div>
  );
}

function Stat({
  label,
  value,
  accent = 'text-foreground',
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="text-right">
      <div className="text-muted-foreground text-[9px] uppercase tracking-widest">{label}</div>
      <div className={`font-display text-2xl tracking-tight ${accent}`}>
        {value.toLocaleString('es-CO')}
      </div>
    </div>
  );
}
