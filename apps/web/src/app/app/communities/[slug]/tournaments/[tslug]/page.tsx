import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Calendar, Check, ChevronRight, Crown, Trophy, Users } from 'lucide-react';

import { CATEGORY_LABELS } from '@padelking/domain';
import type { CategoryKind, Gender, TeamCategory } from '@padelking/domain';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ManualPlayerForm } from '@/components/manual-player-form';
import { RemoveRegistrationButton } from '@/components/remove-registration-button';
import { ShareInviteButton } from '@/components/share-invite-button';
import { SharePodiumButton } from '@/components/share-podium-button';
import { ShareStoryButton } from '@/components/share-story-button';
import { TournamentChat, type ChatMessage } from '@/components/tournament-chat';
import { formatDateTime } from '@/lib/format-date';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { TOURNAMENT_STATUS } from '@/lib/tournament-status';
import { GenerateBracketButton } from '@/app/app/tournaments/[slug]/manage/generate-bracket-button';
import { RegisterButton } from '@/app/tournaments/[slug]/register-button';

/**
 * Community hub — detalle de torneo dentro de una comunidad.
 *
 * Diferencias vs /tournaments/[slug] público:
 *  - Vive bajo /app/* → requiere sesión (forzada por AppLayout).
 *  - Gate por membresía: solo miembros (o cualquiera si la comunidad es pública).
 *  - Valida que el torneo pertenezca a esta comunidad (community_id match).
 *  - Header con breadcrumb y link de vuelta al hub con ?tab=tournaments.
 *  - Misma feature set: inscripción, lista de inscritos, chat, manage para owner.
 */
