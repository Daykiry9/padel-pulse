// Test de re-edición de marcador cerrado (fix de regresión):
//  A) ELO recompute: al re-editar un partido ya cerrado, reverseMatchElo debe
//     revertir EXACTO el ELO previo (vuelve al baseline) y limpiar elo_history,
//     y el recompute con el nuevo marcador deja el ELO correcto (sin duplicar).
//  B) Guard de bracket: no pisar el slot del partido siguiente si ya se jugó
//     (evita corromper una llave); sí propagar si el siguiente sigue scheduled.
// Replica la lógica de reverseMatchElo + advanceBracketWinner del server contra
// la DB real (RPC apply_elo_delta + elo_history). Crea auth users throwaway y
// limpia todo al final.
//
// Uso:  node apps/web/scripts/test-reedicion-marcador.mjs
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const COMMUNITY_ID = '03454add-8e0e-4218-b6d0-b9a94a0125a1';
const OWNER_ID = 'cb28046d-88f0-474c-836d-8d0f01443993';
const TAG = Date.now().toString(36);

let pass = 0, fail = 0;
const check = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ ${m}`); } };

const authUserIds = [];
const tournamentIds = [];
const guestIds = [];

// ── Réplica de reverseMatchElo del server ─────────────────────────────
async function reverseMatchElo(matchId) {
  const { data } = await admin.from('elo_history').select('profile_id, delta').eq('match_id', matchId);
  const rows = data ?? [];
  if (rows.length === 0) return;
  await Promise.all(
    rows.map((row) => admin.rpc('apply_elo_delta', { p_profile_id: row.profile_id, p_delta: -row.delta, p_match_id: matchId })),
  );
  await admin.from('elo_history').delete().eq('match_id', matchId);
}
// ── Réplica de advanceBracketWinner (con guard de status) ─────────────
async function advance(matchId) {
  const { data: m } = await admin
    .from('matches')
    .select('next_match_id, next_match_slot, registration_one_id, registration_two_id, score_one, score_two')
    .eq('id', matchId).single();
  if (!m.next_match_id || !m.next_match_slot) return;
  const winner = m.score_one > m.score_two ? m.registration_one_id : m.score_two > m.score_one ? m.registration_two_id : null;
  if (!winner) return;
  const { data: next } = await admin.from('matches').select('status').eq('id', m.next_match_id).maybeSingle();
  if (next?.status && next.status !== 'scheduled') return; // ← guard nuevo
  const col = m.next_match_slot === 1 ? 'registration_one_id' : 'registration_two_id';
  await admin.from('matches').update({ [col]: winner }).eq('id', m.next_match_id);
}
async function eloOf(id) {
  const { data } = await admin.from('profiles').select('elo_rating').eq('id', id).single();
  return data.elo_rating;
}
async function histCount(matchId) {
  const { count } = await admin.from('elo_history').select('*', { count: 'exact', head: true }).eq('match_id', matchId);
  return count;
}

let tourSeq = 0;
async function mkTournament(format) {
  const startsAt = new Date(Date.now() + 86400000);
  const { data: t, error } = await admin.from('tournaments').insert({
    slug: `test-reedit-${format}-${TAG}-${tourSeq++}`, name: 'Test Reedicion', format, tier: 'competitivo',
    weight: 1, status: 'in_progress', scope: 'community', category_kind: 'casual', competition_unit: 'team',
    community_id: COMMUNITY_ID, starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + 6 * 3600000).toISOString(),
    registration_deadline: new Date(startsAt.getTime() - 3600000).toISOString(), max_teams: 8, min_teams: 2,
    price_per_team: 0, points_per_match: 12, rotation_games: 24,
  }).select('id').single();
  if (error) throw new Error('tournament: ' + error.message);
  tournamentIds.push(t.id);
  return t.id;
}

async function main() {
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n[A] ELO: revertir exacto al re-editar un partido cerrado');
  // 4 profiles reales con ELO baseline 1000
  const players = [];
  for (let i = 0; i < 4; i++) {
    const { data: u, error: uErr } = await admin.auth.admin.createUser({
      email: `test-reedit-${TAG}-${i}@example.com`, password: randomUUID(), email_confirm: true,
    });
    if (uErr) throw new Error('auth user: ' + uErr.message);
    authUserIds.push(u.user.id);
    // El trigger handle_new_user ya crea el profile; solo fijamos el ELO baseline.
    const { error: pErr } = await admin.from('profiles')
      .update({ display_name: `Reedit ${i} ${TAG}`, elo_rating: 1000 })
      .eq('id', u.user.id);
    if (pErr) throw new Error('profile: ' + pErr.message);
    players.push(u.user.id);
  }
  check(players.length === 4, '4 profiles con ELO 1000 creados');

  const tA = await mkTournament('eliminacion');
  const matchId = randomUUID();
  await admin.from('matches').insert({
    id: matchId, tournament_id: tA, round_number: 1, court_number: 1,
    status: 'scheduled', match_code: 'r1-m1', is_bye: false,
  });

  // Primer cierre 12-6: pareja A (p0,p1) gana → +20; pareja B (p2,p3) pierde → -20
  await Promise.all([
    admin.rpc('apply_elo_delta', { p_profile_id: players[0], p_delta: 20, p_match_id: matchId }),
    admin.rpc('apply_elo_delta', { p_profile_id: players[1], p_delta: 20, p_match_id: matchId }),
    admin.rpc('apply_elo_delta', { p_profile_id: players[2], p_delta: -20, p_match_id: matchId }),
    admin.rpc('apply_elo_delta', { p_profile_id: players[3], p_delta: -20, p_match_id: matchId }),
  ]);
  await admin.from('matches').update({ elo_applied_at: new Date().toISOString() }).eq('id', matchId);
  check(await eloOf(players[0]) === 1020 && await eloOf(players[2]) === 980, 'tras cerrar 12-6: ganadores 1020, perdedores 980');
  check(await histCount(matchId) === 4, 'elo_history: 4 filas del match');

  // Re-edición → REVERT: debe volver EXACTO a 1000 y limpiar historial
  await reverseMatchElo(matchId);
  const backToBaseline = (await Promise.all(players.map(eloOf))).every((e) => e === 1000);
  check(backToBaseline, 'reverseMatchElo: ELO vuelve EXACTO al baseline 1000');
  check(await histCount(matchId) === 0, 'reverseMatchElo: elo_history del match limpio (0 filas)');

  // Recompute con el nuevo marcador 6-12 (invertido): A pierde -15, B gana +15
  await Promise.all([
    admin.rpc('apply_elo_delta', { p_profile_id: players[0], p_delta: -15, p_match_id: matchId }),
    admin.rpc('apply_elo_delta', { p_profile_id: players[1], p_delta: -15, p_match_id: matchId }),
    admin.rpc('apply_elo_delta', { p_profile_id: players[2], p_delta: 15, p_match_id: matchId }),
    admin.rpc('apply_elo_delta', { p_profile_id: players[3], p_delta: 15, p_match_id: matchId }),
  ]);
  check(await eloOf(players[0]) === 985 && await eloOf(players[2]) === 1015, 'tras recompute 6-12: resultado invertido (985 / 1015), sin duplicar');
  check(await histCount(matchId) === 4, 'elo_history: exactamente 4 filas nuevas (no 8)');

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n[B] Bracket: no pisar el partido siguiente si ya se jugó');
  const tB = await mkTournament('eliminacion');
  const regIds = [];
  for (let p = 0; p < 4; p++) {
    const g1 = (await admin.from('guest_players').insert({ tournament_id: tB, display_name: `B${p}A ${TAG}`, created_by: OWNER_ID }).select('id').single()).data.id;
    const g2 = (await admin.from('guest_players').insert({ tournament_id: tB, display_name: `B${p}B ${TAG}`, created_by: OWNER_ID }).select('id').single()).data.id;
    guestIds.push(g1, g2);
    const r = (await admin.from('tournament_registrations').insert({
      tournament_id: tB, guest_player_one_id: g1, guest_player_two_id: g2,
      registered_by: OWNER_ID, status: 'confirmed', payment_amount: 0, confirmed_at: new Date().toISOString(),
    }).select('id').single()).data.id;
    regIds.push(r);
  }
  const sf1 = randomUUID(), sf2 = randomUUID(), finalId = randomUUID();
  await admin.from('matches').insert([
    { id: sf1, tournament_id: tB, round_number: 1, court_number: 1, registration_one_id: regIds[0], registration_two_id: regIds[1], status: 'scheduled', match_code: 'r1-m1', next_match_id: finalId, next_match_slot: 1, is_bye: false },
    { id: sf2, tournament_id: tB, round_number: 1, court_number: 2, registration_one_id: regIds[2], registration_two_id: regIds[3], status: 'scheduled', match_code: 'r1-m2', next_match_id: finalId, next_match_slot: 2, is_bye: false },
    { id: finalId, tournament_id: tB, round_number: 2, court_number: 1, registration_one_id: null, registration_two_id: null, status: 'scheduled', match_code: 'r2-m1', is_bye: false },
  ]);

  // Cerrar semi1 (gana reg0 → final slot1) y semi2 (gana reg3 → final slot2)
  await admin.from('matches').update({ score_one: 6, score_two: 3, status: 'completed' }).eq('id', sf1);
  await advance(sf1);
  await admin.from('matches').update({ score_one: 2, score_two: 6, status: 'completed' }).eq('id', sf2);
  await advance(sf2);
  let fin = (await admin.from('matches').select('registration_one_id, registration_two_id, status').eq('id', finalId).single()).data;
  check(fin.registration_one_id === regIds[0] && fin.registration_two_id === regIds[3], 'semis avanzan a la final (slots reg0 y reg3)');

  // Caso PERMITIDO: la final sigue scheduled → re-editar semi1 invirtiendo actualiza el slot
  await admin.from('matches').update({ score_one: 3, score_two: 6 }).eq('id', sf1); // ahora gana reg1
  await advance(sf1);
  fin = (await admin.from('matches').select('registration_one_id').eq('id', finalId).single()).data;
  check(fin.registration_one_id === regIds[1], 'final scheduled: re-edición propaga el nuevo ganador (reg1) al slot 1');

  // Ahora se juega la final → completed
  await admin.from('matches').update({ registration_one_id: regIds[1], score_one: 6, score_two: 4, status: 'completed' }).eq('id', finalId);

  // Caso BLOQUEADO: re-editar semi1 invirtiendo de nuevo, pero la final ya se jugó.
  // 1) Pre-check de reportMatchScore: oldWinner != newWinner && next.status != scheduled → bloquear.
  const semi = (await admin.from('matches').select('score_one, score_two, registration_one_id, registration_two_id, next_match_id').eq('id', sf1).single()).data;
  const oldWinner = semi.score_one > semi.score_two ? semi.registration_one_id : semi.registration_two_id; // reg1
  const newWinner = 6 > 3 ? semi.registration_one_id : semi.registration_two_id; // volver a 6-3 → reg0
  const nextStatus = (await admin.from('matches').select('status').eq('id', semi.next_match_id).single()).data.status;
  const wouldBlock = oldWinner !== newWinner && nextStatus !== 'scheduled';
  check(wouldBlock, 'pre-check bloquea la re-edición que invierte al ganador con la final ya jugada');

  // 2) advanceBracketWinner NO debe pisar el slot de una final ya jugada aunque se llame.
  const finBefore = (await admin.from('matches').select('registration_one_id').eq('id', finalId).single()).data.registration_one_id;
  await admin.from('matches').update({ score_one: 6, score_two: 3 }).eq('id', sf1); // invierte a reg0
  await advance(sf1); // guard: final completed → no-op
  const finAfter = (await admin.from('matches').select('registration_one_id').eq('id', finalId).single()).data.registration_one_id;
  check(finBefore === finAfter, 'advanceBracketWinner NO pisa el slot de la final ya jugada (guard)');
}

main()
  .catch((e) => { fail++; console.error('\n✗ ERROR:', e.message); })
  .finally(async () => {
    for (const tid of tournamentIds) {
      await admin.from('matches').delete().eq('tournament_id', tid);
      await admin.from('tournament_registrations').delete().eq('tournament_id', tid);
      await admin.from('tournaments').delete().eq('id', tid);
    }
    if (guestIds.length) await admin.from('guest_players').delete().in('id', guestIds);
    for (const uid of authUserIds) await admin.auth.admin.deleteUser(uid); // cascade → profiles + elo_history
    console.log('\n✓ Cleanup completo');
    console.log(`\n${'='.repeat(52)}\nRESULTADO: ${pass} pass, ${fail} fail\n${'='.repeat(52)}`);
    process.exit(fail > 0 ? 1 : 0);
  });
