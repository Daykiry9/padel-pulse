import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Crown, PlayCircle, Trophy, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

import { FinishTournamentButton } from '@/components/finish-tournament-button';
import { GenerateBracketButton } from './generate-bracket-button';
import { MatchScoreForm } from './match-score-form';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'programado',
  pending_confirmation: 'por confirmar',
  completed: 'jugado',
  disputed: 'en disputa',
  in_progress: 'en curso',
};

type TournamentRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  format: string;
  courts: number;
  max_teams: number;
  starts_at: string;
  clubs: { name: string; owner_id: string } | null;
  communities: { name: string; owner_id: string } | null;
};

type RegRow = {
  id: string;
  team_id: string | null;
  player_one_id: string | null;
  player_two_id: string | null;
  player_id: string | null;
  guest_player_id: string | null;
  guest_player_one_id: string | null;
  guest_player_two_id: string | null;
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
  pair_one_guest_one_id: string | null;
  pair_one_guest_two_id: string | null;
  pair_two_guest_one_id: string | null;
  pair_two_guest_two_id: string | null;
};

export default async function ManageTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSession();
  if (!user) redirect(`/login?next=/app/tournaments/${slug}/manage`);

  const supabase = await getSupabaseServerClient();

  // 1. Torneo + ownership check
  const { data: tData } = await supabase
    .from('tournaments')
    .select('id, slug, name, status, format, courts, max_teams, starts_at, clubs(name, owner_id), communities(name, owner_id)')
    .eq('slug', slug)
    .single();

  const tournament = tData as unknown as TournamentRow | null;
  if (!tournament) notFound();

  const isOrganizer =
    tournament.clubs?.owner_id === user.id || tournament.communities?.owner_id === user.id;
  if (!isOrganizer) {
    return (
      <Card className="p-12 text-center">
        <Crown className="text-muted-foreground mx-auto size-10" />
        <p className="font-display mt-4 text-xl">SOLO EL ORGANIZADOR</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Esta página es solo para el dueño del club que organiza el torneo.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/tournaments/${tournament.slug}`}>
            <ArrowLeft className="size-4" />
            Ver torneo público
          </Link>
        </Button>
      </Card>
    );
  }

  // 2. Inscripciones confirmadas + datos para mostrar nombres
  const { data: regsData } = await supabase
    .from('tournament_registrations')
    .select(
      'id, team_id, player_one_id, player_two_id, player_id, guest_player_id, guest_player_one_id, guest_player_two_id',
    )
    .eq('tournament_id', tournament.id)
    .eq('status', 'confirmed');
  const registrations = (regsData ?? []) as unknown as RegRow[];

  const teamIds = Array.from(new Set(registrations.map((r) => r.team_id).filter(Boolean) as string[]));
  const profileIds = Array.from(
    new Set(
      registrations
        .flatMap((r) => [r.player_one_id, r.player_two_id, r.player_id])
        .filter(Boolean) as string[],
    ),
  );
  const guestIdsFromRegs = registrations
    .flatMap((r) => [r.guest_player_id, r.guest_player_one_id, r.guest_player_two_id])
    .filter(Boolean) as string[];

  const [teamsRes, profilesRes] = await Promise.all([
    teamIds.length
      ? supabase.from('teams').select('id, name').in('id', teamIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', profileIds)
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

  const isRandom = tournament.format === 'americano_random';

  // 3. Matches (necesitamos pair_*_guest_*_id para juntar todos los guest ids antes
  //    del lookup batched a guest_players).
  const { data: matchesData } = await supabase
    .from('matches')
    .select(
      'id, round_number, court_number, registration_one_id, registration_two_id, score_one, score_two, status, reported_by_registration_id, reported_by_side, pair_one_player_one_id, pair_one_player_two_id, pair_two_player_one_id, pair_two_player_two_id, pair_one_guest_one_id, pair_one_guest_two_id, pair_two_guest_one_id, pair_two_guest_two_id',
    )
    .eq('tournament_id', tournament.id)
    .order('round_number')
    .order('court_number');
  const matches = (matchesData ?? []) as unknown as MatchRow[];

  const guestIds = Array.from(
    new Set([
      ...guestIdsFromRegs,
      ...matches.flatMap((m) => [
        m.pair_one_guest_one_id,
        m.pair_one_guest_two_id,
        m.pair_two_guest_one_id,
        m.pair_two_guest_two_id,
      ]).filter(Boolean) as string[],
    ]),
  );
  const guestNameMap = new Map<string, string>();
  if (guestIds.length) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const sbGuests = supabase as any;
    const { data: guestData } = await sbGuests
      .from('guest_players')
      .select('id, display_name')
      .in('id', guestIds);
    for (const g of (guestData ?? []) as { id: string; display_name: string }[]) {
      guestNameMap.set(g.id, g.display_name);
    }
  }

  const labelForSlot = (profileId: string | null, guestId: string | null): string => {
    if (profileId) return profiles.get(profileId) ?? '?';
    if (guestId) {
      const name = guestNameMap.get(guestId) ?? '?';
      return `${name} (invitado)`;
    }
    return '?';
  };

  function labelOf(reg: RegRow): string {
    if (reg.team_id && teams.has(reg.team_id)) return teams.get(reg.team_id)!;
    if (
      reg.player_one_id ||
      reg.player_two_id ||
      reg.guest_player_one_id ||
      reg.guest_player_two_id
    ) {
      const a = labelForSlot(reg.player_one_id, reg.guest_player_one_id);
      const b = labelForSlot(reg.player_two_id, reg.guest_player_two_id);
      return `${a} / ${b}`;
    }
    if (reg.player_id) return profiles.get(reg.player_id) ?? '?';
    if (reg.guest_player_id) {
      const name = guestNameMap.get(reg.guest_player_id) ?? '?';
      return `${name} (invitado)`;
    }
    return 'Inscripción';
  }
  const regLabels = new Map(registrations.map((r) => [r.id, labelOf(r)]));

  const sideLabel = (m: MatchRow, side: 'one' | 'two'): string => {
    if (isRandom) {
      const [p1, p2, g1, g2] =
        side === 'one'
          ? [
              m.pair_one_player_one_id,
              m.pair_one_player_two_id,
              m.pair_one_guest_one_id,
              m.pair_one_guest_two_id,
            ]
          : [
              m.pair_two_player_one_id,
              m.pair_two_player_two_id,
              m.pair_two_guest_one_id,
              m.pair_two_guest_two_id,
            ];
      return `${labelForSlot(p1, g1)} / ${labelForSlot(p2, g2)}`;
    }
    const regId = side === 'one' ? m.registration_one_id : m.registration_two_id;
    return (regId && regLabels.get(regId)) || '?';
  };
  const reportedByLabelOf = (m: MatchRow): string | null => {
    if (isRandom) {
      if (m.reported_by_side === 1) return sideLabel(m, 'one');
      if (m.reported_by_side === 2) return sideLabel(m, 'two');
      return null;
    }
    return m.reported_by_registration_id
      ? (regLabels.get(m.reported_by_registration_id) ?? null)
      : null;
  };

  // Agrupar por ronda
  const matchesByRound = new Map<number, MatchRow[]>();
  for (const m of matches) {
    if (!matchesByRound.has(m.round_number)) matchesByRound.set(m.round_number, []);
    matchesByRound.get(m.round_number)!.push(m);
  }
  const sortedRounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  const completedCount = matches.filter((m) => m.status === 'completed').length;
  const totalCount = matches.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/tournaments/${tournament.slug}`}
          className="text-muted-foreground hover:text-foreground text-xs uppercase tracking-widest"
        >
          <ArrowLeft className="inline size-3 mr-1" />
          Ver vista pública
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="crown">Administrar</Badge>
          <Badge
            variant={
              tournament.status === 'in_progress'
                ? 'success'
                : tournament.status === 'finished'
                  ? 'muted'
                  : 'data'
            }
          >
            {tournament.status}
          </Badge>
        </div>
        <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
          {tournament.name}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {tournament.clubs?.name ?? tournament.communities?.name} ·{' '}
          {new Date(tournament.starts_at).toLocaleString('es-CO')}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat icon={Users} label="Inscritos" value={`${registrations.length} / ${tournament.max_teams}`} />
        <Stat icon={PlayCircle} label="Canchas" value={String(tournament.courts ?? 2)} />
        <Stat
          icon={CheckCircle2}
          label="Avance"
          value={totalCount > 0 ? `${completedCount}/${totalCount} (${progress}%)` : '—'}
        />
      </div>

      {tournament.status === 'in_progress' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-crown/30 bg-crown/[0.03] px-4 py-3">
          <p className="text-muted-foreground text-sm">
            Cuando termines de cargar los marcadores, cerrá el torneo.
          </p>
          <FinishTournamentButton tournamentId={tournament.id} />
        </div>
      )}

      {/* Estado: open → botón generar bracket */}
      {tournament.status === 'open' && (
        <Card className="border-crown/30 bg-crown/[0.03] p-6">
          <h2 className="font-display text-2xl tracking-tight">CERRAR INSCRIPCIONES</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Cuando cierres, el sistema genera automáticamente el bracket de Americano fijo
            (round-robin Berger) con las {registrations.length} inscripciones confirmadas usando{' '}
            {tournament.courts ?? 2} canchas. El torneo pasa a estado{' '}
            <strong className="text-foreground">in_progress</strong> y los jugadores ven la página
            en vivo.
          </p>
          {registrations.length < 2 ? (
            <p className="text-destructive mt-4 text-sm">
              Faltan inscripciones. Mínimo 2 equipos para generar bracket.
            </p>
          ) : (
            <div className="mt-5">
              <GenerateBracketButton tournamentId={tournament.id} count={registrations.length} />
            </div>
          )}
        </Card>
      )}

      {/* Estado: in_progress → matches con score editor */}
      {tournament.status === 'in_progress' && (
        <div className="space-y-8">
          {sortedRounds.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No hay matches generados. Algo salió mal en el bracket.
            </Card>
          ) : (
            sortedRounds.map((roundNumber) => {
              const roundMatches = matchesByRound.get(roundNumber)!;
              const done = roundMatches.filter((m) => m.status === 'completed').length;
              return (
                <section key={roundNumber}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="font-display text-2xl tracking-tight">
                      RONDA {roundNumber}
                    </h2>
                    <span className="text-muted-foreground text-xs uppercase tracking-widest">
                      {done} / {roundMatches.length} jugados
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {roundMatches.map((m) => (
                      <Card key={m.id} className="p-4">
                        <div className="text-muted-foreground mb-3 flex items-center justify-between text-[10px] uppercase tracking-widest">
                          <span>Cancha {m.court_number}</span>
                          <Badge
                            variant={
                              m.status === 'completed'
                                ? 'success'
                                : m.status === 'disputed'
                                  ? 'live'
                                  : m.status === 'pending_confirmation'
                                    ? 'crown'
                                    : 'muted'
                            }
                            className="text-[9px]"
                          >
                            {STATUS_LABELS[m.status] ?? m.status}
                          </Badge>
                        </div>
                        <MatchScoreForm
                          matchId={m.id}
                          labelOne={sideLabel(m, 'one')}
                          labelTwo={sideLabel(m, 'two')}
                          initialScoreOne={m.score_one}
                          initialScoreTwo={m.score_two}
                          status={m.status}
                          reportedByLabel={reportedByLabelOf(m)}
                        />
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {tournament.status === 'finished' && (
        <Card className="p-8 text-center">
          <Trophy className="text-crown mx-auto size-10" />
          <p className="font-display mt-3 text-xl">TORNEO FINALIZADO</p>
          <p className="text-muted-foreground mt-2 text-sm">
            {completedCount} matches jugados.{' '}
            <Link href={`/tournaments/${tournament.slug}/live`} className="text-crown underline">
              Ver resultados públicos
            </Link>
            .
          </p>
        </Card>
      )}
    </div>
  );
}

function Stat({
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
      <div className="font-display mt-1 text-2xl tracking-tight">{value}</div>
    </Card>
  );
}
