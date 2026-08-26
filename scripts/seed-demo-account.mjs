/**
 * Cuenta demo para la revisión de App Store / Play.
 *
 * Apple puede rechazar por guideline 2.1 si el revisor no puede evaluar la app
 * completa. PadelKing deja ver torneos y brackets sin cuenta, pero inscribirse,
 * reportar marcador y el chat piden login. Esta cuenta existe para que el
 * revisor entre y vea el flujo real.
 *
 * Ojo con el seed original (20260606120000_demo_seed.sql): mete un hash bcrypt
 * falso a propósito, con lo cual esos usuarios NO pueden hacer login. Aquí sí
 * se genera un hash real con pgcrypto.
 *
 * Idempotente: si la cuenta ya existe, le resetea la contraseña y rehace las
 * inscripciones.
 *
 *   node scripts/seed-demo-account.mjs --dry-run
 *   node scripts/seed-demo-account.mjs --apply
 */

import { readFileSync } from 'node:fs';

const PROJECT = 'ulwieksgoamoqnpenabr';
const APPLY = process.argv.includes('--apply');

const EMAIL = 'demo@padelking.co';
const PASSWORD = 'PadelKingDemo2026';
const DISPLAY_NAME = 'Cuenta Demo';
// Torneos abiertos donde queda inscrita, para que el revisor no vea la app vacía.
const TOURNAMENTS = ['express-cali-friday', 'americano-poblado-sabado'];

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')])
);

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await r.json();
  if (!r.ok || body.message) throw new Error(JSON.stringify(body).slice(0, 600));
  return body;
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const stmts = [
  // 1. El usuario de auth. Sin ON CONFLICT: auth.users.email no tiene
  //    constraint unico, asi que se inserta solo si no existe y despues se
  //    fuerza la contraseña con un update que corre siempre.
  `insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    select
      '00000000-0000-0000-0000-000000000000'::uuid, gen_random_uuid(),
      'authenticated', 'authenticated', ${q(EMAIL)},
      crypt(${q(PASSWORD)}, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', ${q(DISPLAY_NAME)}),
      now(), now(), '', '', '', ''
    where not exists (select 1 from auth.users where email = ${q(EMAIL)})`,

  // Hash bcrypt real, para que el login del revisor funcione de verdad.
  `update auth.users
      set encrypted_password = crypt(${q(PASSWORD)}, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
    where email = ${q(EMAIL)}`,

  // 2. La identidad del proveedor email. Sin esto el login puede fallar segun
  //    la version de GoTrue, aunque el usuario exista.
  `insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
    select gen_random_uuid(), u.id, u.id::text,
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           'email', now(), now()
    from auth.users u
    where u.email = ${q(EMAIL)}
      and not exists (
        select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
      )`,

  // 3. El profile lo crea el trigger on_auth_user_created. Solo se completan
  //    los campos que hacen que la cuenta se vea como la de alguien real.
  `update public.profiles p
     set display_name = ${q(DISPLAY_NAME)},
         city = 'Bogotá',
         skill_level = 'intermediate'
   from auth.users u
   where u.email = ${q(EMAIL)} and p.id = u.id`,

  // 4. Inscripciones limpias. El constraint registration_modality exige una de
  //    tres formas; estos torneos son de parejas, asi que va la cuenta demo
  //    como player_one_id y un invitado como guest_player_two_id.
  `delete from public.tournament_registrations r
    using auth.users u
    where u.email = ${q(EMAIL)}
      and (r.player_one_id = u.id or r.player_id = u.id)`,

  `delete from public.guest_players g
    where g.display_name = 'Compañero Demo'
      and g.tournament_id in (
        select id from public.tournaments where slug in (${TOURNAMENTS.map(q).join(',')})
      )`,

  `insert into public.guest_players (id, tournament_id, display_name, created_by, created_at)
    select gen_random_uuid(), t.id, 'Compañero Demo', u.id, now()
    from public.tournaments t
    cross join auth.users u
    where u.email = ${q(EMAIL)}
      and t.slug in (${TOURNAMENTS.map(q).join(',')})`,

  `insert into public.tournament_registrations
      (id, tournament_id, registered_by, status, payment_amount,
       player_one_id, guest_player_two_id, registered_at, confirmed_at)
    select gen_random_uuid(), t.id, u.id, 'confirmed', 0,
           u.id, g.id, now(), now()
    from public.tournaments t
    cross join auth.users u
    join public.guest_players g
      on g.tournament_id = t.id and g.display_name = 'Compañero Demo'
    where u.email = ${q(EMAIL)}
      and t.slug in (${TOURNAMENTS.map(q).join(',')})`,
];

console.log(`Cuenta demo: ${EMAIL}`);
console.log(`Contraseña:  ${PASSWORD}`);
console.log(`Inscrita en: ${TOURNAMENTS.join(', ')}`);
console.log(`\n${stmts.length} sentencias.`);

if (!APPLY) {
  console.log('\n(dry-run — nada escrito. Corre con --apply)');
  process.exit(0);
}

await sql(['begin;', ...stmts.map((s) => s.trim().replace(/;$/, '') + ';'), 'commit;'].join('\n'));
console.log('\nOK. Verificando…');

const check = await sql(`select u.email,
    u.email_confirmed_at is not null confirmado,
    (u.encrypted_password like '$2%') hash_real,
    exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='email') identidad,
    p.display_name, p.city,
    (select count(*) from public.tournament_registrations r where r.player_one_id=u.id) inscripciones
  from auth.users u left join public.profiles p on p.id=u.id
  where u.email = ${q(EMAIL)}`);
console.table(check);
