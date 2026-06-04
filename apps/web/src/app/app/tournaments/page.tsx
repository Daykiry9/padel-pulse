import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Globe,
  MapPin,
  Plus,
  Trophy,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/ui/category-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { formatDate, formatTime } from '@/lib/format-date';
import { getActiveCommunityId } from '@/lib/active-community';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

type CommunityMem = {
  community_id: string;
  role: string;
  communities: {
    id: string;
    name: string;
    slug: string;
    city: string;
    city_id: string | null;
  } | null;
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
  scope: string | null;
  community_id: string | null;
  city_id: string | null;
  max_teams: number;
  clubs: { name: string; city: string } | null;
  communities: { id: string; name: string; slug: string } | null;
  cities: { id: string; name: string } | null;
};

type RegistrationRow = {
  id: string;
  status: string;
  tournaments: Tournament | null;
};

const REG_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  pending_payment: 'Pago pendiente',
  confirmed: 'Confirmado',
  waitlist: 'Lista de espera',
  cancelled: 'Cancelado',
};

const REG_STATUS_VARIANT: Record<
  string,
  'success' | 'muted' | 'outline' | 'crown'
> = {
  pending: 'outline',
  pending_payment: 'outline',
  confirmed: 'success',
  waitlist: 'crown',
  cancelled: 'muted',
};

const TOURNEY_STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  open: 'Inscripciones',
  in_progress: 'En curso',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const TOURNEY_STATUS_VARIANT: Record<
  string,
  'success' | 'muted' | 'outline' | 'crown' | 'live'
> = {
  draft: 'muted',
  open: 'success',
  in_progress: 'live',
  finished: 'outline',
  cancelled: 'muted',
};

