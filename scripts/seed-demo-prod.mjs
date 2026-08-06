/**
 * Seed de datos demo para produccion.
 *
 * Los torneos del demo seed original (20260606120000_demo_seed.sql) se crearon
 * como cascarones: sin inscripciones ni partidos, y con fechas de junio. Al
 * quedar en el pasado desaparecen de /tournaments y la app se ve muerta.
 *
 * Este script, para los torneos demo y SOLO para esos:
 *   - reubica las fechas en el futuro (y ajusta los nombres que decian "Junio")
 *   - crea jugadores invitados + inscripciones
 *   - al torneo en curso le genera el round-robin con marcadores jugados
 *
 * Es idempotente: borra lo que haya sembrado antes para esos tournament_id
 * y vuelve a insertar. No toca ningun otro torneo.
 *
 *   node scripts/seed-demo-prod.mjs --dry-run   # imprime el plan, no escribe
 *   node scripts/seed-demo-prod.mjs --apply
 */

import { readFileSync } from 'node:fs';

const PROJECT = 'ulwieksgoamoqnpenabr';
const APPLY = process.argv.includes('--apply');

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')])
);
const TOKEN = env.SUPABASE_ACCESS_TOKEN;

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await r.json();
  if (!r.ok || body.message) throw new Error(JSON.stringify(body).slice(0, 500));
  return body;
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Quien queda como autor de la data demo. Perfil de prueba, no un usuario real.
const AUTHOR = 'c60ba573-0170-404f-8710-11676126cabe'; // John Doe

// Nombres para los invitados. Suenan a Colombia sin ser nadie en particular.
const NOMBRES = [
  'Andrés Salazar', 'Camilo Restrepo', 'Daniel Ospina', 'Felipe Márquez',
  'Santiago Duque', 'Nicolás Cárdenas', 'Mateo Villegas', 'Tomás Escobar',
  'Julián Arango', 'Emilio Betancur', 'Simón Gaviria', 'Martín Zuluaga',
  'Alejandro Pineda', 'Ricardo Mejía', 'Esteban Uribe', 'Sergio Londoño',
  'Valentina Ríos', 'Mariana Acosta', 'Isabela Franco', 'Sofía Rendón',
  'Laura Jaramillo', 'Daniela Correa', 'Paulina Vélez', 'Gabriela Toro',
  'Antonia Mesa', 'Manuela Ceballos', 'Salomé Ángel', 'Juanita Posada',
  'Carolina Bedoya', 'Natalia Quintero', 'Sara Montoya', 'Lucía Agudelo',
];

// starts_at relativo a hoy, en dias. Negativo = ya arrancó (torneo en curso).
const PLAN = [
  { slug: 'americano-laureles-mier', dias: 0,  nombre: 'Americano Laureles Miércoles', pares: 6,  jugado: true  },
  { slug: 'express-cali-friday',     dias: 2,  nombre: 'Express Cali Viernes',          pares: 6,  jugado: false },
  { slug: 'americano-poblado-sabado',dias: 3,  nombre: 'Americano El Poblado · Sábado', pares: 9,  jugado: false },
  { slug: 'liga-norte-junio',        dias: 9,  nombre: 'Liga Norte Agosto',             pares: 11, jugado: false },
  { slug: 'queens-cup-abierta',      dias: 16, nombre: 'Queens Cup Abierta',            pares: 12, jugado: false },
  { slug: 'arena-93-open-junio',     dias: 23, nombre: 'Arena 93 Open · Agosto',        pares: 15, jugado: false },
];

const rows = await sql(
  `select id, slug, max_teams, courts, points_per_match from tournaments where slug in (${PLAN.map((p) => q(p.slug)).join(',')})`
);
const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));

const stmts = [];
const resumen = [];

