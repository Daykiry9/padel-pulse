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

  const [profileRes, teamRes, communitiesRes, tournamentsRes] = await Promise.all([
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
      .select('id, name, slug, format, status, starts_at, category, category_kind, min_sum')
      .in('status', ['open', 'in_progress'])
      .order('starts_at', { ascending: true })
      .limit(5),
  ]);

  const profile = profileRes.data;
  const team = teamRes.data?.teams;
  const communities = communitiesRes.data ?? [];
  const tournaments = tournamentsRes.data ?? [];

  return (
    <div className="space-y-10">
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          Hola, {profile?.display_name}
        </p>
        <h1 className="font-display mt-1 text-4xl md:text-5xl">
          BIENVENIDO A LA{' '}
          <span className="text-crown">CORTE</span>.
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Tu categoría:{' '}
          <span className="text-foreground font-semibold">
            {profile?.skill_category ? CATEGORY_LABELS[profile.skill_category] : '—'}
          </span>
        </p>
      </div>

      {/* Mi equipo + Mis comunidades */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="text-crown size-4" />
                Mi equipo
              </CardTitle>
              {!team && (
                <Button variant="crown" size="sm" asChild>
                  <Link href="/app/teams/new">
                    <Plus className="size-4" />
                    Crear
                  </Link>
                </Button>
              )}
            </div>
            {team ? (
              <CardDescription className="text-base">
                <span className="text-foreground font-semibold">{team.name}</span>
                <span className="text-muted-foreground text-xs uppercase tracking-widest block mt-1">
                  {team.category ? CATEGORY_LABELS[team.category] : 'Mixto'} · rating{' '}
                  {team.rating}
                </span>
              </CardDescription>
            ) : (
              <CardDescription>
                Aún no tienes equipo. Crea uno para inscribirte a torneos competitivos.
              </CardDescription>
            )}
          </CardHeader>
        </Card>

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
              <CardDescription>
                No estás en ninguna comunidad aún.{' '}
                <Link href="/app/communities/new" className="text-crown underline">
                  Crea la tuya
                </Link>
                .
              </CardDescription>
            ) : (
              <CardDescription>
                {communities
                  .map((c) => c.communities?.name)
                  .filter(Boolean)
                  .join(' · ')}
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
          <div className="grid gap-3 md:grid-cols-2">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.slug}`}>
                <Card className="hover:border-crown/40 transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="crown">{t.format.replace('_', ' ')}</Badge>
                      <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                        {new Date(t.starts_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <CardTitle className="mt-2 text-base">{t.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      {t.category_kind === 'suma' || t.category_kind === 'mixto_suma'
                        ? `Suma ≥ ${t.min_sum}`
                        : t.category
                          ? CATEGORY_LABELS[t.category]
                          : 'Categoría abierta'}
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
