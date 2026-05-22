// Test e2e del flow de bracket auto-generation + reporte de marcadores.
// Usa service role para bypassear RLS y validar el camino completo.
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Round-robin de Berger (copia minimal del algoritmo en packages/domain)
function generateFixedAmericano({ participantIds, courts }) {
  const n = participantIds.length;
  if (n < 2) throw new Error('Mínimo 2 parejas');
  const teams = n % 2 === 0 ? [...participantIds] : [...participantIds, '__BYE__'];
  const total = teams.length;
  const totalRounds = total - 1;
  const rounds = [];
  for (let r = 0; r < totalRounds; r++) {
    const matches = [];
    const pairs = [];
    for (let i = 0; i < total / 2; i++) {
      const home = teams[i];
      const away = teams[total - 1 - i];
      if (home === '__BYE__' || away === '__BYE__') continue;
      pairs.push([home, away]);
    }
    let courtIdx = 0;
    for (const [a, b] of pairs) {
      if (courtIdx >= courts) break;
      matches.push({ roundNumber: r + 1, courtNumber: courtIdx + 1, one: a, two: b });
      courtIdx++;
    }
    rounds.push({ roundNumber: r + 1, matches });
    const fixed = teams[0];
    const rotating = teams.slice(1);
    const last = rotating.pop();
    rotating.unshift(last);
    teams.splice(0, total, fixed, ...rotating);
  }
  return rounds;
}

console.log('▸ 1. Buscar un torneo open con >=4 inscripciones confirmadas');
const { data: tournaments } = await admin
  .from('tournaments')
  .select('id, slug, name, status, format, courts')
  .eq('status', 'open')
  .like('format', 'americano%');

if (!tournaments?.length) {
  console.log('  → No hay torneos open. Saltando test e2e con datos seed.');
  process.exit(0);
}

let target = null;
for (const t of tournaments) {
  const { data: regs } = await admin
    .from('tournament_registrations')
    .select('id')
    .eq('tournament_id', t.id)
    .eq('status', 'confirmed');
  if ((regs?.length ?? 0) >= 4) {
    target = { ...t, regs: regs ?? [] };
    break;
  }
}

if (!target) {
  console.log('  → Ningún torneo open con >=4 inscripciones. Saltando.');
  process.exit(0);
}

console.log(`  ✓ Target: ${target.name} (${target.slug}) con ${target.regs.length} inscripciones`);
console.log(`    Format: ${target.format}, Courts: ${target.courts}`);

console.log('\n▸ 2. Limpiar matches viejos del torneo (idempotencia)');
await admin.from('matches').delete().eq('tournament_id', target.id);
console.log('  ✓ matches limpiados');

console.log('\n▸ 3. Generar bracket con Berger');
const courts = target.courts ?? 2;
const rounds = generateFixedAmericano({
  participantIds: target.regs.map((r) => r.id),
  courts,
});
const totalMatches = rounds.reduce((acc, r) => acc + r.matches.length, 0);
console.log(`  ✓ ${rounds.length} rondas, ${totalMatches} matches en ${courts} canchas`);

console.log('\n▸ 4. Insertar matches en BD');
const rows = rounds.flatMap((r) =>
  r.matches.map((m) => ({
    tournament_id: target.id,
    round_number: m.roundNumber,
    court_number: m.courtNumber,
    registration_one_id: m.one,
    registration_two_id: m.two,
    status: 'scheduled',
  })),
);
const { error: insertErr } = await admin.from('matches').insert(rows);
if (insertErr) {
  console.error(`  ✗ Insert falló: ${insertErr.message}`);
  process.exit(1);
}
console.log(`  ✓ ${rows.length} matches insertados`);

console.log('\n▸ 5. Verificar conteo en BD');
const { count, error: countErr } = await admin
  .from('matches')
  .select('*', { count: 'exact', head: true })
  .eq('tournament_id', target.id);
if (countErr) {
  console.error(`  ✗ Count falló: ${countErr.message}`);
  process.exit(1);
}
console.log(`  ✓ matches en BD: ${count} (esperado ${rows.length})`);
if (count !== rows.length) {
  console.error('  ✗ Mismatch entre rows generados y rows en BD');
  process.exit(1);
}

console.log('\n▸ 6. Simular reporte de marcador en match #1');
const { data: firstMatch } = await admin
  .from('matches')
  .select('id')
  .eq('tournament_id', target.id)
  .order('round_number')
  .order('court_number')
  .limit(1)
  .single();
const { error: scoreErr } = await admin
  .from('matches')
  .update({
    score_one: 6,
    score_two: 4,
    status: 'completed',
    ended_at: new Date().toISOString(),
  })
  .eq('id', firstMatch.id);
if (scoreErr) {
  console.error(`  ✗ Score update falló: ${scoreErr.message}`);
  process.exit(1);
}
console.log(`  ✓ match ${firstMatch.id.slice(0, 8)}… marcado 6-4`);

console.log('\n▸ 7. Cleanup: limpiar matches + volver status a open');
await admin.from('matches').delete().eq('tournament_id', target.id);
await admin.from('tournaments').update({ status: 'open' }).eq('id', target.id);
console.log('  ✓ estado restaurado');

console.log('\n✓✓✓ Bracket flow OK end-to-end ✓✓✓');
