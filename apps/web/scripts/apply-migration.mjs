// Aplica una migración SQL al proyecto Supabase remoto via Management API.
// Uso: node scripts/apply-migration.mjs <ruta-archivo.sql>
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

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error('Uso: node scripts/apply-migration.mjs <archivo.sql>');
  process.exit(1);
}

const projectId = env.SUPABASE_PROJECT_ID;
const accessToken = env.SUPABASE_ACCESS_TOKEN;
if (!projectId || !accessToken) {
  console.error('Faltan SUPABASE_PROJECT_ID y/o SUPABASE_ACCESS_TOKEN en .env.local');
  process.exit(1);
}

const sql = await readFile(resolve(__dirname, '../../..', sqlPath), 'utf8');
console.log(`▸ Aplicando ${sqlPath} (${sql.length} bytes) a ${projectId}...`);

const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`✗ HTTP ${res.status}: ${text}`);
  process.exit(1);
}

console.log(`✓ Migración aplicada. Respuesta: ${text.slice(0, 200)}`);
