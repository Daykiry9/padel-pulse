import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Crown, Trophy, Users } from 'lucide-react';

import { CATEGORY_LABELS } from '@padelking/domain';
import type { CategoryKind, Gender, TeamCategory } from '@padelking/domain';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { KingLogo } from '@/components/marketing/king-logo';
import { RemoveRegistrationButton } from '@/components/remove-registration-button';
import { ShareInviteButton } from '@/components/share-invite-button';
import { ShareStoryButton } from '@/components/share-story-button';
import { TournamentChat, type ChatMessage } from '@/components/tournament-chat';
import { formatDateTime } from '@/lib/format-date';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { RegisterButton } from './register-button';

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
    .select('*, clubs(owner_id), communities(owner_id)')
    .eq('slug', slug)
    .single();

  const tournament = tournamentRes.data as unknown as (TournamentRow & {
    club_id: string | null;
    clubs: { owner_id: string } | null;
    communities: { owner_id: string } | null;
  }) | null;
  if (!tournament) notFound();

  const user = await getSession();
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
      .single();

    if (profile) {
      // Categoría es OPCIONAL: cualquier usuario autenticado puede inscribirse,
      // no se filtra por elegibilidad.
      myProfile = {
        skillCategory: (profile.skill_category as TeamCategory | null) ?? null,
        gender: (profile.gender as Gender | null) ?? null,
        eligibility: { ok: true },
      };
    }

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
    team_id: string | null;
    player_id: string | null;
    player_one_id: string | null;
    player_two_id: string | null;
    teams: { name: string } | null;
  };

  const regsRes = await supabase
    .from('tournament_registrations')
    .select('id, team_id, player_id, player_one_id, player_two_id, teams(name)')
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
  const registrationLabel = (r: RegistrationRow): string => {
    if (r.teams?.name) return r.teams.name;
    if (r.player_one_id && r.player_two_id) {
      return `${registrationNameMap.get(r.player_one_id) ?? '?'} / ${registrationNameMap.get(r.player_two_id) ?? '?'}`;
    }
    if (r.player_id) return registrationNameMap.get(r.player_id) ?? '?';
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

  const isIndividual = tournament.competition_unit === 'player';

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
              <Badge variant={tournament.status === 'open' ? 'success' : 'muted'}>{tournament.status}</Badge>
            </div>
            <h1 className="font-display mt-4 text-5xl tracking-tight md:text-7xl">
              {tournament.name}
            </h1>
            {isOrganizer && (
              <div className="mt-5">
                <Button variant="crown" size="sm" asChild>
                  <Link href={`/app/tournaments/${tournament.slug}/manage`}>
                    <Crown className="size-3" />
                    Administrar torneo
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
                  ? `Suma ≥ ${tournament.min_sum}${tournament.max_player_category_value ? ` (tope val ${tournament.max_player_category_value})` : ''}`
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

          {/* Inscripción */}
          <Card className="p-6">
            <h2 className="font-display mb-4 text-2xl tracking-tight">INSCRIPCIÓN</h2>
            {!user ? (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">Inicia sesión para inscribirte.</p>
                <Button variant="crown" asChild>
                  <Link href={`/login?next=/tournaments/${tournament.slug}`}>Ingresar</Link>
                </Button>
              </div>
            ) : userIsParticipant ? (
              <div className="border-success/30 bg-success/[0.04] flex items-center gap-2 rounded-lg border p-4 text-sm">
                <span className="text-success">✓</span>
                <span>Ya estás inscrito en este torneo.</span>
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
                  Puedes inscribirte con un equipo registrado, o con un compañero ad-hoc solo
                  para este torneo (lo más común en pádel amateur).
                </p>

                {/* Opción A: equipos registrados elegibles */}
                {myTeams.filter((t) => t.eligibility.ok).length > 0 && (
                  <div className="border-border/40 space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                      Opción A — con equipo registrado
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

                {/* Opción B: ad-hoc partner (siempre disponible para Tier 1) */}
                <div className="border-border/40 space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                    {myTeams.filter((t) => t.eligibility.ok).length > 0
                      ? 'Opción B — con compañero ad-hoc'
                      : 'Inscríbete con un compañero'}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Tu categoría:{' '}
                    <strong className="text-foreground">{myProfile?.skillCategory ?? '—'}</strong>
                    . La elegibilidad se valida cuando confirmes el compañero.
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
      </main>
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
      <div className="font-display mt-1 text-sm capitalize">{value}</div>
    </Card>
  );
}
