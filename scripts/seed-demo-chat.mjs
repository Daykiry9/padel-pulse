/**
 * Seed de chat para el torneo demo.
 *
 * Por que existe: la app tiene reportar/bloquear (requisito de la guideline 1.2
 * de Apple) pero esos controles solo se renderizan en mensajes ajenos —
 * `MessageModeration` va dentro de un `{!isMe && ...}`. Con el chat vacio no hay
 * nada que reportar, asi que el revisor de Apple no puede verificar la
 * funcionalidad y un tester grabando el video tampoco puede mostrarla.
 *
 * Las inscripciones que siembra `seed-demo-prod.mjs` son parejas de invitados
 * sin perfil (`player_one_id` en null), asi que ninguna podia escribir. Los
 * autores de aca son perfiles del seed original, que no estan inscritos — y no
 * hace falta que lo esten: la policy `tournament chat read` exige que **quien
 * mira** sea owner o inscrito confirmado, no que lo sea el autor.
 *
 * Es idempotente: borra los mensajes del torneo demo y los vuelve a insertar.
 * Solo toca ese `target_id`.
 *
 *   node scripts/seed-demo-chat.mjs --dry-run
 *   node scripts/seed-demo-chat.mjs --apply
 */

import { readFileSync } from 'node:fs';

const PROJECT = 'ulwieksgoamoqnpenabr';
const APPLY = process.argv.includes('--apply');
const SLUG = 'express-cali-friday';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [
      l.slice(0, l.indexOf('=')).trim(),
      l
        .slice(l.indexOf('=') + 1)
        .trim()
        .replace(/^"|"$/g, ''),
    ])
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

// Perfiles del seed original. Camilo es de Cali, que es donde juega este torneo.
const CAMILO = '1c68ea2e-84db-43e8-8202-ccbf12660bc7'; // Camilo Buitrago · Cali
const CAMILA = '211e3e85-0569-4f7e-bb45-a567029c72f5'; // Camila Vega
const CARLOS = '073defd4-9e94-4c1b-afab-376bdb1cfd1c'; // Carlos Mendoza

// Minutos hacia atras para que la conversacion tenga un orden natural y no
// aparezcan los seis mensajes con la misma hora.
const HILO = [
  [CAMILO, 'Parceros, confirmo pareja para el viernes. Llegamos 15 min antes para calentar.', 240],
  [CAMILA, '¿Alguien sabe si hay parqueadero en la sede o toca dejar el carro en la calle?', 215],
  [CAMILO, 'Hay parqueadero pero es chiquito. Yo llego temprano y les aviso si queda cupo.', 200],
  [CARLOS, 'Ojo que la cancha 3 estaba con la red floja la semana pasada. Ya avisé al club.', 160],
  [null, 'Listo, nos vemos el viernes. Llevo bolas nuevas.', 95],
  [CAMILA, 'Perfecto. ¡Que gane el mejor! 🎾', 60],
];

const rows = await sql(
  `select t.id, (select id from auth.users where email = 'demo@padelking.co') as demo_id
     from public.tournaments t where t.slug = ${q(SLUG)}`
);
const { id: tournamentId, demo_id: demoId } = rows[0] ?? {};
if (!tournamentId) throw new Error(`No existe el torneo ${SLUG}`);
if (!demoId) throw new Error('No existe demo@padelking.co — corre seed-demo-account.mjs primero');

const statements = [
  `delete from public.chat_messages
     where target_kind = 'tournament' and target_id = ${q(tournamentId)}`,
  ...HILO.map(
    ([autor, texto, hace]) =>
      `insert into public.chat_messages (target_kind, target_id, profile_id, body, created_at)
         values ('tournament', ${q(tournamentId)}, ${q(autor ?? demoId)}, ${q(texto)},
                 now() - interval '${hace} minutes')`
  ),
];

console.log(`Torneo: ${SLUG} (${tournamentId})`);
for (const [autor, texto] of HILO) {
  console.log(`  · ${autor ? autor.slice(0, 8) : 'DEMO    '} — ${texto.slice(0, 62)}`);
}
console.log(`\n${statements.length} sentencias.`);

if (!APPLY) {
  console.log('\n(dry-run — nada escrito. Corre con --apply)');
  process.exit(0);
}

console.log('\nAplicando en una transacción...');
await sql(`begin;\n${statements.join(';\n')};\ncommit;`);
console.log('OK. Verificando…');

const check = await sql(
  `select count(*) as mensajes,
          count(distinct profile_id) as autores,
          sum(case when profile_id = ${q(demoId)} then 1 else 0 end) as del_demo,
          count(*) - sum(case when profile_id = ${q(demoId)} then 1 else 0 end) as reportables
     from public.chat_messages
    where target_kind = 'tournament' and target_id = ${q(tournamentId)}`
);
console.table(check);
