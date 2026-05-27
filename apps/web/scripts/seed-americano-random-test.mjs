// Seed de un AMERICANO RANDOM (social) lleno e iniciado en la comunidad del
// owner, para testear inscripción individual + parejas que rotan + tabla de
// posiciones por jugador + reporte/confirmación de scores.
//
// Crea: 12 usuarios test (seedrnd+) inscritos INDIVIDUALMENTE + el torneo
// americano_random in_progress (organizado por la comunidad, sin club) +
// bracket random (4 jugadores por cancha, 6 rondas) con estados variados.
//
// Uso:  node apps/web/scripts/seed-americano-random-test.mjs
// Idempotencia: limpia runs previos (torneos americano-random-test-* + usuarios seedrnd+).

import { readFileSync } from 'node:fs';
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

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const COMMUNITY_ID = '54f547e6-db0b-4d91-85ef-fd3df713feac';
const OWNER_ID = 'cb28046d-88f0-474c-836d-8d0f01443993';
const TAG = Date.now().toString(36);
const SHARED_PASSWORD = 'PadelTest2026!';
const COURTS = 3;
const ROUNDS = 6;

const NAMES = [
  'Rafa Nadal', 'Juan Lebrón', 'Ale Galán', 'Fede Chingotto',
  'Agus Tapia', 'Pablo Lima', 'Martín Di Nenno', 'Sanyo Gutiérrez',
  'Coki Nieto', 'Momo González', 'Lucho Capra', 'Edu Alonso',
];

async function cleanupPrevious() {
  const { data: testT } = await admin
    .from('tournaments')
    .select('id')
    .like('slug', 'americano-random-test-%');
  const tIds = (testT ?? []).map((t) => t.id);
  if (tIds.length) await admin.from('tournaments').delete().in('id', tIds);
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const stale = (list?.users ?? []).filter((u) => u.email?.startsWith('seedrnd+'));
  for (const u of stale) await admin.auth.admin.deleteUser(u.id);
  if (tIds.length || stale.length) {
    console.log(`✓ Cleanup: ${tIds.length} torneos + ${stale.length} usuarios de runs previos`);
  }
}

// Pareo random simple y determinístico (para el seed; el real usa
// generateRandomAmericano del dominio): cada ronda mezcla y arma grupos de 4.
function genRandomRounds(playerIds, courts, rounds) {
  let seed = 987654321;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out = [];
  const perRound = Math.min(courts * 4, playerIds.length - (playerIds.length % 4));
  for (let r = 0; r < rounds; r++) {
    const shuffled = [...playerIds].sort(() => rand() - 0.5).slice(0, perRound);
    const matches = [];
    for (let c = 0; c < perRound / 4; c++) {
      const four = shuffled.slice(c * 4, c * 4 + 4);
      matches.push({
        round: r + 1,
        court: c + 1,
        p1a: four[0],
        p1b: four[1],
        p2a: four[2],
        p2b: four[3],
      });
    }
    out.push(matches);
  }
  return out;
}

