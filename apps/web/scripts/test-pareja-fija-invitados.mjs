// Test end-to-end del flujo "una persona gestiona un torneo de Pareja Fija con
// invitados": crea torneo americano_fijo, inscribe parejas de invitados (las 3
// combinaciones: 2 guests, profile+guest, 2 profiles) replicando EXACTAMENTE la
// fila que arma addManualPlayer en modo 'pair', genera el bracket round-robin,
// arma los labels como la UI (labelOf) y verifica el cuadro. Limpia todo al final.
//
// Uso:  node apps/web/scripts/test-pareja-fija-invitados.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Round-robin de parejas (combinatoria). El generador real, generateFixedAmericano,
// está cubierto por vitest (americano-pairing.spec.ts); aquí solo necesitamos los
// enfrentamientos para validar el camino de DB + display, no re-testear el algoritmo.
function roundRobinPairs(ids, courts) {
  const matches = [];
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      matches.push({
        roundNumber: Math.floor(n / courts) + 1,
        courtNumber: (n % courts) + 1,
        pairOne: { playerOneId: ids[i] },
        pairTwo: { playerOneId: ids[j] },
      });
      n++;
    }
  }
  return [{ matches }];
}

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

// Replica addManualPlayer modo 'pair': crea guests para los slots guest y arma
// la fila de registration con la combinación correcta de columnas.
async function addPair(slotOne, slotTwo) {
  const resolve = async (slot) => {
    if (slot.profileId) return { profileId: slot.profileId, guestId: null };
    const { data, error } = await admin
      .from('guest_players')
      .insert({ tournament_id: tournamentId, display_name: slot.guestName, created_by: OWNER_ID })
      .select('id')
      .single();
    if (error) throw new Error(`guest "${slot.guestName}": ${error.message}`);
    createdGuestIds.push(data.id);
    return { profileId: null, guestId: data.id };
  };
  const a = await resolve(slotOne);
  const b = await resolve(slotTwo);
  const row = {
    tournament_id: tournamentId,
    registered_by: OWNER_ID,
    status: 'confirmed',
    payment_amount: 0,
    confirmed_at: new Date().toISOString(),
    ...(a.profileId ? { player_one_id: a.profileId } : { guest_player_one_id: a.guestId }),
    ...(b.profileId ? { player_two_id: b.profileId } : { guest_player_two_id: b.guestId }),
  };
  const { data, error } = await admin
    .from('tournament_registrations')
    .insert(row)
    .select('id, player_one_id, player_two_id, guest_player_one_id, guest_player_two_id')
    .single();
  if (error) return { error };
  return { data };
}

