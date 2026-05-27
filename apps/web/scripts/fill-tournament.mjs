// Llena un torneo EXISTENTE con jugadores de prueba elegibles para su categoría,
// para poder testear. Deja el torneo en 'open' con las inscripciones cargadas;
// el organizador genera el bracket desde /manage ("Cerrar inscripciones").
//
// Uso:  node apps/web/scripts/fill-tournament.mjs <slug> [numParejas|numJugadores]
//   - team (fijo): crea N parejas (default 6 → 12 jugadores)
//   - player (random): crea N jugadores (default 12)
//
// Idempotencia: usa un TAG único por corrida (no pisa inscripciones previas).

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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SLUG = process.argv[2];
if (!SLUG) {
  console.error('Falta el slug. Uso: node scripts/fill-tournament.mjs <slug> [count]');
  process.exit(1);
}
const COUNT = process.argv[3] ? Number(process.argv[3]) : null;
const TAG = Date.now().toString(36);
const PASSWORD = 'PadelTest2026!';

const FEMALE_NAMES = [
  'Gabi Sánchez', 'Bea González', 'Marta Ortega', 'Delfi Brea',
  'Ari Sánchez', 'Paula Josemaría', 'Sofía Araújo', 'Vicky Iglesias',
  'Tamara Icardo', 'Claudia Jensen', 'Jess Castelló', 'Nuria Rodríguez',
  'Lucía Sainz', 'Patty Llaguno', 'Marta Marrero', 'Eli Amatriaín',
];
const MALE_NAMES = [
  'Ale Galán', 'Juan Lebrón', 'Fede Chingotto', 'Agus Tapia',
  'Pablo Lima', 'Sanyo Gutiérrez', 'Martín Di Nenno', 'Coki Nieto',
  'Momo González', 'Lucho Capra', 'Edu Alonso', 'Javi Garrido',
  'Paquito Navarro', 'Juan Tello', 'Leo Augsburger', 'Miguel Yanguas',
];

async function main() {
  const { data: t } = await admin
    .from('tournaments')
    .select('id, slug, name, format, status, competition_unit, category_kind, category, community_id, club_id')
    .eq('slug', SLUG)
    .maybeSingle();
  if (!t) throw new Error(`No existe el torneo ${SLUG}`);
  if (t.status !== 'open') {
    throw new Error(`El torneo está "${t.status}", no 'open'. Reabrí inscripciones o usá uno nuevo.`);
  }

  const isPlayer = t.competition_unit === 'player'; // random/individual
  const isQueens = String(t.category_kind).startsWith('queens');
  const gender = isQueens ? 'female' : 'male';
  // Categoría elegible: la del torneo (estandar/queens_estandar). Si es casual/suma,
  // usamos una razonable por defecto.
  const skillCategory = t.category ?? (isQueens ? 'queens_d' : 'cuarta');
  const names = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;

  const numUnits = COUNT ?? (isPlayer ? 12 : 6);
  const numPlayers = isPlayer ? numUnits : numUnits * 2;
  if (numPlayers > names.length) throw new Error(`Máximo ${names.length} jugadores en este script`);

  console.log(
    `Torneo: ${t.name} · ${t.format} · ${t.category_kind}/${t.category ?? '-'} · ${
      isPlayer ? 'individual' : 'parejas'
    }`,
  );
  console.log(`Creando ${numPlayers} jugadores ${gender} (${skillCategory})...`);

  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    const email = `seedfill+${TAG}-${i}@padelking.test`;
    const { data: u, error: uErr } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: names[i] },
    });
    if (uErr) throw new Error(`createUser ${i}: ${uErr.message}`);
    const id = u.user.id;
    await admin.from('profiles').upsert({
      id,
      display_name: names[i],
      skill_category: skillCategory,
      gender,
      city: 'Bogotá',
      elo_rating: 980 + i * 5,
    });
    if (t.community_id) {
      await admin
        .from('community_members')
        .insert({ community_id: t.community_id, profile_id: id, role: 'member' });
    }
    players.push({ id, name: names[i], email });
  }

  let registered = 0;
  if (isPlayer) {
    for (const p of players) {
      const { error } = await admin.from('tournament_registrations').insert({
        tournament_id: t.id,
        player_id: p.id,
        registered_by: p.id,
        status: 'confirmed',
        payment_amount: 0,
      });
      if (error) throw new Error(`registration ${p.name}: ${error.message}`);
      registered++;
    }
  } else {
    for (let i = 0; i < players.length; i += 2) {
      const a = players[i];
      const b = players[i + 1];
      const { error } = await admin.from('tournament_registrations').insert({
        tournament_id: t.id,
        player_one_id: a.id,
        player_two_id: b.id,
        registered_by: a.id,
        status: 'confirmed',
        payment_amount: 0,
      });
      if (error) throw new Error(`registration ${a.name}/${b.name}: ${error.message}`);
      registered++;
    }
  }

  console.log(`✓ ${registered} ${isPlayer ? 'jugadores' : 'parejas'} inscritos en ${t.slug}`);
  console.log('\nEl torneo quedó en "open" con las inscripciones cargadas.');
  console.log(`→ Andá a /app/tournaments/${t.slug}/manage y tocá "Cerrar inscripciones" para`);
  console.log('  generar el bracket. Después podés probar el reporte de scores.');
  console.log(`\nLogin de los jugadores test (password: ${PASSWORD}):`);
  players.slice(0, 4).forEach((p) => console.log(`  ${p.email}  (${p.name})`));
  console.log(`  ... y ${players.length - 4} más (seedfill+${TAG}-N@padelking.test)`);
}

main().catch((err) => {
  console.error('FILL FALLÓ:', err.message);
  process.exit(1);
});
