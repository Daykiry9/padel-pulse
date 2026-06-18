// Test del flujo de creación LIBRE de comunidad (sin aprobación de admin):
// inserta una comunidad directo (como hace createCommunity con owner_id=user.id)
// y verifica que (1) nace con status 'active', (2) el trigger on_community_created
// crea automáticamente el community_member con role 'owner', sin pasar por
// community_creation_requests ni aprobación. Limpia al final.
//
// Uso:  node apps/web/scripts/test-creacion-libre-comunidad.mjs
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

const OWNER_ID = 'cb28046d-88f0-474c-836d-8d0f01443993';
const TAG = Date.now().toString(36);
let communityId = null;
let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) { pass++; console.log(`  ✓ ${msg}`); } else { fail++; console.error(`  ✗ ${msg}`); } };

async function main() {
  // 1) Insert directo como hace createCommunity (sin tocar community_creation_requests)
  console.log('\n[1] Creando comunidad directo (sin solicitud ni aprobación):');
  const { data: c, error } = await admin
    .from('communities')
    .insert({ slug: `test-libre-${TAG}`, name: `Comunidad Libre ${TAG}`, city: 'Bogotá', owner_id: OWNER_ID })
    .select('id, slug, status')
    .single();
  check(!error, `comunidad insertada directo${error ? ` — ${error.message}` : ''}`);
  if (error) return;
  communityId = c.id;
  check(c.status === 'active', `nace con status 'active' (=${c.status})`);

  // 2) El trigger on_community_created debe haber creado el owner-member
  const { data: members } = await admin
    .from('community_members')
    .select('profile_id, role')
    .eq('community_id', communityId);
  check(members.length === 1, `1 miembro creado automáticamente por el trigger (=${members.length})`);
  const owner = members.find((m) => m.profile_id === OWNER_ID);
  check(!!owner, 'el creador quedó como miembro');
  check(owner?.role === 'owner', `el creador tiene rol 'owner' (=${owner?.role})`);

  // 3) No se creó ninguna fila en community_creation_requests (no hay flujo de aprobación)
  const { count } = await admin
    .from('community_creation_requests')
    .select('id', { count: 'exact', head: true })
    .eq('proposed_slug', `test-libre-${TAG}`);
  check((count ?? 0) === 0, 'no se creó ninguna solicitud de aprobación (count=0)');

  // 4) La comunidad es visible/usable de inmediato (sin esperar aprobación)
  const { data: visible } = await admin
    .from('communities')
    .select('id, status')
    .eq('id', communityId)
    .eq('status', 'active')
    .maybeSingle();
  check(!!visible, 'la comunidad es activa y usable de inmediato');
}

main()
  .catch((e) => { fail++; console.error('\n✗ ERROR:', e.message); })
  .finally(async () => {
    if (communityId) {
      await admin.from('communities').delete().eq('id', communityId);
      console.log('\n✓ Cleanup completo (comunidad + miembros borrados)');
    }
    console.log(`\n${'='.repeat(50)}\nRESULTADO: ${pass} pass, ${fail} fail\n${'='.repeat(50)}`);
    process.exit(fail > 0 ? 1 : 0);
  });