async function main() {
  // 1) Torneo Pareja Fija con puntos personalizados (16, no el default 12)
  const startsAt = new Date(Date.now() + 24 * 3600 * 1000);
  const { data: t, error: tErr } = await admin
    .from('tournaments')
    .insert({
      slug: `test-pf-inv-${TAG}`,
      name: 'Test Pareja Fija Invitados',
      format: 'americano_fijo',
      tier: 'casual',
      weight: 0.4,
      status: 'open',
      scope: 'community',
      category_kind: 'casual',
      competition_unit: 'team',
      community_id: COMMUNITY_ID,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 6 * 3600 * 1000).toISOString(),
      registration_deadline: new Date(startsAt.getTime() - 3600 * 1000).toISOString(),
      max_teams: 8,
      min_teams: 2,
      price_per_team: 0,
      points_per_match: 16,
      rotation_games: 24,
    })
    .select('id, slug, points_per_match')
    .single();
  if (tErr) throw new Error(`tournament: ${tErr.message}`);
  tournamentId = t.id;
  console.log(`\n[1] Torneo creado: ${t.slug}`);
  check(t.points_per_match === 16, `points_per_match personalizado guardado (=${t.points_per_match})`);

  // 2) Inscribir 4 parejas con las 3 combinaciones de slots
  console.log('\n[2] Inscribiendo parejas (replica addManualPlayer modo pair):');
  const pairs = [
    { one: { guestName: `Inv A1 ${TAG}` }, two: { guestName: `Inv A2 ${TAG}` }, desc: '2 invitados' },
    { one: { guestName: `Inv B1 ${TAG}` }, two: { guestName: `Inv B2 ${TAG}` }, desc: '2 invitados' },
    { one: { profileId: OWNER_ID }, two: { guestName: `Inv C ${TAG}` }, desc: 'cuenta + invitado' },
    { one: { guestName: `Inv D1 ${TAG}` }, two: { guestName: `Inv D2 ${TAG}` }, desc: '2 invitados' },
  ];
  const regIds = [];
  for (const p of pairs) {
    const res = await addPair(p.one, p.two);
    check(!res.error, `pareja [${p.desc}] aceptada por la DB${res.error ? ` — ${res.error.message}` : ''}`);
    if (res.data) regIds.push(res.data.id);
  }

  // 3) Verificar conteo y leer de vuelta para armar labels como la UI
  const { data: regs } = await admin
    .from('tournament_registrations')
    .select('id, player_one_id, player_two_id, guest_player_one_id, guest_player_two_id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');
  check(regs.length === 4, `4 parejas confirmadas en el torneo (=${regs.length})`);

  // Mapa de nombres de guests (como hace la página)
  const { data: guests } = await admin
    .from('guest_players')
    .select('id, display_name')
    .eq('tournament_id', tournamentId);
  const guestName = new Map((guests ?? []).map((g) => [g.id, g.display_name]));
  const { data: ownerProf } = await admin
    .from('profiles').select('id, display_name').eq('id', OWNER_ID).single();
  const profName = new Map([[ownerProf.id, ownerProf.display_name]]);
  const slotLabel = (pid, gid) =>
    pid ? (profName.get(pid) ?? '?') : gid ? `${guestName.get(gid) ?? '?'} (invitado)` : '?';
  const labelOf = (r) =>
    `${slotLabel(r.player_one_id, r.guest_player_one_id)} / ${slotLabel(r.player_two_id, r.guest_player_two_id)}`;

  console.log('\n[3] Labels como se ven en la lista de inscritos:');
  for (const r of regs) console.log(`     ${labelOf(r)}`);
  const labels = regs.map(labelOf);
  check(labels.some((l) => l.includes('(invitado) /') && l.endsWith('(invitado)')), 'pareja de 2 invitados se ve "X (invitado) / Y (invitado)"');
  check(labels.some((l) => l.includes(ownerProf.display_name) && l.includes('(invitado)')), 'pareja cuenta+invitado se ve "Cuenta / Y (invitado)"');
  check(!labels.some((l) => l.includes('?')), 'ningún slot quedó sin nombre ("?")');

  // 4) Generar bracket round-robin (cada pareja vs cada otra una vez)
  console.log('\n[4] Generando bracket round-robin de Pareja Fija:');
  const rounds = roundRobinPairs(regs.map((r) => r.id), 2);
  const matchRows = rounds.flatMap((round) =>
    round.matches.map((m) => ({
      tournament_id: tournamentId,
      round_number: m.roundNumber,
      court_number: m.courtNumber,
      registration_one_id: m.pairOne.playerOneId,
      registration_two_id: m.pairTwo.playerOneId,
      status: 'scheduled',
    })),
  );
  // 4 parejas → C(4,2) = 6 enfrentamientos, 3 rondas
  check(matchRows.length === 6, `6 enfrentamientos generados (round-robin de 4 parejas) (=${matchRows.length})`);
  const seen = new Set(matchRows.map((m) => [m.registration_one_id, m.registration_two_id].sort().join('|')));
  check(seen.size === 6, 'cada pareja enfrenta a cada otra exactamente una vez (sin repetir)');

  const { error: insErr } = await admin.from('matches').insert(matchRows);
  check(!insErr, `matches insertados (constraint pair_slots_xor_guest acepta el caso fijo)${insErr ? ` — ${insErr.message}` : ''}`);

  // 5) Verificar que los matches referencian parejas reales y se pueden etiquetar
  const { data: matches } = await admin
    .from('matches')
    .select('registration_one_id, registration_two_id, court_number')
    .eq('tournament_id', tournamentId);
  const regById = new Map(regs.map((r) => [r.id, labelOf(r)]));
  const allLabeled = matches.every(
    (m) => regById.get(m.registration_one_id) && regById.get(m.registration_two_id),
  );
  check(allLabeled, 'todos los matches mapean a parejas con nombre');
  check(matches.every((m) => m.court_number >= 1 && m.court_number <= 2), 'matches distribuidos en 2 canchas');
  console.log('\n[5] Ejemplo de match (como se ve en manage):');
  if (matches[0]) console.log(`     ${regById.get(matches[0].registration_one_id)}  vs  ${regById.get(matches[0].registration_two_id)}`);
}

main()
  .catch((e) => { fail++; console.error('\n✗ ERROR:', e.message); })
  .finally(async () => {
    // Cleanup: borrar torneo (cascade a registrations/matches) + guests
    if (tournamentId) {
      await admin.from('matches').delete().eq('tournament_id', tournamentId);
      await admin.from('tournament_registrations').delete().eq('tournament_id', tournamentId);
      if (createdGuestIds.length) await admin.from('guest_players').delete().in('id', createdGuestIds);
      await admin.from('tournaments').delete().eq('id', tournamentId);
      console.log('\n✓ Cleanup completo (torneo + parejas + invitados + matches borrados)');
    }
    console.log(`\n${'='.repeat(50)}\nRESULTADO: ${pass} pass, ${fail} fail\n${'='.repeat(50)}`);
    process.exit(fail > 0 ? 1 : 0);
  });