export default async function TournamentsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ showClub?: string }>;
}) {
  const { showClub } = await searchParams;
  const showClubOpen = showClub === '1';

  const user = await getSession();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();

  const { data: myCommunitiesData } = await supabase
    .from('community_members')
    .select('community_id, role, communities(id, name, slug, city, city_id)')
    .eq('profile_id', user.id);

  const myCommunities = (myCommunitiesData ?? []) as unknown as CommunityMem[];

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
  const myCityIds = Array.from(
    new Set(
      myCommunities
        .map((c) => c.communities?.city_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const isOwnerOfAny = myCommunities.some((c) => c.role === 'owner');
  const activeCommunityId = await getActiveCommunityId(supabase, user.id);

  const tournamentSelect =
    'id, name, slug, format, status, starts_at, category, category_kind, min_sum, tier, scope, community_id, city_id, max_teams, clubs(name, city), communities(id, name, slug), cities(id, name)';

  const [registrationsRes, communityTournamentsRes, clubOpenRes] =
    await Promise.all([
      supabase
        .from('tournament_registrations')
        .select(`id, status, tournaments(${tournamentSelect})`)
        .or(
          `player_id.eq.${user.id},player_one_id.eq.${user.id},player_two_id.eq.${user.id}`,
        ),
      supabase
        .from('tournaments')
        .select(tournamentSelect)
        .in('community_id', myCommunityIds)
        .order('starts_at', { ascending: true }),
      showClubOpen
        ? myCityIds.length > 0
          ? supabase
              .from('tournaments')
              .select(tournamentSelect)
              .eq('scope', 'club_open')
              .or(
                `city_id.in.(${myCityIds.join(',')}),city_id.is.null`,
              )
              .order('starts_at', { ascending: true })
          : supabase
              .from('tournaments')
              .select(tournamentSelect)
              .eq('scope', 'club_open')
              .is('city_id', null)
              .order('starts_at', { ascending: true })
        : Promise.resolve({ data: [] as Tournament[] }),
    ]);

  const registrations = (registrationsRes.data ?? []) as unknown as RegistrationRow[];
  const communityTournaments = (communityTournamentsRes.data ?? []) as unknown as Tournament[];
  const clubOpenTournaments = (clubOpenRes.data ?? []) as unknown as Tournament[];

  const myRegistrations = registrations
    .filter((r) => r.tournaments)
    .sort(
      (a, b) =>
        new Date(a.tournaments!.starts_at).getTime() -
        new Date(b.tournaments!.starts_at).getTime(),
    );

  // Agrupar mis inscripciones por bucket lógico:
  //  - activas: status registración pending/pending_payment/confirmed/waitlist y torneo no finalizado/cancelado
  //  - finalizadas/canceladas: el resto
  const activeRegs: RegistrationRow[] = [];
  const archivedRegs: RegistrationRow[] = [];
  for (const r of myRegistrations) {
    const t = r.tournaments!;
    const isArchived =
      r.status === 'cancelled' ||
      t.status === 'finished' ||
      t.status === 'cancelled';
    if (isArchived) archivedRegs.push(r);
    else activeRegs.push(r);
  }

  // Agrupar torneos de comunidad por comunidad si el usuario es miembro de >1.
  const grouped = new Map<
    string,
    { name: string; slug: string; tournaments: Tournament[] }
  >();
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

  // Ordenar grupos: comunidad activa primero, luego alfabético.
  const groupedEntries = Array.from(grouped.entries()).sort(([aId], [bId]) => {
    if (aId === activeCommunityId) return -1;
    if (bId === activeCommunityId) return 1;
    return grouped.get(aId)!.name.localeCompare(grouped.get(bId)!.name);
  });

  const showGrouped = myCommunities.length > 1 && grouped.size > 1;

  const bothEmpty =
    myRegistrations.length === 0 && communityTournaments.length === 0;

  if (bothEmpty && !showClubOpen) {
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
          secondaryAction={
            <Button variant="outline" asChild>
              <Link href="/app/tournaments?showClub=1">
                <MapPin className="size-4" />
                Ver torneos del club en tu ciudad
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Header />

      {/* === 1) Mis inscripciones === */}
      <Section
        title="Mis inscripciones"
        subtitle={
          activeRegs.length > 0
            ? `${activeRegs.length} ${activeRegs.length === 1 ? 'torneo activo' : 'torneos activos'}`
            : 'Todavía no estás dentro de ningún torneo activo'
        }
      >
        {activeRegs.length === 0 && archivedRegs.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Sin inscripciones todavía"
            description="Cuando te inscribas a un torneo aparecerá aquí con su estado y fecha."
            primaryAction={
              <Button variant="outline" asChild>
                <Link href="#community-tournaments">
                  <ArrowRight className="size-4" />
                  Ver torneos de mi comunidad
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {activeRegs.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {activeRegs.map((r) => (
                  <RegistrationCard key={r.id} registration={r} />
                ))}
              </div>
            )}

            {archivedRegs.length > 0 && (
              <details className="group">
                <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] uppercase tracking-widest transition-colors">
                  Mostrar finalizados / cancelados ({archivedRegs.length})
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2 opacity-75">
                  {archivedRegs.map((r) => (
                    <RegistrationCard key={r.id} registration={r} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </Section>

      {/* === 2) De mi comunidad === */}
      <Section
        title="De mi comunidad"
        subtitle={
          communityTournaments.length === 0
            ? 'Aún no hay torneos publicados en tus comunidades'
            : showGrouped
              ? `${communityTournaments.length} torneos en ${grouped.size} comunidades`
              : `${communityTournaments.length} ${communityTournaments.length === 1 ? 'torneo' : 'torneos'}`
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
        <div id="community-tournaments" />
        {communityTournaments.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Tu comunidad no ha publicado torneos"
            description={
              isOwnerOfAny
                ? 'Crea el primero y empieza a sumar puntos.'
                : 'Cuando un organizador publique uno, lo verás aquí.'
            }
            primaryAction={
              isOwnerOfAny ? (
                <Button variant="crown" asChild>
                  <Link href="/app/tournaments/new">
                    <Plus className="size-4" />
                    Crear torneo
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : showGrouped ? (
          <div className="space-y-8">
            {groupedEntries.map(([id, group]) => (
              <div key={id} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-muted-foreground text-[11px] uppercase tracking-[0.15em]">
                    {group.name}
                    {id === activeCommunityId && (
                      <span className="text-crown ml-2 normal-case tracking-normal">
                        · activa
                      </span>
                    )}
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

      {/* === 3) Del club (toggle por query param) === */}
      <Section
        title="Del club"
        subtitle={
          showClubOpen
            ? `Torneos abiertos de clubes en tu ciudad${
                clubOpenTournaments.length > 0
                  ? ` · ${clubOpenTournaments.length}`
                  : ''
              }`
            : 'Descubre torneos abiertos de clubes en tu ciudad'
        }
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={
                showClubOpen ? '/app/tournaments' : '/app/tournaments?showClub=1'
              }
            >
              {showClubOpen ? 'Ocultar' : 'Mostrar'}
            </Link>
          </Button>
        }
      >
        {!showClubOpen ? (
          <p className="text-muted-foreground text-xs">
            Activa esta sección para ver torneos abiertos al público en{' '}
            {myCityIds.length > 0
              ? 'la ciudad de tus comunidades'
              : 'todas las ciudades'}
            .
          </p>
        ) : clubOpenTournaments.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No hay torneos abiertos por ahora"
            description="Cuando un club publique un torneo abierto en tu ciudad, aparecerá aquí."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {clubOpenTournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} variant="club_open" />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Badge variant="crown">Torneos</Badge>
        <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
          TORNEOS
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          Tus inscripciones, los torneos de tu comunidad y los torneos abiertos
          de la ciudad.
        </p>
      </div>
    </header>
  );
}

function tournamentHref(t: Tournament): string {
  if (t.scope === 'community' && t.communities) {
    return `/app/communities/${t.communities.slug}/tournaments/${t.slug}`;
  }
  return `/tournaments/${t.slug}`;
}

function TournamentBadges({ t }: { t: Tournament }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <CategoryBadge
        kind="tier"
        tier={t.tier as 'competitivo' | 'casual'}
        size="sm"
      />
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
  );
}

function TournamentMeta({ t }: { t: Tournament }) {
  return (
    <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums">
      <span className="flex items-center gap-1">
        <Calendar className="size-3" />
        {formatDate(t.starts_at, {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        })}
        {' · '}
        {formatTime(t.starts_at)}
      </span>
      <span className="flex items-center gap-1">
        <Users className="size-3" />
        {t.max_teams} cupos
      </span>
      {t.communities && (
        <span className="flex items-center gap-1">
          <Globe className="size-3" />
          {t.communities.name}
        </span>
      )}
    </div>
  );
}

function TournamentFooter({ t }: { t: Tournament }) {
  const venueLabel = t.clubs?.name ?? t.cities?.name ?? null;
  return (
    <div className="border-border/40 mt-3 flex items-center justify-between border-t pt-3">
      {venueLabel ? (
        <span className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase tracking-widest">
          <MapPin className="size-3" />
          {venueLabel}
        </span>
      ) : (
        <span />
      )}
      <ArrowRight className="text-muted-foreground group-hover:text-foreground size-3.5 transition-colors" />
    </div>
  );
}

function RegistrationCard({ registration }: { registration: RegistrationRow }) {
  const t = registration.tournaments!;
  const regLabel =
    REG_STATUS_LABEL[registration.status] ?? registration.status;
  const regVariant = REG_STATUS_VARIANT[registration.status] ?? 'outline';
  const tStatusLabel = TOURNEY_STATUS_LABEL[t.status] ?? t.status;
  const tStatusVariant = TOURNEY_STATUS_VARIANT[t.status] ?? 'outline';

  return (
    <Link
      href={tournamentHref(t)}
      className="focus-card border-border bg-card hover:border-foreground/30 group relative overflow-hidden rounded-xl border p-4 transition-[border-color,background-color] duration-[var(--duration-base)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <TournamentBadges t={t} />
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={tStatusVariant} className="text-[9px]">
            {tStatusLabel}
          </Badge>
          <Badge variant={regVariant} className="text-[9px]">
            {regLabel}
          </Badge>
        </div>
      </div>

      <h3 className="font-display mt-3 line-clamp-2 text-base tracking-tight">
        {t.name}
      </h3>

      <TournamentMeta t={t} />
      <TournamentFooter t={t} />
    </Link>
  );
}

function TournamentCard({
  tournament,
  variant,
}: {
  tournament: Tournament;
  variant?: 'community' | 'club_open';
}) {
  const tStatusLabel = TOURNEY_STATUS_LABEL[tournament.status] ?? tournament.status;
  const tStatusVariant =
    TOURNEY_STATUS_VARIANT[tournament.status] ?? 'outline';

  return (
    <Link
      href={tournamentHref(tournament)}
      className="focus-card border-border bg-card hover:border-foreground/30 group relative overflow-hidden rounded-xl border p-4 transition-[border-color,background-color] duration-[var(--duration-base)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <TournamentBadges t={tournament} />
        <div className="flex flex-wrap items-center gap-1.5">
          {variant === 'club_open' && (
            <Badge variant="data" className="text-[9px]">
              Abierto
            </Badge>
          )}
          <Badge variant={tStatusVariant} className="text-[9px]">
            {tStatusLabel}
          </Badge>
        </div>
      </div>

      <h3 className="font-display mt-3 line-clamp-2 text-base tracking-tight">
        {tournament.name}
      </h3>

      <TournamentMeta t={tournament} />
      <TournamentFooter t={tournament} />
    </Link>
  );
}

export const dynamic = 'force-dynamic';