export default async function CommunityTournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; tslug: string }>;
}) {
  const { slug, tslug } = await params;
  const user = await getSession();
  if (!user) redirect(`/login?next=/app/communities/${slug}/tournaments/${tslug}`);

  const supabase = await getSupabaseServerClient();

  // 1. Comunidad por slug
  type CommunityRow = {
    id: string;
    slug: string;
    name: string;
    owner_id: string;
    is_public: boolean | null;
  };
  const { data: communityRaw } = await supabase
    .from('communities')
    .select('id, slug, name, owner_id, is_public')
    .eq('slug', slug)
    .maybeSingle();
  const community = communityRaw as unknown as CommunityRow | null;
  if (!community) notFound();

  // 2. Membresía
  const { data: memberRow } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('community_id', community.id)
    .eq('profile_id', user.id)
    .maybeSingle();
  const isMember = !!memberRow;
  const isOwner = community.owner_id === user.id;
  const isPublic = community.is_public !== false;

  // Gate: si no es miembro y la comunidad no es pública, mandamos al hub donde
  // se muestra la pantalla de "solicitar acceso" / "comunidad privada".
  if (!isMember && !isPublic) {
    redirect(`/app/communities/${community.slug}`);
  }

  // 3. Torneo por (slug, community_id)
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
    community_id: string | null;
    club_id: string | null;
  };

  const { data: tournamentRaw } = await supabase
    .from('tournaments')
    .select('*')
    .eq('slug', tslug)
    .eq('community_id', community.id)
    .maybeSingle();
  const tournament = tournamentRaw as unknown as TournamentRow | null;
  if (!tournament) notFound();

  // Solo el owner de la comunidad organiza (los torneos community no tienen club).
  const isOrganizer = isOwner;

  // 4. Datos de inscripción (mismo shape que la pública)
  const myTeams: {
    id: string;
    name: string;
    category: TeamCategory | null;
    eligibility: { ok: boolean; reason?: string };
  }[] = [];
  let myProfile: {
    skillCategory: TeamCategory | null;
    gender: Gender | null;
    eligibility: { ok: boolean; reason?: string };
  } | null = null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('skill_category, gender')
    .eq('id', user.id)
    .maybeSingle();

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

  // 5. Inscripciones
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

  type RegFlat = {
    player_id: string | null;
    player_one_id: string | null;
    player_two_id: string | null;
  };
  const userIsParticipant = (registrations as unknown as RegFlat[]).some(
    (r) =>
      r.player_id === user.id ||
      r.player_one_id === user.id ||
      r.player_two_id === user.id,
  );
  const canChat = userIsParticipant || isOrganizer;

  // 6. Lookup de nombres (profiles_public + guest_players)
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

  const labelForSlot = (profileId: string | null, guestId: string | null): string => {
    if (profileId) return registrationNameMap.get(profileId) ?? '?';
    if (guestId) {
      const name = guestNameMap.get(guestId) ?? '?';
      return `${name} (invitado)`;
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
      const name = guestNameMap.get(r.guest_player_id) ?? '?';
      return `${name} (invitado)`;
    }
    return 'Inscripción';
  };

  // 7. Chat inicial
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

  const isIndividual = tournament.competition_unit === 'player';
  const backHref = `/app/communities/${community.slug}?tab=tournaments`;
  // Mismo criterio que el gate del server (registerToTournament): solo confirmed.
  const isFull =
    registrations.filter((r) => r.status === 'confirmed').length >= tournament.max_teams;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-widest">
        <Link
          href={backHref}
          className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="size-3" />
          {community.name}
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground truncate">{tournament.name}</span>
      </nav>

      <div>
        <div className="flex items-center gap-2">
          <Badge variant={tournament.tier === 'competitivo' ? 'crown' : 'data'}>
            {tournament.format.replace('_', ' ')}
          </Badge>
          <Badge variant={TOURNAMENT_STATUS[tournament.status]?.variant ?? 'muted'}>
            {TOURNAMENT_STATUS[tournament.status]?.label ?? tournament.status}
          </Badge>
        </div>
        <h1 className="font-display mt-4 text-4xl tracking-tight md:text-6xl">
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

      <div className="grid gap-3 md:grid-cols-3">
        <InfoCard
          icon={Calendar}
          label="Fecha"
          value={formatDateTime(tournament.starts_at)}
        />
        <InfoCard
          icon={Crown}
          label="Categoría"
          value={
            tournament.category_kind === 'suma' ||
            tournament.category_kind === 'mixto_suma' ||
            tournament.category_kind === 'queens_suma'
              ? `Suma ≥ ${tournament.min_sum}${tournament.max_player_category_value ? ` (tope ${tournament.max_player_category_value} por jugador)` : ''}`
              : tournament.category
                ? (CATEGORY_LABELS[tournament.category] ?? tournament.category)
                : 'Casual'
          }
        />
        <InfoCard
          icon={Users}
          label="Inscritos"
          value={`${registrations?.length ?? 0} / ${tournament.max_teams} ${isIndividual ? 'jugadores' : 'equipos'}`}
        />
      </div>

      {tournament.description && (
        <Card className="p-6">
          <p className="text-foreground/80 whitespace-pre-wrap text-sm">
            {tournament.description}
          </p>
        </Card>
      )}

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

      {canChat && (
        <TournamentChat
          tournamentId={tournament.id}
          initialMessages={initialChatMessages}
          currentUserId={user.id}
        />
      )}

      {/* Inscripción */}
      <Card className="p-6">
        <h2 className="font-display mb-4 text-2xl tracking-tight">INSCRIPCIÓN</h2>
        {userIsParticipant ? (
          <div className="border-success/30 bg-success/[0.04] flex items-center gap-2 rounded-lg border p-4 text-sm">
            <Check className="text-success size-4 shrink-0" aria-hidden />
            <span>Ya estás inscrito en este torneo.</span>
          </div>
        ) : isFull ? (
          <div className="border-border/40 bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-lg border p-4 text-sm">
            Cupo completo: {tournament.max_teams} {isIndividual ? 'jugadores' : 'equipos'}.
          </div>
        ) : isIndividual ? (
          <div className="space-y-3">
            <p className="text-sm">
              Este torneo es individual. Tu categoría:{' '}
              <strong>{myProfile?.skillCategory ?? '—'}</strong>
            </p>
            {myProfile?.eligibility.ok ? (
              <RegisterButton
                tournamentId={tournament.id}
                mode="individual"
                label="Inscribirme como jugador"
              />
            ) : (
              <p className="text-destructive text-sm">{myProfile?.eligibility.reason}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              Puedes inscribirte con un equipo registrado, o con un compañero solo para
              este torneo (lo más común en pádel amateur).
            </p>

            {myTeams.filter((t) => t.eligibility.ok).length > 0 && (
              <div className="space-y-3 rounded-lg bg-muted/30 p-4">
                <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                  Opción A · Equipo registrado
                </div>
                {myTeams.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-sm">{t.name}</div>
                      <div className="text-muted-foreground text-xs uppercase tracking-widest">
                        {t.category ? CATEGORY_LABELS[t.category] : 'Mixto'}
                      </div>
                      {!t.eligibility.ok && (
                        <div className="text-destructive mt-1 text-xs">
                          {t.eligibility.reason}
                        </div>
                      )}
                    </div>
                    {!t.eligibility.ok && <Badge variant="muted">No elegible</Badge>}
                  </div>
                ))}
                <RegisterButton
                  tournamentId={tournament.id}
                  mode="team"
                  teams={myTeams
                    .filter((t) => t.eligibility.ok)
                    .map((t) => ({ id: t.id, name: t.name }))}
                />
              </div>
            )}

            <div className="space-y-3 rounded-lg bg-muted/30 p-4">
              <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                {myTeams.filter((t) => t.eligibility.ok).length > 0
                  ? 'Opción B · Compañero solo para este torneo'
                  : 'Inscríbete con un compañero'}
              </div>
              <p className="text-muted-foreground text-sm">
                Tu categoría:{' '}
                <strong className="text-foreground">{myProfile?.skillCategory ?? '—'}</strong>.
                La elegibilidad se valida cuando confirmes el compañero.
              </p>
              <RegisterButton tournamentId={tournament.id} mode="adhoc" />
            </div>
          </div>
        )}
      </Card>

      {/* Inscritos */}
      <div>
        <h2 className="font-display mb-3 text-2xl tracking-tight">INSCRITOS</h2>
        {(registrations ?? []).length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Aún no hay inscripciones. Sé el primero.
          </Card>
        ) : (
          <Card className="divide-border/30 divide-y">
            {registrations!.map((r) => {
              const label = registrationLabel(r);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span>{label}</span>
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
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="font-display mt-1.5 text-lg tracking-tight capitalize">{value}</div>
    </Card>
  );
}
