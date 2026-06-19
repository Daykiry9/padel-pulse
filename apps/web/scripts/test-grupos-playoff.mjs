// Test e2e del híbrido grupos+playoff (Fase 3): crea torneo grupos_eliminacion,
// pobla 2 grupos de 3 parejas (round-robin), cierra los grupos, calcula
// clasificados (top 2 c/u), genera el playoff (4 clasificados → 2 SF + final con
// enlaces), cierra el playoff y verifica el campeón. Limpia al final.
//
// Uso:  node apps/web/scripts/test-grupos-playoff.mjs
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const COMMUNITY_ID = '03454add-8e0e-4218-b6d0-b9a94a0125a1';
const OWNER_ID = 'cb28046d-88f0-474c-836d-8d0f01443993';
const TAG = Date.now().toString(36);
let tournamentId = null;
const guestIds = [];
let pass = 0, fail = 0;
const check = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ ${m}`); } };

// Réplicas de la lógica del dominio (ya cubierta por unit tests).
function standings(matches, g) {
  const t = new Map();
  const ens = (id) => { let s = t.get(id); if (!s) { s = { id, wins: 0, diff: 0, sf: 0 }; t.set(id, s); } return s; };
  for (const m of matches.filter((x) => x.group_number === g && x.status === 'completed')) {
    const a = ens(m.registration_one_id), b = ens(m.registration_two_id);
    a.diff += m.score_one - m.score_two; b.diff += m.score_two - m.score_one;
    a.sf += m.score_one; b.sf += m.score_two;
    if (m.score_one > m.score_two) a.wins++; else b.wins++;
  }
  return [...t.values()].sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.sf - x.sf);
}
async function advance(matchId) {
  const { data: m } = await admin.from('matches').select('next_match_id, next_match_slot, registration_one_id, registration_two_id, score_one, score_two').eq('id', matchId).single();
  if (!m.next_match_id) return;
  const w = m.score_one > m.score_two ? m.registration_one_id : m.registration_two_id;
  const col = m.next_match_slot === 1 ? 'registration_one_id' : 'registration_two_id';
  await admin.from('matches').update({ [col]: w }).eq('id', m.next_match_id);
}
async function close(id, a, b) {
  await admin.from('matches').update({ score_one: a, score_two: b, status: 'completed', ended_at: new Date().toISOString() }).eq('id', id);
  await advance(id);
}

async function main() {
  const startsAt = new Date(Date.now() + 86400000);
  const { data: t, error: tErr } = await admin.from('tournaments').insert({
    slug: `test-gp-${TAG}`, name: 'Test Grupos Playoff', format: 'grupos_eliminacion', tier: 'competitivo',
    weight: 1, status: 'open', scope: 'community', category_kind: 'casual', competition_unit: 'team',
    community_id: COMMUNITY_ID, starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + 6 * 3600000).toISOString(),
    registration_deadline: new Date(startsAt.getTime() - 3600000).toISOString(), max_teams: 8, min_teams: 4,
    price_per_team: 0, points_per_match: 12, rotation_games: 24, num_groups: 2, qualifiers_per_group: 2,
  }).select('id').single();
  if (tErr) throw new Error('tournament: ' + tErr.message);
  tournamentId = t.id;
  check(true, 'torneo grupos_eliminacion creado (2 grupos, 2 clasifican)');

  // 6 parejas
  const regs = [];
  for (let p = 0; p < 6; p++) {
    const g1 = (await admin.from('guest_players').insert({ tournament_id: tournamentId, display_name: `G${p}A ${TAG}`, created_by: OWNER_ID }).select('id').single()).data.id;
    const g2 = (await admin.from('guest_players').insert({ tournament_id: tournamentId, display_name: `G${p}B ${TAG}`, created_by: OWNER_ID }).select('id').single()).data.id;
    guestIds.push(g1, g2);
    regs.push((await admin.from('tournament_registrations').insert({ tournament_id: tournamentId, guest_player_one_id: g1, guest_player_two_id: g2, registered_by: OWNER_ID, status: 'confirmed', payment_amount: 0, confirmed_at: new Date().toISOString() }).select('id').single()).data.id);
  }
  // grupos: [0,2,4] grupo 1, [1,3,5] grupo 2 (serpentina i%2)
  const groupA = [regs[0], regs[2], regs[4]], groupB = [regs[1], regs[3], regs[5]];
  const gmRows = [];
  for (const [gi, grp] of [[1, groupA], [2, groupB]]) {
    let court = 1;
    for (let i = 0; i < grp.length; i++) for (let j = i + 1; j < grp.length; j++) {
      gmRows.push({ id: randomUUID(), tournament_id: tournamentId, round_number: 1, court_number: court++, registration_one_id: grp[i], registration_two_id: grp[j], status: 'scheduled', group_number: gi, stage: 'group' });
    }
  }
  const { error: gErr } = await admin.from('matches').insert(gmRows);
  check(!gErr, `fase de grupos persistida (${gmRows.length} matches, group_number+stage)${gErr ? ' — ' + gErr.message : ''}`);

  // Cerrar todos los grupos con un orden claro (primer reg de cada grupo gana todo)
  console.log('\n[grupos] cerrando partidos:');
  for (const m of gmRows) {
    // el de menor índice en su grupo gana
    const grp = m.group_number === 1 ? groupA : groupB;
    const oneWins = grp.indexOf(m.registration_one_id) < grp.indexOf(m.registration_two_id);
    await admin.from('matches').update({ score_one: oneWins ? 6 : 2, score_two: oneWins ? 2 : 6, status: 'completed' }).eq('id', m.id);
  }
  const { data: closedGroups } = await admin.from('matches').select('group_number, registration_one_id, registration_two_id, score_one, score_two, status').eq('tournament_id', tournamentId).eq('stage', 'group');
  const allDone = closedGroups.every((m) => m.status === 'completed');
  check(allDone, 'todos los partidos de grupos cerrados');

  // Clasificados top-2 por grupo
  const q1 = standings(closedGroups, 1).slice(0, 2).map((s) => s.id);
  const q2 = standings(closedGroups, 2).slice(0, 2).map((s) => s.id);
  check(q1[0] === groupA[0] && q2[0] === groupB[0], 'el 1º de cada grupo es el que ganó todo');
  // cross-seed: [1A,1B,2B,2A]
  const seeded = [q1[0], q2[0], q2[1], q1[1]];
  check(seeded.filter(Boolean).length === 4, '4 clasificados al playoff');

  // [playoff] 2 SF + final
  console.log('\n[playoff] generando llave con clasificados:');
  const sf1 = randomUUID(), sf2 = randomUUID(), finalId = randomUUID();
  const pErr = (await admin.from('matches').insert([
    { id: sf1, tournament_id: tournamentId, round_number: 1, court_number: 1, registration_one_id: seeded[0], registration_two_id: seeded[1], status: 'scheduled', match_code: 'r1-m1', next_match_id: finalId, next_match_slot: 1, is_bye: false, stage: 'playoff' },
    { id: sf2, tournament_id: tournamentId, round_number: 1, court_number: 2, registration_one_id: seeded[2], registration_two_id: seeded[3], status: 'scheduled', match_code: 'r1-m2', next_match_id: finalId, next_match_slot: 2, is_bye: false, stage: 'playoff' },
    { id: finalId, tournament_id: tournamentId, round_number: 2, court_number: 1, registration_one_id: null, registration_two_id: null, status: 'scheduled', match_code: 'r2-m1', next_match_id: null, next_match_slot: null, is_bye: false, stage: 'playoff' },
  ])).error;
  check(!pErr, `playoff persistido (stage=playoff, enlazado)${pErr ? ' — ' + pErr.message : ''}`);

  await close(sf1, 6, 3);
  await close(sf2, 4, 6);
  const { data: finalAfter } = await admin.from('matches').select('registration_one_id, registration_two_id').eq('id', finalId).single();
  check(finalAfter.registration_one_id === seeded[0] && finalAfter.registration_two_id === seeded[3], 'ganadores de semis avanzaron a la final');
  await close(finalId, 6, 2);
  const { data: champ } = await admin.from('matches').select('registration_one_id, score_one, score_two').eq('id', finalId).single();
  check(champ.score_one > champ.score_two && champ.registration_one_id === seeded[0], 'campeón del híbrido correcto');
}

main().catch((e) => { fail++; console.error('\n✗ ERROR:', e.message); }).finally(async () => {
  if (tournamentId) {
    await admin.from('matches').delete().eq('tournament_id', tournamentId);
    await admin.from('tournament_registrations').delete().eq('tournament_id', tournamentId);
    if (guestIds.length) await admin.from('guest_players').delete().in('id', guestIds);
    await admin.from('tournaments').delete().eq('id', tournamentId);
    console.log('\n✓ Cleanup completo');
  }
  console.log(`\n${'='.repeat(50)}\nRESULTADO: ${pass} pass, ${fail} fail\n${'='.repeat(50)}`);
  process.exit(fail > 0 ? 1 : 0);
});
