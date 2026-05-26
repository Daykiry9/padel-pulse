// Seed de un americano de prueba LLENO e INICIADO en la comunidad del owner,
// para testear el flujo de reporte/confirmación de scores.
//
// Crea: 1 club (owner = Juanes) + 12 usuarios test (6 parejas) + el torneo
// americano_fijo in_progress + 6 registrations + bracket round-robin (15
// matches) con estados variados (scheduled / pending_confirmation / completed
// / disputed) para ver todos los casos.
//
// Uso:  node apps/web/scripts/seed-americano-test.mjs
// Idempotencia: cada corrida usa un TAG único; no pisa data previa.

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

const NAMES = [
  'Carlos Ruiz', 'Andrés Gómez', 'Felipe Díaz', 'Mateo Vargas',
  'Santiago León', 'Nicolás Peña', 'Daniel Mora', 'Sebastián Cruz',
  'Julián Rey', 'Tomás Silva', 'Esteban Niño', 'Camilo Soto',
];

async function cleanupPrevious() {
  // Borra runs previos para idempotencia: torneos de clubs test (cascade a
  // matches/registrations) → clubs test → usuarios seedtest.
  const { data: testClubs } = await admin.from('clubs').select('id').like('slug', 'spin-club-test-%');
  const clubIds = (testClubs ?? []).map((c) => c.id);
  if (clubIds.length) {
    await admin.from('tournaments').delete().in('club_id', clubIds);
    await admin.from('clubs').delete().in('id', clubIds);
  }
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const stale = (list?.users ?? []).filter((u) => u.email?.startsWith('seedtest+'));
  for (const u of stale) await admin.auth.admin.deleteUser(u.id);
  if (clubIds.length || stale.length) {
    console.log(`✓ Cleanup: ${clubIds.length} clubs + ${stale.length} usuarios de runs previos`);
  }
}

async function main() {
  await cleanupPrevious();

  // 1) Club (sede) con owner = Juanes → lo hace organizador del torneo
  const { data: club, error: clubErr } = await admin
    .from('clubs')
    .insert({ name: 'Spin Padel Club (test)', slug: `spin-club-test-${TAG}`, city: 'Bogotá', owner_id: OWNER_ID })
    .select('id')
    .single();
  if (clubErr) throw new Error(`club: ${clubErr.message}`);
  console.log(`✓ Club creado: ${club.id}`);

  // 2) 12 usuarios test + profiles + membresía en la comunidad
  const players = [];
  for (let i = 0; i < NAMES.length; i++) {
    const email = `seedtest+${TAG}-${i}@padelking.test`;
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

  // 3) Torneo americano_fijo, ya iniciado (empezó hace 2h)
  const startsAt = new Date(Date.now() - 2 * 3600 * 1000);
  const { data: t, error: tErr } = await admin
    .from('tournaments')
    .insert({
      slug: `americano-test-${TAG}`,
      name: 'Americano de Prueba — 4ta',
      format: 'americano_fijo',
      tier: 'casual',
      weight: 0.4,
      status: 'open',
      category_kind: 'estandar',
      category: 'cuarta',
      competition_unit: 'team',
      club_id: club.id,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 6 * 3600 * 1000).toISOString(),
      registration_deadline: new Date(startsAt.getTime() - 3600 * 1000).toISOString(),
      max_teams: 6,
      min_teams: 4,
      price_per_team: 0,
      rotation_games: 24,
      description: 'Torneo de prueba para testear reporte/confirmación de scores.',
    })
    .select('id, slug')
    .single();
  if (tErr) throw new Error(`tournament: ${tErr.message}`);
  console.log(`✓ Torneo creado: ${t.slug}`);

  // 4) 6 parejas (registrations)
  const regs = [];
  for (let p = 0; p < 6; p++) {
    const { data: r, error: rErr } = await admin
      .from('tournament_registrations')
      .insert({
        tournament_id: t.id,
        player_one_id: players[p * 2].id,
        player_two_id: players[p * 2 + 1].id,
        registered_by: OWNER_ID,
        status: 'confirmed',
        payment_amount: 0,
      })
      .select('id')
      .single();
    if (rErr) throw new Error(`registration ${p}: ${rErr.message}`);
    regs.push(r.id);
  }
  console.log(`✓ ${regs.length} parejas inscritas`);

  // Pasar a in_progress DESPUÉS de inscribir (el trigger de elegibilidad
  // solo permite inscripciones con status 'open').
  await admin.from('tournaments').update({ status: 'in_progress' }).eq('id', t.id);

  // 5) Bracket round-robin (circle method): 6 parejas → 5 rondas × 3 matches
  const arr = [...regs];
  const n = arr.length;
  const matchRows = [];
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      matchRows.push({
        tournament_id: t.id,
        round_number: round + 1,
        court_number: (i % 2) + 1,
        registration_one_id: a,
        registration_two_id: b,
        status: 'scheduled',
        confirmed_by_one: false,
        confirmed_by_two: false,
      });
    }
    // rotar manteniendo el primero fijo
    arr.splice(1, 0, arr.pop());
  }

  // 6) Estados variados en la ronda 1 para ver todos los casos:
  //    match[0] = completed (6-2), match[1] = pending_confirmation (reportó pareja A),
  //    match[2] = disputed. El resto queda scheduled.
  matchRows[0] = { ...matchRows[0], status: 'completed', score_one: 6, score_two: 2, ended_at: new Date().toISOString(), confirmed_by_one: true, confirmed_by_two: true };
  matchRows[1] = { ...matchRows[1], status: 'pending_confirmation', score_one: 6, score_two: 4, reported_by_registration_id: matchRows[1].registration_one_id, reported_at: new Date().toISOString(), confirmed_by_one: true };
  matchRows[2] = { ...matchRows[2], status: 'disputed', score_one: 5, score_two: 7, reported_by_registration_id: matchRows[2].registration_one_id, reported_at: new Date().toISOString(), confirmed_by_one: true };

  const { error: mErr } = await admin.from('matches').insert(matchRows);
  if (mErr) throw new Error(`matches: ${mErr.message}`);
  console.log(`✓ ${matchRows.length} partidos generados (1 completed, 1 pending, 1 disputed, resto scheduled)`);

  console.log('\n========================================');
  console.log('SEED COMPLETO');
  console.log('========================================');
  console.log(`Torneo:    /tournaments/${t.slug}`);
  console.log(`Manage:    /app/tournaments/${t.slug}/manage  (como Juanes = organizador)`);
  console.log(`Live:      /tournaments/${t.slug}/live`);
  console.log(`\nLogin de jugadores test (para probar reportar/confirmar como pareja):`);
  console.log(`  Password (todos): ${SHARED_PASSWORD}`);
  players.slice(0, 4).forEach((p) => console.log(`  ${p.email}  (${p.name})`));
  console.log(`  ... y ${players.length - 4} más con el patrón seedtest+${TAG}-N@padelking.test`);
}

main().catch((err) => {
  console.error('SEED FALLÓ:', err.message);
  process.exit(1);
});
