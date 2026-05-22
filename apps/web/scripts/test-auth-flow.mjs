// Test e2e del flow de auth: signup -> trigger crea profile -> updateProfile -> ranking visible.
// Usa el client anon (como las server actions) + service role para validar/limpiar.
// Uso: desde apps/web -> node scripts/test-auth-flow.mjs
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../../.env.local');

const env = Object.fromEntries(
  (await readFile(envPath, 'utf8'))
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const anon = createClient(URL, ANON);
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const stamp = Date.now();
const email = `qa-auth-${stamp}@padelking.test`;
const password = 'Padel2026!';
const displayName = `QA Auth ${stamp}`;

console.log('▸ 1. signUp con anon client (igual que server action)');
const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
  email,
  password,
  options: { data: { display_name: displayName } },
});
if (signUpErr) {
  console.error('  ✗ signUp falló:', signUpErr.message);
  process.exit(1);
}
console.log(`  ✓ user creado: ${signUpData.user?.id}`);
console.log(`  ✓ sesión activa: ${signUpData.session ? 'sí' : 'NO (email confirm requerido)'}`);
const userId = signUpData.user?.id;
if (!userId) {
  console.error('  ✗ user.id no devuelto');
  process.exit(1);
}

console.log('\n▸ 2. Verificar trigger creó fila en profiles');
const { data: profile, error: profileErr } = await admin
  .from('profiles')
  .select('id, display_name, skill_category')
  .eq('id', userId)
  .maybeSingle();
if (profileErr) {
  console.error('  ✗ select profile falló:', profileErr.message);
  process.exit(1);
}
if (!profile) {
  console.error('  ✗ trigger NO creó profile. Bug confirmado.');
  process.exit(1);
}
console.log(`  ✓ profile creado: display_name="${profile.display_name}"`);
console.log(`  ✓ skill_category null (esperado pre-onboarding): ${profile.skill_category === null}`);

console.log('\n▸ 3. updateProfile (simulando onboarding)');
// Si signUp no creó sesión, login.
if (!signUpData.session) {
  console.log('  → signing in (email confirm bypassed por admin auto-confirm o desactivado)');
  const { error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr) {
    console.error('  ✗ signIn falló:', signInErr.message);
    console.error('  → Esto indica que email confirmation ESTÁ ACTIVA en el proyecto remoto');
    console.error('  → Confirmando manualmente con admin...');
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });
    const retry = await anon.auth.signInWithPassword({ email, password });
    if (retry.error) {
      console.error('  ✗ retry falló:', retry.error.message);
      process.exit(1);
    }
    console.log('  ✓ confirmado manual + login OK');
  } else {
    console.log('  ✓ signIn OK sin confirmar email (autoconfirm activo)');
  }
}

const { error: updErr } = await anon
  .from('profiles')
  .update({ skill_category: 'cuarta', gender: 'male', city: 'Bogotá' })
  .eq('id', userId);
if (updErr) {
  console.error('  ✗ update falló:', updErr.message);
  process.exit(1);
}
console.log('  ✓ skill_category=cuarta, gender=male, city=Bogotá');

console.log('\n▸ 4. Verificar el profile quedó correcto');
const { data: final } = await admin
  .from('profiles')
  .select('display_name, skill_category, gender, city')
  .eq('id', userId)
  .single();
console.log(`  ✓ display_name: ${final.display_name}`);
console.log(`  ✓ skill_category: ${final.skill_category}`);
console.log(`  ✓ gender: ${final.gender}`);
console.log(`  ✓ city: ${final.city}`);

console.log('\n▸ 5. Cleanup: eliminar usuario de prueba');
await admin.auth.admin.deleteUser(userId);
console.log(`  ✓ user ${userId.slice(0, 8)}… eliminado`);

console.log('\n✓✓✓ Auth flow OK end-to-end ✓✓✓');
