// Test end-to-end del flujo "gestionar un Americano Pareja Random con invitados":
// crea torneo americano_random, inscribe JUGADORES INDIVIDUALES como invitados
// (replica addManualPlayer modo 'single'), arma un bracket random (slots de 4
// jugadores por cancha, rotando compañeros) con guest ids y verifica el display
// como la UI (sideLabel). Limpia todo al final.
//
// Uso:  node apps/web/scripts/test-americano-random-invitados.mjs
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
const COMMUNITY_ID = '03454add-8e0e-4218-b6d0-b9a94a0125a1';
const OWNER_ID = 'cb28046d-88f0-474c-836d-8d0f01443993';
const TAG = Date.now().toString(36);

let tournamentId = null;
const createdGuestIds = [];
let pass = 0;
let fail = 0;
const check = (cond, msg) => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.error(`  ✗ ${msg}`); }
};

// Replica addManualPlayer modo 'single' con invitado: crea guest + registration
// individual (guest_player_id). Modalidad C de la constraint registration_modality.
async function addSingleGuest(name) {
  const { data: g, error: gErr } = await admin
    .from('guest_players')
    .insert({ tournament_id: tournamentId, display_name: name, created_by: OWNER_ID })
    .select('id')
    .single();
  if (gErr) return { error: gErr };
  createdGuestIds.push(g.id);
  const { data, error } = await admin
    .from('tournament_registrations')
    .insert({
      tournament_id: tournamentId,
      guest_player_id: g.id,
      registered_by: OWNER_ID,
      status: 'confirmed',
      payment_amount: 0,
      confirmed_at: new Date().toISOString(),
    })
    .select('id, guest_player_id')
    .single();
  if (error) return { error };
  return { data: { ...data, guestId: g.id } };
}

