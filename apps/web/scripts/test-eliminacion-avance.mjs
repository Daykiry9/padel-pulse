// Test del modelo de avance de bracket (Fase 2): crea un torneo de eliminación
// con 4 parejas, persiste el bracket completo (2 semis + final enlazadas con
// next_match_id/slot), cierra las semis y verifica que el ganador AVANZA solo a
// la final, luego cierra la final y verifica el campeón. Replica la lógica de
// advanceBracketWinner del server. Limpia al final.
//
// Uso:  node apps/web/scripts/test-eliminacion-avance.mjs
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

let tournamentId = null;
const guestIds = [];
let pass = 0, fail = 0;
const check = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ ${m}`); } };

// Réplica de advanceBracketWinner del server.
async function advance(matchId) {
  const { data: m } = await admin
    .from('matches')
    .select('next_match_id, next_match_slot, registration_one_id, registration_two_id, score_one, score_two')
    .eq('id', matchId).single();
  if (!m.next_match_id || !m.next_match_slot) return;
  const winner = m.score_one > m.score_two ? m.registration_one_id : m.score_two > m.score_one ? m.registration_two_id : null;
  if (!winner) return;
  const col = m.next_match_slot === 1 ? 'registration_one_id' : 'registration_two_id';
  await admin.from('matches').update({ [col]: winner }).eq('id', m.next_match_id);
}
async function closeMatch(matchId, a, b) {
  await admin.from('matches').update({ score_one: a, score_two: b, status: 'completed', ended_at: new Date().toISOString() }).eq('id', matchId);
  await advance(matchId);
}

async function main() {
  const startsAt = new Date(Date.now() + 86400000);
  const { data: t, error: tErr } = await admin.from('tournaments').insert({
    slug: `test-elim-${TAG}`, name: 'Test Eliminacion', format: 'eliminacion', tier: 'competitivo',
    weight: 1, status: 'open', scope: 'community', category_kind: 'casual', competition_unit: 'team',
    community_id: COMMUNITY_ID, starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + 6 * 3600000).toISOString(),
    registration_deadline: new Date(startsAt.getTime() - 3600000).toISOString(), max_teams: 8, min_teams: 2,
    price_per_team: 0, points_per_match: 12, rotation_games: 24,
  }).select('id').single();
  if (tErr) throw new Error('tournament: ' + tErr.message);
  tournamentId = t.id;
  console.log('\n[1] Torneo de eliminación creado');

  // 4 parejas de invitados
  const regIds = [];
  for (let p = 0; p < 4; p++) {
    const g1 = (await admin.from('guest_players').insert({ tournament_id: tournamentId, display_name: `E${p}A ${TAG}`, created_by: OWNER_ID }).select('id').single()).data.id;
    const g2 = (await admin.from('guest_players').insert({ tournament_id: tournamentId, display_name: `E${p}B ${TAG}`, created_by: OWNER_ID }).select('id').single()).data.id;
    guestIds.push(g1, g2);
    const r = (await admin.from('tournament_registrations').insert({
      tournament_id: tournamentId, guest_player_one_id: g1, guest_player_two_id: g2,
      registered_by: OWNER_ID, status: 'confirmed', payment_amount: 0, confirmed_at: new Date().toISOString(),
    }).select('id').single()).data.id;
    regIds.push(r);
  }
  check(regIds.length === 4, '4 parejas inscritas');

  // [2] Persistir bracket: 2 semifinales + 1 final enlazada (réplica del case eliminacion)
  const sf1 = randomUUID(), sf2 = randomUUID(), finalId = randomUUID();
  const rows = [
    { id: sf1, tournament_id: tournamentId, round_number: 1, court_number: 1, registration_one_id: regIds[0], registration_two_id: regIds[1], status: 'scheduled', match_code: 'r1-m1', next_match_id: finalId, next_match_slot: 1, is_bye: false },
    { id: sf2, tournament_id: tournamentId, round_number: 1, court_number: 2, registration_one_id: regIds[2], registration_two_id: regIds[3], status: 'scheduled', match_code: 'r1-m2', next_match_id: finalId, next_match_slot: 2, is_bye: false },
    { id: finalId, tournament_id: tournamentId, round_number: 2, court_number: 1, registration_one_id: null, registration_two_id: null, status: 'scheduled', match_code: 'r2-m1', next_match_id: null, next_match_slot: null, is_bye: false },
  ];
  const { error: insErr } = await admin.from('matches').insert(rows);
  check(!insErr, `bracket persistido (2 semis + final con next_match_id)${insErr ? ' — ' + insErr.message : ''}`);

  // [3] Cerrar semifinales → el ganador debe avanzar a la final
  console.log('\n[3] Cerrando semifinales y verificando avance automático:');
  await closeMatch(sf1, 6, 3); // gana reg[0] (slot one de la final)
  await closeMatch(sf2, 2, 6); // gana reg[3] (slot two de la final)

  const { data: finalAfter } = await admin.from('matches').select('registration_one_id, registration_two_id, status').eq('id', finalId).single();
  check(finalAfter.registration_one_id === regIds[0], 'ganador de la semi 1 avanzó al slot 1 de la final');
  check(finalAfter.registration_two_id === regIds[3], 'ganador de la semi 2 avanzó al slot 2 de la final');
  check(finalAfter.status === 'scheduled', 'la final quedó lista para jugarse (scheduled, ambos slots llenos)');

  // [4] Cerrar la final → campeón
  console.log('\n[4] Cerrando la final:');
  await closeMatch(finalId, 6, 4); // gana reg[0]
  const { data: finalDone } = await admin.from('matches').select('registration_one_id, registration_two_id, score_one, score_two, next_match_id').eq('id', finalId).single();
  const champion = finalDone.score_one > finalDone.score_two ? finalDone.registration_one_id : finalDone.registration_two_id;
  check(champion === regIds[0], `campeón correcto (pareja 1)`);
  check(finalDone.next_match_id === null, 'la final no avanza a ningún lado (next_match_id null)');
}

main()
  .catch((e) => { fail++; console.error('\n✗ ERROR:', e.message); })
  .finally(async () => {
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