async function main() {
  await cleanupPrevious();

  // 1) 12 usuarios test + profiles + membresía en la comunidad
  const players = [];
  for (let i = 0; i < NAMES.length; i++) {
    const email = `seedrnd+${TAG}-${i}@padelking.test`;
    const { data: u, error: uErr } = await admin.auth.admin.createUser({
      email,
      password: SHARED_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: NAMES[i] },
    });
    if (uErr) throw new Error(`createUser ${i}: ${uErr.message}`);
    const id = u.user.id;
    await admin.from('profiles').upsert({
      id,
      display_name: NAMES[i],
      skill_category: 'cuarta',
      gender: 'male',
      city: 'Bogotá',
      elo_rating: 980 + i * 6,
    });
    await admin.from('community_members').insert({ community_id: COMMUNITY_ID, profile_id: id, role: 'member' });
    players.push({ id, name: NAMES[i], email });
  }
  console.log(`✓ ${players.length} usuarios test creados + agregados a la comunidad`);

  // 2) Torneo americano_random organizado por la comunidad (sin club), ya iniciado
  const startsAt = new Date(Date.now() - 2 * 3600 * 1000);
  const { data: t, error: tErr } = await admin
    .from('tournaments')
    .insert({
      slug: `americano-random-test-${TAG}`,
      name: 'Americano Random de Prueba',
      format: 'americano_random',
      tier: 'casual',
      weight: 0.4,
      status: 'open',
      category_kind: 'casual',
      category: null,
      competition_unit: 'player',
      community_id: COMMUNITY_ID,
      points_per_match: 12,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 6 * 3600 * 1000).toISOString(),
      registration_deadline: new Date(startsAt.getTime() - 3600 * 1000).toISOString(),
      courts: COURTS,
      max_teams: 16,
      min_teams: 4,
      price_per_team: 0,
      rotation_games: 24,
      description: 'Americano social de prueba: las parejas rotan cada ronda, gana quien más puntos suma.',
    })
    .select('id, slug')
    .single();
  if (tErr) throw new Error(`tournament: ${tErr.message}`);
  console.log(`✓ Torneo creado: ${t.slug}`);

  // 3) Inscripción INDIVIDUAL de los 12 jugadores
  for (const p of players) {
    const { error: rErr } = await admin.from('tournament_registrations').insert({
      tournament_id: t.id,
      player_id: p.id,
      registered_by: OWNER_ID,
      status: 'confirmed',
      payment_amount: 0,
    });
    if (rErr) throw new Error(`registration ${p.name}: ${rErr.message}`);
  }
  console.log(`✓ ${players.length} jugadores inscritos (individual)`);

  await admin.from('tournaments').update({ status: 'in_progress' }).eq('id', t.id);

  // 4) Bracket random (4 jugadores por cancha)
  const rounds = genRandomRounds(players.map((p) => p.id), COURTS, ROUNDS);
  const matchRows = rounds.flatMap((ms) =>
    ms.map((m) => ({
      tournament_id: t.id,
      round_number: m.round,
      court_number: m.court,
      pair_one_player_one_id: m.p1a,
      pair_one_player_two_id: m.p1b,
      pair_two_player_one_id: m.p2a,
      pair_two_player_two_id: m.p2b,
      status: 'scheduled',
      confirmed_by_one: false,
      confirmed_by_two: false,
    })),
  );

  // 5) Estados variados en la ronda 1 (a 12 puntos por partido):
  matchRows[0] = { ...matchRows[0], status: 'completed', score_one: 8, score_two: 4, ended_at: new Date().toISOString(), confirmed_by_one: true, confirmed_by_two: true };
  matchRows[1] = { ...matchRows[1], status: 'pending_confirmation', score_one: 7, score_two: 5, reported_by_side: 1, reported_at: new Date().toISOString(), confirmed_by_one: true };
  matchRows[2] = { ...matchRows[2], status: 'disputed', score_one: 6, score_two: 6, reported_by_side: 1, reported_at: new Date().toISOString(), confirmed_by_one: true };

  const { error: mErr } = await admin.from('matches').insert(matchRows);
  if (mErr) throw new Error(`matches: ${mErr.message}`);
  console.log(`✓ ${matchRows.length} partidos generados (1 completed, 1 pending, 1 disputed, resto scheduled)`);

  console.log('\n========================================');
  console.log('SEED RANDOM COMPLETO');
  console.log('========================================');
  console.log(`Torneo:    /tournaments/${t.slug}`);
  console.log(`Manage:    /app/tournaments/${t.slug}/manage  (como Juanes = organizador de la comunidad)`);
  console.log(`Live:      /tournaments/${t.slug}/live`);
  console.log(`\nLogin de jugadores test (password: ${SHARED_PASSWORD}):`);
  players.slice(0, 4).forEach((p) => console.log(`  ${p.email}  (${p.name})`));
  console.log(`  ... y ${players.length - 4} más con el patrón seedrnd+${TAG}-N@padelking.test`);
}

main().catch((err) => {
  console.error('SEED FALLÓ:', err.message);
  process.exit(1);
});