async function main() {
  // 1) Torneo Pareja Random con puntos personalizados (a 24, no el default 12)
  const startsAt = new Date(Date.now() + 24 * 3600 * 1000);
  const { data: t, error: tErr } = await admin
    .from('tournaments')
    .insert({
      slug: `test-rnd-inv-${TAG}`,
      name: 'Test Americano Random Invitados',
      format: 'americano_random',
      tier: 'casual',
      weight: 0.4,
      status: 'open',
      scope: 'community',
      category_kind: 'casual',
      competition_unit: 'player',
      pairing_mode: 'random',
      community_id: COMMUNITY_ID,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 6 * 3600 * 1000).toISOString(),
      registration_deadline: new Date(startsAt.getTime() - 3600 * 1000).toISOString(),
      max_teams: 16,
      min_teams: 4,
      price_per_team: 0,
      points_per_match: 24,
      total_rounds: 7,
      rotation_games: 24,
    })
    .select('id, slug, points_per_match')
    .single();
  if (tErr) throw new Error(`tournament: ${tErr.message}`);
  tournamentId = t.id;
  console.log(`\n[1] Torneo creado: ${t.slug}`);
  check(t.points_per_match === 24, `points_per_match personalizado guardado (=${t.points_per_match})`);

  // 2) Inscribir 8 jugadores individuales como invitados (modo single)
  console.log('\n[2] Inscribiendo jugadores sueltos como invitados (modo single):');
  const players = [];
  for (let i = 0; i < 8; i++) {
    const name = `Jug ${String.fromCharCode(65 + i)} ${TAG}`;
    const res = await addSingleGuest(name);
    check(!res.error, `jugador "${name.split(' ').slice(0, 2).join(' ')}" inscrito${res.error ? ` — ${res.error.message}` : ''}`);
    if (res.data) players.push({ regId: res.data.id, guestId: res.data.guestId, name });
  }

  const { data: regs } = await admin
    .from('tournament_registrations')
    .select('id, guest_player_id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');
  check(regs.length === 8, `8 jugadores confirmados (=${regs.length})`);

  // 3) Mapa de nombres + label de slot como la UI (labelForSlot)
  const guestName = new Map(players.map((p) => [p.guestId, p.name]));
  const slotLabel = (gid) => (gid ? `${guestName.get(gid) ?? '?'} (invitado)` : '?');

  // 4) Armar bracket random: 2 canchas, parejas rotadas (4 jugadores por match).
  //    El generador real, generateRandomAmericano, está cubierto por vitest;
  //    aquí armamos una ronda manual para validar el camino de DB + constraints.
  console.log('\n[4] Insertando matches random (4 invitados por cancha, modalidad random):');
  const g = players.map((p) => p.guestId);
  const matchRows = [
    {
      tournament_id: tournamentId, round_number: 1, court_number: 1,
      pair_one_guest_one_id: g[0], pair_one_guest_two_id: g[1],
      pair_two_guest_one_id: g[2], pair_two_guest_two_id: g[3],
      status: 'scheduled',
    },
    {
      tournament_id: tournamentId, round_number: 1, court_number: 2,
      pair_one_guest_one_id: g[4], pair_one_guest_two_id: g[5],
      pair_two_guest_one_id: g[6], pair_two_guest_two_id: g[7],
      status: 'scheduled',
    },
    // Ronda 2: compañeros rotados (valida que la constraint no exige parejas fijas)
    {
      tournament_id: tournamentId, round_number: 2, court_number: 1,
      pair_one_guest_one_id: g[0], pair_one_guest_two_id: g[2],
      pair_two_guest_one_id: g[1], pair_two_guest_two_id: g[3],
      status: 'scheduled',
    },
  ];
  const { error: insErr } = await admin.from('matches').insert(matchRows);
  check(!insErr, `matches random insertados (constraint pair_slots_xor_guest, caso random)${insErr ? ` — ${insErr.message}` : ''}`);

  // 5) Leer de vuelta y armar labels de cada lado como en manage (sideLabel)
  const { data: matches } = await admin
    .from('matches')
    .select('round_number, court_number, pair_one_guest_one_id, pair_one_guest_two_id, pair_two_guest_one_id, pair_two_guest_two_id')
    .eq('tournament_id', tournamentId)
    .order('round_number').order('court_number');
  check(matches.length === 3, `3 matches en la DB (=${matches.length})`);

  console.log('\n[5] Labels como se ven en manage (sideLabel):');
  let allLabeled = true;
  for (const m of matches) {
    const sideOne = `${slotLabel(m.pair_one_guest_one_id)} / ${slotLabel(m.pair_one_guest_two_id)}`;
    const sideTwo = `${slotLabel(m.pair_two_guest_one_id)} / ${slotLabel(m.pair_two_guest_two_id)}`;
    if (sideOne.includes('?') || sideTwo.includes('?')) allLabeled = false;
    console.log(`     R${m.round_number} C${m.court_number}:  ${sideOne}  vs  ${sideTwo}`);
  }
  check(allLabeled, 'todos los slots de todos los matches tienen nombre de invitado');

  // 6) Verificar rotación de compañeros entre rondas (R1: A-B, R2: A-C)
  const r1c1 = matches.find((m) => m.round_number === 1 && m.court_number === 1);
  const r2c1 = matches.find((m) => m.round_number === 2 && m.court_number === 1);
  const partnerR1 = r1c1.pair_one_guest_two_id; // compañero de g[0] en R1 = g[1]
  const partnerR2 = r2c1.pair_one_guest_two_id; // compañero de g[0] en R2 = g[2]
  check(partnerR1 !== partnerR2, 'el jugador A rota de compañero entre rondas (B → C)');
}

main()
  .catch((e) => { fail++; console.error('\n✗ ERROR:', e.message); })
  .finally(async () => {
    if (tournamentId) {
      await admin.from('matches').delete().eq('tournament_id', tournamentId);
      await admin.from('tournament_registrations').delete().eq('tournament_id', tournamentId);
      if (createdGuestIds.length) await admin.from('guest_players').delete().in('id', createdGuestIds);
      await admin.from('tournaments').delete().eq('id', tournamentId);
      console.log('\n✓ Cleanup completo (torneo + jugadores + invitados + matches borrados)');
    }
    console.log(`\n${'='.repeat(50)}\nRESULTADO: ${pass} pass, ${fail} fail\n${'='.repeat(50)}`);
    process.exit(fail > 0 ? 1 : 0);
  });
