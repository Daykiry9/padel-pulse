import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Crown, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { KingLogo } from '@/components/marketing/king-logo';
import { computeAmericanoStandings } from '@padelking/domain';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

import { PlayerMatchActions } from './player-match-actions';
import { RealtimeRefresh } from './realtime-refresh';

type TournamentRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  format: string;
  courts: number;
  starts_at: string;
  category_kind: string;
  category: string | null;
  min_sum: number | null;
  clubs: { owner_id: string } | null;
  communities: { owner_id: string } | null;
};

type RegRow = {
  id: string;
  team_id: string | null;
  player_one_id: string | null;
  player_two_id: string | null;
  player_id: string | null;
};

type MatchRow = {
  id: string;
  round_number: number;
  court_number: number;
  registration_one_id: string | null;
  registration_two_id: string | null;
  score_one: number | null;
  score_two: number | null;
  status: string;
  reported_by_registration_id: string | null;
  reported_by_side: number | null;
  pair_one_player_one_id: string | null;
  pair_one_player_two_id: string | null;
  pair_two_player_one_id: string | null;
  pair_two_player_two_id: string | null;
};

interface Standing {
  regId: string;
  label: string;
  played: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  diff: number;
}

export default async function LiveTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const user = await getSession();

  const { data: tData } = await supabase
    .from('tournaments')
    .select(
      'id, name, slug, status, format, courts, starts_at, category_kind, category, min_sum, clubs(owner_id), communities(owner_id)',
    )
    .eq('slug', slug)
    .single();
  const tournament = tData as unknown as TournamentRow | null;
  if (!tournament) notFound();
  const isRandom = tournament.format === 'americano_random';
  const isOwner = Boolean(
    user &&
      (tournament.clubs?.owner_id === user.id || tournament.communities?.owner_id === user.id),
  );

  const [regsRes, matchesRes] = await Promise.all([
    supabase
      .from('tournament_registrations')
      .select('id, team_id, player_one_id, player_two_id, player_id')
      .eq('tournament_id', tournament.id)
      .eq('status', 'confirmed'),
    supabase
      .from('matches')
      .select(
        'id, round_number, court_number, registration_one_id, registration_two_id, score_one, score_two, status, reported_by_registration_id, reported_by_side, pair_one_player_one_id, pair_one_player_two_id, pair_two_player_one_id, pair_two_player_two_id',
      )
      .eq('tournament_id', tournament.id)
      .order('round_number')
      .order('court_number'),
  ]);
  const registrations = (regsRes.data ?? []) as unknown as RegRow[];
  const matches = (matchesRes.data ?? []) as unknown as MatchRow[];

  // Registrations en las que participa el usuario actual (para mostrarle
  // controles de reportar/confirmar en sus partidos).
  const myRegIds = new Set<string>();
  if (user) {
    for (const r of registrations) {
      if (r.player_one_id === user.id || r.player_two_id === user.id || r.player_id === user.id) {
        myRegIds.add(r.id);
      }
    }
    const myTeamRegs = registrations.filter((r) => r.team_id);
    if (myTeamRegs.length) {
      const { data: tmData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', user.id)
        .eq('is_active', true)
        .in('team_id', myTeamRegs.map((r) => r.team_id) as string[]);
      const myTeams = new Set(((tmData ?? []) as { team_id: string }[]).map((x) => x.team_id));
      for (const r of myTeamRegs) if (r.team_id && myTeams.has(r.team_id)) myRegIds.add(r.id);
    }
  }

  // Etiquetas de inscripciones (team name o "p1 / p2" o "player single")
  const teamIds = Array.from(new Set(registrations.map((r) => r.team_id).filter(Boolean) as string[]));
  const profileIds = Array.from(
    new Set(
      registrations
        .flatMap((r) => [r.player_one_id, r.player_two_id, r.player_id])
        .filter(Boolean) as string[],
    ),
  );

  // profiles_public vista nueva — cast hasta regenerar types tras migración.
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const sb = supabase as any;
  const [teamsRes, profilesRes] = await Promise.all([
    teamIds.length
      ? supabase.from('teams').select('id, name').in('id', teamIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? sb.from('profiles_public').select('id, display_name').in('id', profileIds)
      : Promise.resolve({ data: [] }),
  ]);
  const teams = new Map(
    ((teamsRes.data ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]),
  );
  const profiles = new Map(
    ((profilesRes.data ?? []) as { id: string; display_name: string }[]).map((p) => [
      p.id,
      p.display_name,
    ]),
  );

  const playerName = (id: string | null): string => (id ? (profiles.get(id) ?? '?') : '?');

  const labelOf = (reg: RegRow): string => {
    if (reg.team_id && teams.has(reg.team_id)) return teams.get(reg.team_id)!;
    if (reg.player_one_id && reg.player_two_id) {
      return `${profiles.get(reg.player_one_id) ?? '?'} / ${profiles.get(reg.player_two_id) ?? '?'}`;
    }
    if (reg.player_id) return profiles.get(reg.player_id) ?? '?';
    return 'Inscripción';
  };
  const regLabels = new Map(registrations.map((r) => [r.id, labelOf(r)]));

  // Etiqueta de cada lado de un partido (pareja). En random son los 2 jugadores
  // de esa cancha en esa ronda; en fijo es la inscripción-pareja.
  const sideLabel = (m: MatchRow, side: 'one' | 'two'): string => {
    if (isRandom) {
      const [p1, p2] =
        side === 'one'
          ? [m.pair_one_player_one_id, m.pair_one_player_two_id]
          : [m.pair_two_player_one_id, m.pair_two_player_two_id];
      return `${playerName(p1)} / ${playerName(p2)}`;
    }
    const regId = side === 'one' ? m.registration_one_id : m.registration_two_id;
    return (regId && regLabels.get(regId)) || '?';
  };

  // ¿En qué lado juega el usuario? (random: por jugador; fijo: por registration)
  const myParticipation = (m: MatchRow): { mineOne: boolean; mineTwo: boolean } => {
    if (isRandom) {
      const inOne = Boolean(
        user && (m.pair_one_player_one_id === user.id || m.pair_one_player_two_id === user.id),
      );
      const inTwo = Boolean(
        user && (m.pair_two_player_one_id === user.id || m.pair_two_player_two_id === user.id),
      );
      return { mineOne: inOne, mineTwo: inTwo };
    }
    return {
      mineOne: Boolean(m.registration_one_id && myRegIds.has(m.registration_one_id)),
      mineTwo: Boolean(m.registration_two_id && myRegIds.has(m.registration_two_id)),
    };
  };
  const reportedSideOf = (m: MatchRow): 'one' | 'two' | null => {
    if (isRandom) return m.reported_by_side === 1 ? 'one' : m.reported_by_side === 2 ? 'two' : null;
    return m.reported_by_registration_id === m.registration_one_id
      ? 'one'
      : m.reported_by_registration_id === m.registration_two_id
        ? 'two'
        : null;
  };

  // Tabla de posiciones (unificada para fijo y random)
  type DisplayStanding = { key: string; label: string; wins: number; diff: number; points: number };
  let displayStandings: DisplayStanding[];

  if (isRandom) {
    const results = matches
      .filter((m) => m.status === 'completed' && m.score_one != null && m.score_two != null)
      .map((m) => ({
        pairOnePlayerOneId: m.pair_one_player_one_id ?? '',
        pairOnePlayerTwoId: m.pair_one_player_two_id ?? '',
        pairTwoPlayerOneId: m.pair_two_player_one_id ?? '',
        pairTwoPlayerTwoId: m.pair_two_player_two_id ?? '',
        scoreOne: m.score_one as number,
        scoreTwo: m.score_two as number,
      }));
    const allPlayerIds = registrations.map((r) => r.player_id).filter(Boolean) as string[];
    displayStandings = computeAmericanoStandings(results, allPlayerIds).map((s) => ({
      key: s.playerId,
      label: playerName(s.playerId),
      wins: s.wins,
      diff: s.diff,
      points: s.points,
    }));
  } else {
    const standings: Standing[] = registrations.map((r) => ({
      regId: r.id,
      label: regLabels.get(r.id) ?? '?',
      played: 0,
      wins: 0,
      losses: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      diff: 0,
    }));
    const standingsByReg = new Map(standings.map((s) => [s.regId, s]));
    for (const m of matches) {
      if (m.status !== 'completed' || m.score_one == null || m.score_two == null) continue;
      const a = m.registration_one_id ? standingsByReg.get(m.registration_one_id) : undefined;
      const b = m.registration_two_id ? standingsByReg.get(m.registration_two_id) : undefined;
      if (!a || !b) continue;
      a.played++; b.played++;
      a.gamesFor += m.score_one; a.gamesAgainst += m.score_two;
      b.gamesFor += m.score_two; b.gamesAgainst += m.score_one;
      if (m.score_one > m.score_two) { a.wins++; b.losses++; }
      else if (m.score_two > m.score_one) { b.wins++; a.losses++; }
    }
    for (const s of standings) s.diff = s.gamesFor - s.gamesAgainst;
    standings.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return b.gamesFor - a.gamesFor;
    });
    displayStandings = standings.map((s) => ({
      key: s.regId,
      label: s.label,
      wins: s.wins,
      diff: s.diff,
      points: s.gamesFor,
    }));
  }

  // Match en cancha (in_progress) + próximos (scheduled)
  const inProgress = matches.filter((m) => m.status === 'in_progress');
  const completedCount = matches.filter((m) => m.status === 'completed').length;
  const totalCount = matches.length;

  const matchesByRound = new Map<number, MatchRow[]>();
  for (const m of matches) {
    if (!matchesByRound.has(m.round_number)) matchesByRound.set(m.round_number, []);
    matchesByRound.get(m.round_number)!.push(m);
  }
  const sortedRounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  return (
    <div className="bg-background min-h-screen">
      <RealtimeRefresh tournamentId={tournament.id} />

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

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {tournament.status === 'in_progress' && (
              <>
                <span className="size-2 rounded-full bg-live animate-pulse" />
                <span className="text-live font-mono text-xs uppercase tracking-widest">EN VIVO</span>
              </>
            )}
            <Badge variant={tournament.status === 'in_progress' ? 'success' : 'muted'}>
              {tournament.status}
            </Badge>
            <span className="text-muted-foreground text-xs uppercase tracking-widest">
              {tournament.format.replace('_', ' ')}
            </span>
          </div>
          <h1 className="font-display text-4xl tracking-tight md:text-6xl">
            {tournament.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {completedCount} / {totalCount} matches jugados · {registrations.length} inscritos ·{' '}
            {tournament.courts} canchas
          </p>
        </div>

        {tournament.status === 'open' && (
          <Card className="mt-8 p-8 text-center">
            <Trophy className="text-muted-foreground mx-auto size-10" />
            <p className="font-display mt-3 text-xl">EL TORNEO AÚN NO HA COMENZADO</p>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
              Cuando el organizador cierre inscripciones y genere el bracket, aquí podrás ver el
              ranking en vivo y los marcadores de cada match en tiempo real.
            </p>
            <Button variant="crown" className="mt-4" asChild>
              <Link href={`/tournaments/${slug}`}>Ver inscripción</Link>
            </Button>
          </Card>
        )}

        {(tournament.status === 'in_progress' || tournament.status === 'finished') &&
          totalCount > 0 && (
            <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1.2fr]">
              {/* Standings */}
              <section>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-display text-2xl tracking-tight">RANKING</h2>
                  <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                    PG · DIF · GF
                  </span>
                </div>
                <Card className="divide-border/30 divide-y overflow-hidden p-0">
                  {displayStandings.map((s, idx) => (
                    <div
                      key={s.key}
                      className={`grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm ${
                        idx === 0 ? 'bg-crown/[0.04]' : ''
                      }`}
                    >
                      <span
                        className={`font-display text-lg tabular-nums ${
                          idx === 0
                            ? 'text-crown'
                            : idx === 1
                              ? 'text-foreground/80'
                              : idx === 2
                                ? 'text-foreground/60'
                                : 'text-muted-foreground'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="truncate">
                        {idx === 0 && <Crown className="text-crown mr-1 inline size-3" />}
                        {s.label}
                      </span>
                      <span className="text-muted-foreground tabular-nums text-xs">{s.wins}</span>
                      <span
                        className={`tabular-nums text-xs ${
                          s.diff > 0
                            ? 'text-success'
                            : s.diff < 0
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {s.diff > 0 ? '+' : ''}
                        {s.diff}
                      </span>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        {s.points}
                      </span>
                    </div>
                  ))}
                </Card>
                <p className="text-muted-foreground mt-2 text-[10px] uppercase tracking-widest">
                  PG = partidos ganados · DIF = diferencia de games · GF = games a favor
                </p>
              </section>

              {/* Matches por ronda */}
              <section>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-display text-2xl tracking-tight">MATCHES</h2>
                  {inProgress.length > 0 && (
                    <span className="text-live flex items-center gap-1.5 text-xs uppercase tracking-widest">
                      <span className="bg-live size-1.5 animate-pulse rounded-full" />
                      {inProgress.length} en cancha
                    </span>
                  )}
                </div>

                <div className="space-y-6">
                  {sortedRounds.map((roundNumber) => {
                    const roundMatches = matchesByRound.get(roundNumber)!;
                    const done = roundMatches.filter((m) => m.status === 'completed').length;
                    return (
                      <div key={roundNumber}>
                        <div className="text-muted-foreground mb-2 flex items-baseline justify-between text-[10px] uppercase tracking-widest">
                          <span>Ronda {roundNumber}</span>
                          <span>
                            {done}/{roundMatches.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {roundMatches.map((m) => {
                            const isLive = m.status === 'in_progress';
                            const isDone = m.status === 'completed';
                            const oneWon = isDone && (m.score_one ?? 0) > (m.score_two ?? 0);
                            const twoWon = isDone && (m.score_two ?? 0) > (m.score_one ?? 0);
                            return (
                              <Card
                                key={m.id}
                                className={`p-3 ${
                                  isLive ? 'border-live/40 bg-live/[0.03]' : ''
                                }`}
                              >
                                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                                  <span>Cancha {m.court_number}</span>
                                  {isLive && (
                                    <span className="text-live flex items-center gap-1">
                                      <span className="bg-live size-1 animate-pulse rounded-full" />
                                      En cancha
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <Row
                                    label={sideLabel(m, 'one')}
                                    score={m.score_one}
                                    winner={oneWon}
                                    dim={!isDone}
                                  />
                                  <Row
                                    label={sideLabel(m, 'two')}
                                    score={m.score_two}
                                    winner={twoWon}
                                    dim={!isDone}
                                  />
                                </div>
                                {(() => {
                                  const reportedBySide = reportedSideOf(m);
                                  // Owner: editor directo en cada partido (solo lo ve él).
                                  if (isOwner) {
                                    return (
                                      <PlayerMatchActions
                                        matchId={m.id}
                                        status={m.status}
                                        isOrganizer
                                        reportedBySide={reportedBySide}
                                        scoreOne={m.score_one}
                                        scoreTwo={m.score_two}
                                      />
                                    );
                                  }
                                  const { mineOne, mineTwo } = myParticipation(m);
                                  if (!mineOne && !mineTwo) return null;
                                  return (
                                    <PlayerMatchActions
                                      matchId={m.id}
                                      status={m.status}
                                      mySide={mineOne ? 'one' : 'two'}
                                      reportedBySide={reportedBySide}
                                      scoreOne={m.score_one}
                                      scoreTwo={m.score_two}
                                    />
                                  );
                                })()}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
      </main>
    </div>
  );
}

function Row({
  label,
  score,
  winner = false,
  dim = false,
}: {
  label: string;
  score: number | null;
  winner?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between text-sm ${
        winner ? 'font-semibold' : ''
      } ${dim && !winner ? 'opacity-60' : ''}`}
    >
      <span className="flex items-center gap-1.5 truncate">
        {winner && <Crown className="text-crown size-3.5" />}
        {label}
      </span>
      <span
        className={`font-display tabular-nums ${
          score == null ? 'text-muted-foreground/40' : winner ? 'text-crown' : 'text-foreground'
        }`}
      >
        {score ?? '—'}
      </span>
    </div>
  );
}
