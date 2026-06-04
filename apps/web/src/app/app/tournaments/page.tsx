import Link from 'next/link';
import { ArrowRight, Calendar, Globe, MapPin, Plus, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryBadge } from '@/components/ui/category-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { formatDate, formatTime } from '@/lib/format-date';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

type CommunityMem = {
  community_id: string;
  role: string;
  communities: { id: string; name: string; slug: string; city: string } | null;
};

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
  community_id: string | null;
  clubs: { name: string; city: string } | null;
  communities: { id: string; name: string; slug: string } | null;
};

type RegistrationRow = {
  id: string;
  status: string;
  tournaments: Tournament | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  waitlist: 'Lista de espera',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'success' | 'muted' | 'outline' | 'crown'> = {
  pending: 'outline',
  confirmed: 'success',
  waitlist: 'crown',
  cancelled: 'muted',
};

export default async function TournamentsInboxPage() {
  const user = await getSession();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();

  const { data: myCommunitiesData } = await supabase
    .from('community_members')
    .select('community_id, role, communities(id, name, slug, city)')
    .eq('profile_id', user.id);

  const myCommunities = (myCommunitiesData ?? []) as unknown as CommunityMem[];

  // Sin comunidades: empty state que invita a unirse.
  if (myCommunities.length === 0) {
    return (
      <div className="space-y-10">
        <Header />
        <EmptyState
          icon={Globe}
          title="Únete a una comunidad primero"
          description="Los torneos viven dentro de comunidades. Únete a una o crea la tuya para ver y organizar torneos."
          bullets={[
            'Verás los torneos de tu comunidad en este inbox',
            'Inscríbete con un tap y sigue tu pareja o ad-hoc',
            'Si eres organizador, abrís torneos para tus miembros',
          ]}
          primaryAction={
            <Button variant="crown" asChild>
              <Link href="/app/communities">
                <Globe className="size-4" />
                Explorar comunidades
              </Link>
            </Button>
          }
          secondaryAction={
            <Button variant="outline" asChild>
              <Link href="/app/communities/new">
                <Plus className="size-4" />
                Crear comunidad
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const myCommunityIds = myCommunities
    .map((c) => c.communities?.id)
    .filter((id): id is string => Boolean(id));
  const isOwnerOfAny = myCommunities.some((c) => c.role === 'owner');

  const [communityTournamentsRes, registrationsRes] = await Promise.all([
    supabase
      .from('tournaments')
      .select(
        'id, name, slug, format, status, starts_at, category, category_kind, min_sum, tier, community_id, clubs(name, city), communities(id, name, slug)',
      )
      .in('community_id', myCommunityIds)
      .order('starts_at', { ascending: true }),
    supabase
      .from('tournament_registrations')
      .select(
        'id, status, tournaments(id, name, slug, format, status, starts_at, category, category_kind, min_sum, tier, community_id, clubs(name, city), communities(id, name, slug))',
      )
      .or(`player_id.eq.${user.id},player_one_id.eq.${user.id},player_two_id.eq.${user.id}`),
  ]);

  const communityTournaments = (communityTournamentsRes.data ?? []) as unknown as Tournament[];
  const registrations = (registrationsRes.data ?? []) as unknown as RegistrationRow[];

  // Filtramos registrations huérfanas (tournament eliminado) y ordenamos por fecha.
  const myRegistrations = registrations
    .filter((r) => r.tournaments)
    .sort(
      (a, b) =>
        new Date(a.tournaments!.starts_at).getTime() -
        new Date(b.tournaments!.starts_at).getTime(),
    );

  const bothEmpty = myRegistrations.length === 0 && communityTournaments.length === 0;

  if (bothEmpty) {
    return (
      <div className="space-y-10">
        <Header />
        <EmptyState
          icon={Trophy}
          title="Aún no hay torneos en tus comunidades"
          description={
            isOwnerOfAny
              ? 'Eres owner de al menos una comunidad. Crea el primer torneo y empieza a sumar puntos.'
              : 'Cuando un organizador publique un torneo en tus comunidades, lo verás aquí.'
          }
          primaryAction={
            isOwnerOfAny ? (
              <Button variant="crown" asChild>
                <Link href="/app/tournaments/new">
                  <Plus className="size-4" />
                  Crear torneo
                </Link>
              </Button>
            ) : (
              <Button variant="crown" asChild>
                <Link href="/app/communities">
                  <Globe className="size-4" />
                  Explorar comunidades
                </Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  // Agrupar torneos de comunidad por comunidad si el usuario es miembro de >1.
  const grouped = new Map<string, { name: string; slug: string; tournaments: Tournament[] }>();
  for (const t of communityTournaments) {
    if (!t.communities) continue;
    const key = t.communities.id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: t.communities.name,
        slug: t.communities.slug,
        tournaments: [],
      });
    }
    grouped.get(key)!.tournaments.push(t);
  }

  const showGrouped = myCommunities.length > 1 && grouped.size > 1;

  return (
    <div className="space-y-10">
      <Header />

      {myRegistrations.length > 0 && (
        <Section
          title="Mis inscripciones"
          subtitle={`${myRegistrations.length} ${myRegistrations.length === 1 ? 'torneo' : 'torneos'} en los que estás dentro`}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {myRegistrations.map((r) => (
              <RegistrationCard key={r.id} registration={r} />
            ))}
          </div>
        </Section>
      )}

      {communityTournaments.length > 0 && (
        <Section
          title="De mi comunidad"
          subtitle={
            showGrouped
              ? `${communityTournaments.length} torneos en ${grouped.size} comunidades`
              : `${communityTournaments.length} torneos abiertos o en curso`
          }
          action={
            isOwnerOfAny && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/tournaments/new">
                  <Plus className="size-3" />
                  Crear torneo
                </Link>
              </Button>
            )
          }
        >
          {showGrouped ? (
            <div className="space-y-8">
              {Array.from(grouped.entries()).map(([id, group]) => (
                <div key={id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-muted-foreground text-[11px] uppercase tracking-[0.15em]">
                      {group.name}
                    </h3>
                    <Link
                      href={`/app/communities/${group.slug}`}
                      className="text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-widest transition-colors"
                    >
                      Ver comunidad →
                    </Link>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.tournaments.map((t) => (
                      <TournamentCard key={t.id} tournament={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {communityTournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Badge variant="crown">Torneos</Badge>
        <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">TORNEOS</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          Tus inscripciones y los torneos abiertos en tus comunidades.
        </p>
      </div>
    </header>
  );
}

function RegistrationCard({ registration }: { registration: RegistrationRow }) {
  const t = registration.tournaments!;
  const statusLabel = STATUS_LABEL[registration.status] ?? registration.status;
  const statusVariant = STATUS_VARIANT[registration.status] ?? 'outline';

  return (
    <Link
      href={`/tournaments/${t.slug}`}
      className="focus-card border-border bg-card hover:border-foreground/30 group relative overflow-hidden rounded-xl border p-4 transition-[border-color,background-color] duration-[var(--duration-base)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge kind="tier" tier={t.tier as 'competitivo' | 'casual'} size="sm" />
          {t.category_kind.includes('suma') ? (
            <CategoryBadge
              kind="suma"
              minSum={t.min_sum ?? 0}
              variant={
                t.category_kind === 'queens_suma'
                  ? 'queens'
                  : t.category_kind === 'mixto_suma'
                    ? 'mixto'
                    : 'kings'
              }
              size="sm"
            />
          ) : t.category ? (
            <CategoryBadge kind="category" category={t.category} size="sm" />
          ) : null}
        </div>
        <Badge variant={statusVariant} className="text-[9px]">
          {statusLabel}
        </Badge>
      </div>

      <h3 className="font-display mt-3 line-clamp-2 text-base tracking-tight">{t.name}</h3>

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums">
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {formatDate(t.starts_at, { weekday: 'short', day: '2-digit', month: 'short' })}
          {' · '}
          {formatTime(t.starts_at)}
        </span>
        {t.communities && (
          <span className="flex items-center gap-1">
            <Globe className="size-3" />
            {t.communities.name}
          </span>
        )}
      </div>

      <div className="border-border/40 mt-3 flex items-center justify-between border-t pt-3">
        {t.clubs ? (
          <span className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase tracking-widest">
            <MapPin className="size-3" />
            {t.clubs.name}
          </span>
        ) : (
          <span />
        )}
        <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3.5 transition-colors" />
      </div>
    </Link>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  return (
    <Link
      href={`/tournaments/${tournament.slug}`}
      className="focus-card border-border bg-card hover:border-foreground/30 group relative overflow-hidden rounded-xl border p-4 transition-[border-color,background-color] duration-[var(--duration-base)]"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <CategoryBadge kind="tier" tier={tournament.tier as 'competitivo' | 'casual'} size="sm" />
        {tournament.category_kind.includes('suma') ? (
          <CategoryBadge
            kind="suma"
            minSum={tournament.min_sum ?? 0}
            variant={
              tournament.category_kind === 'queens_suma'
                ? 'queens'
                : tournament.category_kind === 'mixto_suma'
                  ? 'mixto'
                  : 'kings'
            }
            size="sm"
          />
        ) : tournament.category ? (
          <CategoryBadge kind="category" category={tournament.category} size="sm" />
        ) : null}
        {tournament.status === 'in_progress' && (
          <Badge variant="live" className="text-[9px]">
            EN CURSO
          </Badge>
        )}
      </div>

      <h3 className="font-display mt-3 line-clamp-2 text-base tracking-tight">{tournament.name}</h3>

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums">
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {formatDate(tournament.starts_at, { weekday: 'short', day: '2-digit', month: 'short' })}
          {' · '}
          {formatTime(tournament.starts_at)}
        </span>
      </div>

      <div className="border-border/40 mt-3 flex items-center justify-between border-t pt-3">
        {tournament.clubs ? (
          <span className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase tracking-widest">
            <MapPin className="size-3" />
            {tournament.clubs.name}
          </span>
        ) : (
          <span />
        )}
        <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3.5 transition-colors" />
      </div>
    </Link>
  );
}

export const dynamic = 'force-dynamic';
