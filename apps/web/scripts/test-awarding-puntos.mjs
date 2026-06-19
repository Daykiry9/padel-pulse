// Valida el camino DB del awarding (Fase: puntos por posición): que player_points
// y team_points aceptan los rows que genera finishTournament, que el upsert con
// onConflict es idempotente (re-finalizar no duplica) y que el trigger de
// sugerencia de categoría no rompe la inserción. Limpia al final.
//
// Uso:  node apps/web/scripts/test-awarding-puntos.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const COMMUNITY_ID = '03454add-8e0e-4218-b6d0-b9a94a0125a1';
const OWNER_ID = 'cb28046d-88f0-474c-836d-8d0f01443993';
const TAG = Date.now().toString(36);
let tournamentId = null, teamId = null;
let pass = 0, fail = 0;
const check = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.error(`  ✗ ${m}`); } };

async function main() {
  const startsAt = new Date(Date.now() - 86400000);
  const { data: t } = await admin.from('tournaments').insert({
    slug: `test-aw-${TAG}`, name: 'Test Awarding', format: 'liga', tier: 'competitivo', weight: 1,
    status: 'finished', scope: 'community', category_kind: 'estandar', category: 'cuarta',
    competition_unit: 'team', community_id: COMMUNITY_ID, starts_at: startsAt.toISOString(),
    ends_at: new Date().toISOString(), registration_deadline: startsAt.toISOString(),
    max_teams: 8, min_teams: 2, price_per_team: 0, points_per_match: 12, rotation_games: 24,
  }).select('id').single();
  tournamentId = t.id;
  check(true, 'torneo finished creado');

  // player_points: el row tal como lo arma awardTournamentPositionPoints
  const pRow = { profile_id: OWNER_ID, community_id: COMMUNITY_ID, tournament_id: tournamentId, category: 'cuarta', position: 1, points: 100, weight_applied: 1.0 };
  const { error: e1 } = await admin.from('player_points').upsert([pRow], { onConflict: 'profile_id,tournament_id' });
  check(!e1, `player_points insertado (constraint + trigger de sugerencia ok)${e1 ? ' — ' + e1.message : ''}`);

  // upsert de nuevo (idempotencia: re-finalizar no duplica)
  const { error: e2 } = await admin.from('player_points').upsert([{ ...pRow, points: 100 }], { onConflict: 'profile_id,tournament_id' });
  check(!e2, `upsert idempotente acepta onConflict profile_id,tournament_id${e2 ? ' — ' + e2.message : ''}`);
  const { count: pCount } = await admin.from('player_points').select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId);
  check(pCount === 1, `no se duplicó player_points tras 2 upserts (count=${pCount})`);

  // team_points: requiere un team real
  const { data: team } = await admin.from('teams').insert({ name: `Test Team ${TAG}`, slug: `test-team-${TAG}`, category: 'cuarta', primary_community_id: COMMUNITY_ID }).select('id').single();
  teamId = team?.id ?? null;
  if (teamId) {
    const tRow = { team_id: teamId, community_id: COMMUNITY_ID, tournament_id: tournamentId, category: 'cuarta', position: 1, points: 100 };
    const { error: e3 } = await admin.from('team_points').upsert([tRow], { onConflict: 'team_id,tournament_id' });
    check(!e3, `team_points insertado${e3 ? ' — ' + e3.message : ''}`);
    const { error: e4 } = await admin.from('team_points').upsert([tRow], { onConflict: 'team_id,tournament_id' });
    const { count: tCount } = await admin.from('team_points').select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId);
    check(!e4 && tCount === 1, `upsert idempotente de team_points (count=${tCount})`);
  } else {
    check(false, 'no se pudo crear team de prueba');
  }
}

main().catch((e) => { fail++; console.error('\n✗ ERROR:', e.message); }).finally(async () => {
  if (tournamentId) {
    await admin.from('player_points').delete().eq('tournament_id', tournamentId);
    await admin.from('team_points').delete().eq('tournament_id', tournamentId);
    await admin.from('tournaments').delete().eq('id', tournamentId);
  }
  if (teamId) await admin.from('teams').delete().eq('id', teamId);
  // limpiar posible sugerencia generada por el trigger
  await admin.from('category_change_suggestions').delete().eq('profile_id', OWNER_ID).eq('status', 'suggested');
  console.log('\n✓ Cleanup completo');
  console.log(`\n${'='.repeat(50)}\nRESULTADO: ${pass} pass, ${fail} fail\n${'='.repeat(50)}`);
  process.exit(fail > 0 ? 1 : 0);
});
