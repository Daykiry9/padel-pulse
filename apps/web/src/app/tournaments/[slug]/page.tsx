import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Crown, Trophy } from 'lucide-react';

import type { Gender, TeamCategory } from '@padelking/domain';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { KingLogo } from '@/components/marketing/king-logo';
import { ManualPlayerForm } from '@/components/manual-player-form';
import { RemoveRegistrationButton } from '@/components/remove-registration-button';
import { ShareInviteButton } from '@/components/share-invite-button';
import { SharePodiumButton } from '@/components/share-podium-button';
import { ShareStoryButton } from '@/components/share-story-button';
import { TournamentChat, type ChatMessage } from '@/components/tournament-chat';
import { formatShort } from '@/lib/format-date';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { GenerateBracketButton } from '@/app/app/tournaments/[slug]/manage/generate-bracket-button';
import { TOURNAMENT_STATUS } from '@/lib/tournament-status';
import { TournamentRegistrationCard } from '@/components/tournament-registration-card';

// Titulo y descripcion del preview al compartir el link (la imagen sale de
// opengraph-image.tsx). Antes todos los torneos heredaban el texto del home.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('tournaments')
    .select('id, name, status, starts_at, max_teams, price_per_team')
    .eq('slug', slug)
    .single();
  const t = data as {
    id: string;
    name: string;
    status: string;
    starts_at: string;
    max_teams: number;
    price_per_team: number;
  } | null;
  if (!t) return {};
  const { count } = await supabase
    .from('tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', t.id);
  const left = Math.max(0, t.max_teams - (count ?? 0));
  const description = [
    formatShort(t.starts_at),
    t.status === 'in_progress'
      ? 'En vivo ahora'
      : t.status === 'finished'
        ? 'Finalizado'
        : left === 0
          ? 'Cupo completo'
          : left === 1
            ? '¡Queda 1 cupo!'
            : `Quedan ${left} cupos`,
    t.price_per_team > 0 ? `$${t.price_per_team.toLocaleString('es-CO')} COP` : 'Gratis',
  ].join(' · ');
  return {
    title: t.name,
    description,
    openGraph: { title: t.name, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: t.name, description },
  };
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();

  type TournamentRow = {
    id: string;
    slug: string;
    name: string;
    format: string;
    status: string;
    tier: string;
    starts_at: string;
    ends_at: string;
    category_kind: string;
    category: TeamCategory | null;
    min_sum: number | null;
    max_player_category_value: number | null;
    competition_unit: string;
    pairing_mode: string | null;
    max_teams: number;
    price_per_team: number;
    description: string | null;
  };

  const tournamentRes = await supabase
    .from('tournaments')
    .select('*, clubs(owner_id), communities(owner_id, slug)')
    .eq('slug', slug)
    .single();

  const tournament = tournamentRes.data as unknown as (TournamentRow & {
    club_id: string | null;
    scope: 'community' | 'club_open' | 'club_private' | null;
    clubs: { owner_id: string } | null;
    communities: { owner_id: string; slug: string } | null;
  }) | null;
  if (!tournament) notFound();

  const user = await getSession();

  // Si el torneo es scope=community, su detalle vive bajo el hub de la comunidad
  // (gate por membresía / privacy), y alla se manda a quien tenga sesion.
  //
  // El `user &&` es la parte importante: antes el redirect era incondicional y
  // la ruta de destino esta protegida, asi que un visitante anonimo terminaba
  // en /login. La lista publica de /tournaments enlaza aca y anuncia
  // "INSCRIBIRME" en cada card, asi que el link prometia un torneo y entregaba
  // un muro de login. Una tester lo reporto como "no veo donde hptas me
  // inscribo a un torneo" — y no habia donde, el detalle nunca se renderizaba.
  //
  // Sin sesion se queda en esta ruta publica, que ya sabe renderizarse sin
  // usuario (la tarjeta de inscripcion muestra "Inicia sesion para inscribirte").
  if (user && tournament.scope === 'community' && tournament.communities?.slug) {
    redirect(`/app/communities/${tournament.communities.slug}/tournaments/${tournament.slug}`);
  }
  const isOrganizer = Boolean(
    user &&
      (tournament.clubs?.owner_id === user.id || tournament.communities?.owner_id === user.id),
  );
  const myTeams: { id: string; name: string; category: TeamCategory | null; eligibility: { ok: boolean; reason?: string } }[] = [];
  let myProfile: { skillCategory: TeamCategory | null; gender: Gender | null; eligibility: { ok: boolean; reason?: string } } | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('skill_category, gender')
      .eq('id', user.id)
      .maybeSingle();

    // Categoría es OPCIONAL: cualquier usuario autenticado puede inscribirse,
    // aunque todavía no tenga fila en profiles (ej. recién hizo Google OAuth y
    // no pasó por /onboarding).
    myProfile = {
      skillCategory: (profile?.skill_category as TeamCategory | null) ?? null,
      gender: (profile?.gender as Gender | null) ?? null,
      eligibility: { ok: true },
    };

    type MyTeamMembership = {
      team_id: string;
      teams: { id: string; name: string; category: TeamCategory | null } | null;
    };

    const memsRes = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, category)')
      .eq('profile_id', user.id)
      .eq('is_active', true);
    const myMems = (memsRes.data ?? []) as unknown as MyTeamMembership[];

    for (const m of myMems) {
      if (!m.teams) continue;
      // Categoría opcional: cualquier equipo con 2 miembros activos califica.
      const membersRes = await supabase
        .from('team_members')
        .select('profile_id')
        .eq('team_id', m.team_id)
        .eq('is_active', true)
        .limit(2);
      const members = (membersRes.data ?? []) as { profile_id: string }[];
      if (members.length !== 2) continue;

      myTeams.push({
        id: m.teams.id,
        name: m.teams.name,
        category: m.teams.category as TeamCategory | null,
        eligibility: { ok: true },
      });
    }
  }

  type RegistrationRow = {
    id: string;
    status: string;
    team_id: string | null;
    player_id: string | null;
    player_one_id: string | null;
    player_two_id: string | null;
    guest_player_id: string | null;
    guest_player_one_id: string | null;
    guest_player_two_id: string | null;
    teams: { name: string } | null;
  };

  const regsRes = await supabase
    .from('tournament_registrations')
    .select(
      'id, status, team_id, player_id, player_one_id, player_two_id, guest_player_id, guest_player_one_id, guest_player_two_id, teams(name)',
    )
    .eq('tournament_id', tournament.id);
  const registrations = (regsRes.data ?? []) as unknown as RegistrationRow[];

  // ¿El user es participante del torneo? → desbloquea el chat
  type RegFlat = {
    player_id: string | null;
    player_one_id: string | null;
    player_two_id: string | null;
  };
  const userIsParticipant =
    !!user &&
    (registrations as unknown as RegFlat[]).some(
      (r) =>
        r.player_id === user.id ||
        r.player_one_id === user.id ||
        r.player_two_id === user.id,
    );
  const canChat = userIsParticipant || isOrganizer;

  // Nombres de jugadores individuales / ad-hoc para mostrar en INSCRITOS.
  const playerIdsForLabels = [
    ...new Set(
      registrations
        .flatMap((r) => [r.player_id, r.player_one_id, r.player_two_id])
        .filter(Boolean) as string[],
    ),
  ];
  const registrationNameMap = new Map<string, string>();
  if (playerIdsForLabels.length) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const sbView = supabase as any;
    const { data: profs } = await sbView
      .from('profiles_public')
      .select('id, display_name')
      .in('id', playerIdsForLabels);
    for (const p of (profs ?? []) as { id: string; display_name: string }[]) {
      registrationNameMap.set(p.id, p.display_name);
    }
  }

  // Nombres de invitados (guests) — lookup batched a guest_players.
  const guestIdsForLabels = [
    ...new Set(
      registrations
        .flatMap((r) => [r.guest_player_id, r.guest_player_one_id, r.guest_player_two_id])
        .filter(Boolean) as string[],
    ),
  ];
  const guestNameMap = new Map<string, string>();
  if (guestIdsForLabels.length) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const sbGuests = supabase as any;
    const { data: guests } = await sbGuests
      .from('guest_players')
      .select('id, display_name')
      .in('id', guestIdsForLabels);
    for (const g of (guests ?? []) as { id: string; display_name: string }[]) {
      guestNameMap.set(g.id, g.display_name);
    }
  }

  const labelForSlot = (
    profileId: string | null,
    guestId: string | null,
  ): string => {
    if (profileId) return registrationNameMap.get(profileId) ?? '?';
    if (guestId) {
      return guestNameMap.get(guestId) ?? '?';
    }
    return '?';
  };

  const registrationLabel = (r: RegistrationRow): string => {
    if (r.teams?.name) return r.teams.name;
    if (
      r.player_one_id ||
      r.player_two_id ||
      r.guest_player_one_id ||
      r.guest_player_two_id
    ) {
      const one = labelForSlot(r.player_one_id, r.guest_player_one_id);
      const two = labelForSlot(r.player_two_id, r.guest_player_two_id);
      return `${one} / ${two}`;
    }
    if (r.player_id) return registrationNameMap.get(r.player_id) ?? '?';
    if (r.guest_player_id) {
      return guestNameMap.get(r.guest_player_id) ?? '?';
    }
    return 'Inscripción';
  };

  // Fetch initial chat messages si tiene acceso
  let initialChatMessages: ChatMessage[] = [];
  if (canChat) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const sb = supabase as any;
    type RawChatRow = {
      id: string;
      body: string;
      created_at: string;
      profile_id: string;
    };
    const { data: chatData } = await sb
      .from('chat_messages')
      .select('id, body, created_at, profile_id')
      .eq('target_kind', 'tournament')
      .eq('target_id', tournament.id)
      .order('created_at', { ascending: true })
      .limit(50);
    const rawChats = (chatData ?? []) as RawChatRow[];

    // C1: profile display_name de los autores ahora se trae de profiles_public
    // (la tabla profiles ya no es public read). Cast hasta regenerar types.
    const authorIds = Array.from(new Set(rawChats.map((c) => c.profile_id)));
    const nameMap = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: authors } = await sb
        .from('profiles_public')
        .select('id, display_name')
        .in('id', authorIds);
      for (const a of (authors ?? []) as { id: string; display_name: string }[]) {
        nameMap.set(a.id, a.display_name);
      }
    }

    initialChatMessages = rawChats.map((c) => ({
      ...c,
      profiles: { display_name: nameMap.get(c.profile_id) ?? null },
    }));
  }


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
          <Link href="/tournaments" className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest">
            <ArrowLeft className="inline size-3 mr-1" />
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={tournament.tier === 'competitivo' ? 'crown' : 'data'}>
                {tournament.format.replace('_', ' ')}
              </Badge>
              <Badge variant={TOURNAMENT_STATUS[tournament.status]?.variant ?? 'muted'}>
                {TOURNAMENT_STATUS[tournament.status]?.label ?? tournament.status}
              </Badge>
            </div>
            <h1 className="font-display mt-4 text-5xl tracking-tight md:text-7xl">
              {tournament.name}
            </h1>
            {isOrganizer && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button variant="crown" size="sm" asChild>
                  <Link href={`/app/tournaments/${tournament.slug}/manage`}>
                    <Crown className="size-3" />
                    Administrar torneo
                  </Link>
                </Button>
                {tournament.status === 'open' && (
                  <GenerateBracketButton
                    tournamentId={tournament.id}
                    count={registrations?.length ?? 0}
                    format={tournament.format}
                  />
                )}
              </div>
            )}
            {isOrganizer && tournament.status === 'open' && (
              <div className="mt-6">
                <ManualPlayerForm
                  tournamentId={tournament.id}
                  pairMode={tournament.format !== 'americano_random' && tournament.format !== 'express'}
                />
              </div>
            )}
          </div>

          {tournament.description && (
            <Card className="p-6">
              <p className="text-foreground/80 whitespace-pre-wrap text-sm">
                {tournament.description}
              </p>
            </Card>
          )}

          {/* Inscripcion. Va aca arriba, antes de compartir / chat / bracket,
              porque es la decision principal de la pagina. Estaba al fondo,
              debajo del chat: una tester entro, vio las tarjetas de info y el
              boton de invitar por WhatsApp, y escribio "no veo donde me
              inscribo a un torneo". La lista publica promete "INSCRIBIRME" en
              cada card, asi que el detalle tiene que cumplirlo sin scroll. */}
          <TournamentRegistrationCard
            tournament={tournament}
            registrations={registrations}
            user={user}
            userIsParticipant={userIsParticipant}
            myProfile={myProfile}
            myTeams={myTeams}
          />

          {/* Compartir torneo — visible para todos los autenticados */}
          {user && (
            <div className="flex flex-wrap gap-3">
              <ShareInviteButton
                kind="tournament"
                targetId={tournament.id}
                name={tournament.name}
                variant="outline"
                size="lg"
                label="Invitar por WhatsApp"
              />
              <ShareStoryButton
                slug={tournament.slug}
                tournamentName={tournament.name}
                variant="outline"
                size="lg"
              />
              {tournament.status === 'finished' && (
                <SharePodiumButton
                  slug={tournament.slug}
                  tournamentName={tournament.name}
                  variant="crown"
                  size="lg"
                />
              )}
            </div>
          )}

          {/* Chat del torneo — solo participantes / organizador */}
          {canChat && user && (
            <TournamentChat
              tournamentId={tournament.id}
              initialMessages={initialChatMessages}
              currentUserId={user.id}
            />
          )}


          {/* Inscritos */}
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-2xl tracking-tight">INSCRITOS</h2>
              <span className="text-muted-foreground text-xs uppercase tracking-widest tabular-nums">
                {registrations.length} / {tournament.max_teams}
              </span>
            </div>
            {(registrations ?? []).length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Aún no hay inscripciones. Sé el primero.
              </Card>
            ) : (
              <Card className="divide-border/30 grid divide-y p-0 md:grid-cols-2 md:divide-y-0">
                {registrations!.map((r) => {
                  const label = registrationLabel(r);
                  const names = label.split(' / ');
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex shrink-0 -space-x-2" aria-hidden>
                          {names.map((n, i) => (
                            <span
                              key={i}
                              className="bg-crown/15 text-crown border-card font-display flex size-8 items-center justify-center rounded-full border-2 text-xs"
                            >
                              {n.trim().charAt(0).toUpperCase()}
                            </span>
                          ))}
                        </span>
                        <span className="min-w-0 truncate">{label}</span>
                      </span>
                      {isOrganizer && (
                        <RemoveRegistrationButton registrationId={r.id} label={label} />
                      )}
                    </div>
                  );
                })}
              </Card>
            )}
          </div>

          {tournament.format.startsWith('americano') && tournament.status === 'in_progress' && (
            <Button variant="crown" size="lg" asChild>
              <Link href={`/tournaments/${tournament.slug}/live`}>
                <Trophy className="size-4" />
                Ver torneo en vivo
              </Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

