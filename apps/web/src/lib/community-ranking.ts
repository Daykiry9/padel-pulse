import type { ServerSupabase } from './supabase/server';

export interface CommunityRankingEntry {
  playerId: string;
  name: string;
  points: number;
  matches: number;
}

type MatchRow = {
  score_one: number | null;
  score_two: number | null;
  registration_one_id: string | null;
  registration_two_id: string | null;
  pair_one_player_one_id: string | null;
  pair_one_player_two_id: string | null;
  pair_two_player_one_id: string | null;
  pair_two_player_two_id: string | null;
};
type RegRow = {
  id: string;
  team_id: string | null;
  player_one_id: string | null;
  player_two_id: string | null;
  player_id: string | null;
};

/**
 * Ranking interno de la comunidad: por jugador, suma de puntos/games a favor
 * en todos los partidos COMPLETED de los torneos organizados por la comunidad
 * (fijo y random). Para fijo resuelve los jugadores de cada inscripción; para
 * random usa los 4 jugadores del partido.
 */
export async function getCommunityPlayerRanking(
  supabase: ServerSupabase,
  communityId: string,
): Promise<CommunityRankingEntry[]> {
  const { data: tData } = await supabase
    .from('tournaments')
    .select('id')
    .eq('community_id', communityId);
  const tIds = ((tData ?? []) as { id: string }[]).map((t) => t.id);
  if (!tIds.length) return [];

  const { data: mData } = await supabase
    .from('matches')
    .select(
      'score_one, score_two, registration_one_id, registration_two_id, pair_one_player_one_id, pair_one_player_two_id, pair_two_player_one_id, pair_two_player_two_id',
    )
    .in('tournament_id', tIds)
    .eq('status', 'completed');
  const matches = (mData ?? []) as MatchRow[];
  if (!matches.length) return [];

  // Resolver inscripción → jugadores (para partidos de formato fijo).
  const regIds = [
    ...new Set(
      matches.flatMap((m) => [m.registration_one_id, m.registration_two_id]).filter(Boolean) as string[],
    ),
  ];
  const regPlayers = new Map<string, string[]>();
  if (regIds.length) {
    const { data: regData } = await supabase
      .from('tournament_registrations')
      .select('id, team_id, player_one_id, player_two_id, player_id')
      .in('id', regIds);
    const regs = (regData ?? []) as RegRow[];
    const teamIds = [...new Set(regs.map((r) => r.team_id).filter(Boolean) as string[])];
    const teamPlayers = new Map<string, string[]>();
    if (teamIds.length) {
      const { data: tmData } = await supabase
        .from('team_members')
        .select('team_id, profile_id')
        .in('team_id', teamIds)
        .eq('is_active', true);
      for (const row of (tmData ?? []) as { team_id: string; profile_id: string }[]) {
        const arr = teamPlayers.get(row.team_id) ?? [];
        arr.push(row.profile_id);
        teamPlayers.set(row.team_id, arr);
      }
    }
    for (const r of regs) {
      let ps: string[] = [];
      if (r.team_id && teamPlayers.has(r.team_id)) ps = teamPlayers.get(r.team_id)!;
      else ps = [r.player_one_id, r.player_two_id, r.player_id].filter(Boolean) as string[];
      regPlayers.set(r.id, ps);
    }
  }

  const acc = new Map<string, { points: number; matches: number }>();
  const add = (pid: string, n: number) => {
    const e = acc.get(pid) ?? { points: 0, matches: 0 };
    e.points += n;
    e.matches += 1;
    acc.set(pid, e);
  };
  const sidePlayers = (m: MatchRow, side: 'one' | 'two'): string[] => {
    if (side === 'one') {
      if (m.pair_one_player_one_id) {
        return [m.pair_one_player_one_id, m.pair_one_player_two_id].filter(Boolean) as string[];
      }
      return m.registration_one_id ? (regPlayers.get(m.registration_one_id) ?? []) : [];
    }
    if (m.pair_two_player_one_id) {
      return [m.pair_two_player_one_id, m.pair_two_player_two_id].filter(Boolean) as string[];
    }
    return m.registration_two_id ? (regPlayers.get(m.registration_two_id) ?? []) : [];
  };

  for (const m of matches) {
    const s1 = m.score_one ?? 0;
    const s2 = m.score_two ?? 0;
    for (const p of sidePlayers(m, 'one')) add(p, s1);
    for (const p of sidePlayers(m, 'two')) add(p, s2);
  }

  const ids = [...acc.keys()];
  if (!ids.length) return [];
  const { data: profData } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);
  const nameMap = new Map(
    ((profData ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
  );

  return ids
    .map((id) => ({
      playerId: id,
      name: nameMap.get(id) ?? '?',
      points: acc.get(id)!.points,
      matches: acc.get(id)!.matches,
    }))
    .sort((a, b) => b.points - a.points || b.matches - a.matches)
    .slice(0, 20);
}