for (const p of PLAN) {
  const t = bySlug[p.slug];
  if (!t) { console.warn(`! no existe: ${p.slug}`); continue; }

  const pares = Math.min(p.pares, t.max_teams);

  // Fechas. registration_deadline <= starts_at <= ends_at (constraint valid_dates).
  const starts = `now() + interval '${p.dias} days'`;
  const startsAjustado = p.dias === 0 ? `now() - interval '2 hours'` : `date_trunc('hour', ${starts}) + interval '18 hours'`;

  stmts.push(`update tournaments set
      name = ${q(p.nombre)},
      starts_at = ${startsAjustado},
      ends_at = ${startsAjustado} + interval '4 hours',
      registration_deadline = ${startsAjustado} - interval '1 hour'
    where id = '${t.id}'`);

  // Idempotencia: limpiar lo sembrado antes para este torneo.
  stmts.push(`delete from matches where tournament_id = '${t.id}'`);
  stmts.push(`delete from tournament_registrations where tournament_id = '${t.id}'`);
  stmts.push(`delete from guest_players where tournament_id = '${t.id}'`);

  // Invitados: 2 por pareja.
  const guests = [];
  for (let i = 0; i < pares * 2; i++) {
    // Desplaza el arranque por torneo para que no se repitan los mismos nombres.
    const nombre = NOMBRES[(i + p.dias * 3) % NOMBRES.length];
    guests.push({ ref: `g${i}`, nombre });
  }
  const guestValues = guests
    .map((g) => `(gen_random_uuid(), '${t.id}', ${q(g.nombre)}, '${AUTHOR}', now())`)
    .join(',\n      ');
  stmts.push(
    `insert into guest_players (id, tournament_id, display_name, created_by, created_at) values\n      ${guestValues}`
  );

  // Inscripciones: empareja invitados consecutivos (1-2, 3-4, ...).
  stmts.push(`with g as (
      select id, row_number() over (order by created_at, id) rn
      from guest_players where tournament_id = '${t.id}'
    )
    insert into tournament_registrations
      (id, tournament_id, registered_by, status, payment_amount, guest_player_one_id, guest_player_two_id, registered_at, confirmed_at)
    select gen_random_uuid(), '${t.id}', '${AUTHOR}', 'confirmed', 0, a.id, b.id, now(), now()
    from g a join g b on b.rn = a.rn + 1
    where a.rn % 2 = 1`);

  if (p.jugado) {
    // Round-robin completo, repartido en las canchas disponibles.
    // El marcador suma points_per_match para que los standings cuadren.
    stmts.push(`with r as (
        select id, row_number() over (order by registered_at, id) rn
        from tournament_registrations where tournament_id = '${t.id}'
      ), pares as (
        select a.id one_id, b.id two_id, a.rn arn, b.rn brn,
               row_number() over (order by a.rn, b.rn) idx
        from r a join r b on b.rn > a.rn
      )
      insert into matches
        (id, tournament_id, round_number, court_number, registration_one_id, registration_two_id,
         score_one, score_two, status, is_bye, confirmed_by_one, confirmed_by_two, ended_at)
      select gen_random_uuid(), '${t.id}',
             ((idx - 1) / ${t.courts})::int + 1,
             ((idx - 1) % ${t.courts})::int + 1,
             one_id, two_id,
             sc, ${t.points_per_match} - sc,
             'completed', false, true, true, now() - interval '1 hour'
      from (select *, ((arn * 7 + brn * 3) % (${t.points_per_match} - 3)) + 2 sc from pares) x`);

    resumen.push(`${p.slug}: ${pares} parejas · round-robin de ${(pares * (pares - 1)) / 2} partidos jugados · arranca hoy`);
  } else {
    resumen.push(`${p.slug}: ${pares}/${t.max_teams} parejas inscritas · en ${p.dias} días · "${p.nombre}"`);
  }
}

console.log('\nPlan:\n' + resumen.map((r) => '  · ' + r).join('\n'));
console.log(`\n${stmts.length} sentencias.`);

if (!APPLY) {
  console.log('\n(dry-run — nada escrito. Corre con --apply)');
  process.exit(0);
}

// Todo o nada.
console.log('\nAplicando en una transacción...');
await sql(['begin;', ...stmts.map((s) => s.trim().replace(/;$/, '') + ';'), 'commit;'].join('\n'));
console.log('OK.');

const check = await sql(`select t.slug, t.name, t.status, t.starts_at::date d,
    (select count(*) from tournament_registrations r where r.tournament_id = t.id) inscritos,
    (select count(*) from matches m where m.tournament_id = t.id) partidos,
    (select count(*) from matches m where m.tournament_id = t.id and m.status = 'completed') jugados
  from tournaments t where t.slug in (${PLAN.map((p) => q(p.slug)).join(',')})
  order by t.starts_at`);
console.table(check);
