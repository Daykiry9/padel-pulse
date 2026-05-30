// Lista o borra todos los auth.users excepto KEEP_EMAIL.
// Uso:
//   node scripts/db-cleanup-users.mjs           -> lista (dry run)
//   node scripts/db-cleanup-users.mjs --apply   -> borra de verdad
//
// Cascade: la migración 20251030_auth_cleanup_cascade dropea profiles cuando se
// borra auth.users; el resto (tournaments, clubs, communities, teams, etc.)
// va detrás vía sus FKs a profiles.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEEP_EMAIL = 'juanesvgarcia@gmail.com';
const APPLY = process.argv.includes('--apply');

// Carga apps/web/.env.local (estamos dentro de apps/web/scripts/).
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
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function listAllUsers() {
  const all = [];
  let page = 1;
  // listUsers pagina 50 por defecto; subimos a 1000 que es el cap.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return all;
}

const users = await listAllUsers();
console.log(`Total auth.users: ${users.length}`);

const keep = users.find((u) => (u.email ?? '').toLowerCase() === KEEP_EMAIL.toLowerCase());
if (!keep) {
  console.error(`No encontré la cuenta ${KEEP_EMAIL}. Abortando para no borrarte sin querer.`);
  process.exit(2);
}
console.log(`KEEP -> ${keep.email} (${keep.id})`);

const toDelete = users.filter((u) => u.id !== keep.id);
console.log(`A borrar: ${toDelete.length} usuarios`);
for (const u of toDelete) {
  console.log(`  - ${u.email ?? '<no-email>'} (${u.id})`);
}

if (!APPLY) {
  console.log('\n(dry-run) Pasá --apply para borrar de verdad.');
  process.exit(0);
}

console.log('\nAPPLY=true -> borrando...');
let okCount = 0;
let failCount = 0;
for (const u of toDelete) {
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) {
    console.error(`  ✗ ${u.email}: ${error.message}`);
    failCount += 1;
  } else {
    okCount += 1;
  }
}
console.log(`\nListo. OK=${okCount}, fail=${failCount}.`);
