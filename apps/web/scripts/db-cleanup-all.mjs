// Borra TODOS los datos de aplicación (torneos, matches, equipos, clubs,
// comunidades, etc.) excepto el profile/usuario de KEEP_EMAIL.
//
// Orden: dependientes primero, padres después. Termina con auth.users.
// Uso: node scripts/db-cleanup-all.mjs --apply
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEEP_EMAIL = 'juanesvgarcia@gmail.com';
const APPLY = process.argv.includes('--apply');

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '..', '.env.local');
const envRaw = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envRaw
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const eq = l.indexOf('=');
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim().replace(/^"|"$/g, '')];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan envs');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// Tablas dependientes (orden importa). Borramos TODO porque vamos a wipe completo.
const TABLES_DELETE_ALL = [
  'elo_history',
  'chat_messages',
  'notifications',
  'open_match_participants',
  'open_matches',
  'matches',
  'tournament_pairs',
  'tournament_registrations',
  'tournament_sponsors',
  'tournaments',
  'team_points',
  'team_members',
  'teams',
  'player_points',
  'category_change_suggestions',
  'community_join_requests',
  'community_creation_requests',
  'community_members',
  'club_communities',
  'communities',
  'clubs',
  'invitation_tokens',
];

async function getKeepProfileId() {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const u = data.users.find((x) => (x.email ?? '').toLowerCase() === KEEP_EMAIL.toLowerCase());
  if (!u) throw new Error(`No encuentro ${KEEP_EMAIL}`);
  return u.id;
}

async function countTable(name) {
  const { count, error } = await db.from(name).select('*', { count: 'exact', head: true });
  if (error) return `err:${error.message}`;
  return count ?? 0;
}

const keepId = await getKeepProfileId();
console.log(`KEEP profile id: ${keepId}`);

console.log('\nConteos actuales:');
for (const t of [...TABLES_DELETE_ALL, 'profiles']) {
  console.log(`  ${t}: ${await countTable(t)}`);
}

if (!APPLY) {
  console.log('\n(dry-run) Pasá --apply para borrar de verdad.');
  process.exit(0);
}

console.log('\nBorrando datos de aplicación (TODO)...');
for (const t of TABLES_DELETE_ALL) {
  // .neq('id', '00000000-0000-0000-0000-000000000000') matchea todo (uuid sentinel).
  const { error } = await db
    .from(t)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.log(`  ✗ ${t}: ${error.message}`);
  } else {
    console.log(`  ✓ ${t}`);
  }
}

console.log('\nBorrando profiles (menos KEEP)...');
{
  const { error } = await db.from('profiles').delete().neq('id', keepId);
  if (error) console.log(`  ✗ profiles: ${error.message}`);
  else console.log('  ✓ profiles');
}

console.log('\nBorrando auth.users (menos KEEP)...');
const { data: usersData } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
let okU = 0, failU = 0;
for (const u of usersData.users) {
  if (u.id === keepId) continue;
  const { error } = await db.auth.admin.deleteUser(u.id);
  if (error) {
    console.log(`  ✗ ${u.email}: ${error.message}`);
    failU += 1;
  } else {
    okU += 1;
  }
}
console.log(`\nauth.users borrados: ${okU} ok, ${failU} fail`);

console.log('\nConteos finales:');
for (const t of [...TABLES_DELETE_ALL, 'profiles']) {
  console.log(`  ${t}: ${await countTable(t)}`);
}
