#!/usr/bin/env node
/**
 * Seed dummy data para PadelKing.
 * Usa la service_role key (bypassa RLS). Solo para dev/beta.
 *
 * Ejecutar:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-dummy.mjs
 */

const URL = process.env.SUPABASE_URL ?? 'https://ulwieksgoamoqnpenabr.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_KEY ?? 'sb_secret_xlbUhBP16OZX1ihdUzv4Vg_zUmbGO4j';

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function api(path, opts = {}) {
  const res = await fetch(`${URL}${path}`, { ...opts, headers: { ...headers, ...(opts.headers ?? {}) } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${opts.method ?? 'GET'} ${path}: ${res.status} ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

const USERS = [
  { email: 'mejia@padelking.test',   password: 'Padel2026!', display_name: 'Andrés Mejía',     skill_category: 'tercera', gender: 'male' },
  { email: 'rodriguez@padelking.test', password: 'Padel2026!', display_name: 'Juanes Rodríguez', skill_category: 'cuarta',  gender: 'male' },
  { email: 'ruiz@padelking.test',     password: 'Padel2026!', display_name: 'Carlos Ruiz',      skill_category: 'tercera', gender: 'male' },
  { email: 'pena@padelking.test',     password: 'Padel2026!', display_name: 'Mario Peña',       skill_category: 'cuarta',  gender: 'male' },
  { email: 'gomez@padelking.test',    password: 'Padel2026!', display_name: 'Valentina Gómez',  skill_category: 'queens_c', gender: 'female' },
  { email: 'castro@padelking.test',   password: 'Padel2026!', display_name: 'Laura Castro',     skill_category: 'queens_c', gender: 'female' },
  { email: 'lopez@padelking.test',    password: 'Padel2026!', display_name: 'Diego López',      skill_category: 'quinta',  gender: 'male' },
  { email: 'admin@padelking.test',    password: 'Padel2026!', display_name: 'Comunidad Admin',  skill_category: 'segunda', gender: 'male' },
];

async function ensureUser(u) {
  // Buscar si ya existe
  const list = await api(`/auth/v1/admin/users?email=${encodeURIComponent(u.email)}`).catch(() => ({ users: [] }));
  const existing = list.users?.find((x) => x.email === u.email);
  if (existing) {
    console.log(`  · existe: ${u.email} → ${existing.id}`);
    // Asegurar email_confirm
    if (!existing.email_confirmed_at) {
      await api(`/auth/v1/admin/users/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ email_confirm: true }),
      });
    }
    return existing.id;
  }
  const created = await api('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { display_name: u.display_name },
    }),
  });
  console.log(`  ✓ creado: ${u.email} → ${created.id}`);
  return created.id;
}

async function updateProfile(profileId, patch) {
  await api(`/rest/v1/profiles?id=eq.${profileId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

async function getOrInsert(table, matchCol, matchVal, insertObj) {
  const res = await fetch(`${URL}/rest/v1/${table}?${matchCol}=eq.${encodeURIComponent(matchVal)}&select=*`, { headers });
  const rows = await res.json();
  if (rows.length > 0) {
    console.log(`  · existe ${table}: ${matchVal}`);
    return rows[0];
  }
  const created = await api(`/rest/v1/${table}`, {
    method: 'POST',
    body: JSON.stringify(insertObj),
  });
  console.log(`  ✓ creado ${table}: ${matchVal}`);
  return Array.isArray(created) ? created[0] : created;
}

async function ensureMember(communityId, profileId, role = 'member') {
  await api(`/rest/v1/community_members`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ community_id: communityId, profile_id: profileId, role }),
  }).catch(() => {});
}

async function main() {
  console.log('1) USUARIOS');
  const userIds = {};
  for (const u of USERS) {
    const id = await ensureUser(u);
    userIds[u.email] = id;
    await updateProfile(id, {
      display_name: u.display_name,
      skill_category: u.skill_category,
      gender: u.gender,
      city: 'Bogotá',
    });
  }

  console.log('\n2) CIUDADES');
  const citiesRes = await fetch(`${URL}/rest/v1/cities?slug=eq.bogota&select=*`, { headers });
  const [bogota] = await citiesRes.json();
  if (!bogota) throw new Error('Bogotá no encontrada en cities');

  console.log('\n3) COMUNIDADES');
  const c1 = await getOrInsert('communities', 'slug', 'bogota-padel-circuit', {
    slug: 'bogota-padel-circuit',
    name: 'Bogotá Pádel Circuit',
    description: 'Comunidad fundadora. Organiza torneos cada mes en distintos clubes de Bogotá.',
    city: 'Bogotá',
    city_id: bogota.id,
    owner_id: userIds['admin@padelking.test'],
    rating: 1850,
  });
  const c2 = await getOrInsert('communities', 'slug', 'valkiria-queens', {
    slug: 'valkiria-queens',
    name: 'Valkiria Queens',
    description: 'Comunidad femenina de pádel en Bogotá. Solo Queens.',
    city: 'Bogotá',
    city_id: bogota.id,
    owner_id: userIds['gomez@padelking.test'],
    rating: 1780,
  });

  console.log('\n4) MIEMBROS COMUNIDADES');
  // c1: todos los hombres + admin
  const c1Members = ['admin', 'mejia', 'rodriguez', 'ruiz', 'pena', 'lopez'];
  for (const slug of c1Members) {
    await ensureMember(c1.id, userIds[`${slug}@padelking.test`], slug === 'admin' ? 'owner' : 'member');
  }
  // c2: queens
  await ensureMember(c2.id, userIds['gomez@padelking.test'], 'owner');
  await ensureMember(c2.id, userIds['castro@padelking.test']);
  console.log('  ✓ miembros añadidos');

  console.log('\n5) CLUB');
  const club = await getOrInsert('clubs', 'slug', 'club-la-pala', {
    slug: 'club-la-pala',
    name: 'Club La Pala',
    city: 'Bogotá',
    city_id: bogota.id,
    owner_id: userIds['admin@padelking.test'],
  });

  console.log('\n6) EQUIPOS');
  const t1 = await getOrInsert('teams', 'slug', 'mejia-rodriguez', {
    slug: 'mejia-rodriguez',
    name: 'Mejía / Rodríguez',
    primary_community_id: c1.id,
    category: 'tercera', // max strength = tercera (val 4)
    rating: 1620,
  });
  const t2 = await getOrInsert('teams', 'slug', 'ruiz-pena', {
    slug: 'ruiz-pena',
    name: 'Ruiz / Peña',
    primary_community_id: c1.id,
    category: 'tercera',
    rating: 1580,
  });
  const t3 = await getOrInsert('teams', 'slug', 'valkirias-1', {
    slug: 'valkirias-1',
    name: 'Gómez / Castro',
    primary_community_id: c2.id,
    category: 'queens_c',
    rating: 1450,
  });

  console.log('\n7) MIEMBROS DE EQUIPOS');
  async function ensureTeamMember(teamId, profileId) {
    await api('/rest/v1/team_members', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ team_id: teamId, profile_id: profileId, is_active: true }),
    }).catch(() => {});
  }
  await ensureTeamMember(t1.id, userIds['mejia@padelking.test']);
  await ensureTeamMember(t1.id, userIds['rodriguez@padelking.test']);
  await ensureTeamMember(t2.id, userIds['ruiz@padelking.test']);
  await ensureTeamMember(t2.id, userIds['pena@padelking.test']);
  await ensureTeamMember(t3.id, userIds['gomez@padelking.test']);
  await ensureTeamMember(t3.id, userIds['castro@padelking.test']);
  console.log('  ✓ team_members OK');

  console.log('\n8) TORNEOS');
  const now = new Date();
  const inDays = (n) => new Date(now.getTime() + n * 86400000).toISOString();
  const inDaysEnd = (n) => new Date(now.getTime() + n * 86400000 + 6 * 3600000).toISOString();

  const tournaments = [
    {
      slug: 'copa-apertura-tercera-jun-2026',
      name: 'Copa Apertura — 3ra',
      format: 'americano_fijo',
      tier: 'competitivo',
      weight: 1.0,
      status: 'open',
      category_kind: 'estandar',
      category: 'tercera',
      pairing_mode: 'fixed',
      competition_unit: 'team',
      starts_at: inDays(7),
      ends_at: inDaysEnd(7),
      registration_deadline: inDays(6),
      price_per_team: 0,
      max_teams: 16,
      min_teams: 4,
      rotation_games: 24,
      description: 'Americano de apertura. Pareja fija, 16 equipos, premios para top 3.',
      club_id: club.id,
      city_id: bogota.id,
    },
    {
      slug: 'suma-8-mayo-2026',
      name: 'Suma 8 — Casual',
      format: 'americano_fijo',
      tier: 'competitivo',
      weight: 1.0,
      status: 'open',
      category_kind: 'suma',
      min_sum: 8,
      pairing_mode: 'fixed',
      competition_unit: 'team',
      starts_at: inDays(14),
      ends_at: inDaysEnd(14),
      registration_deadline: inDays(13),
      price_per_team: 80000,
      max_teams: 12,
      min_teams: 4,
      rotation_games: 24,
      description: 'Suma 8: parejas con suma ≥ 8 (3ra+3ra, 2da+4ta, etc). Premio: bonos La Pala.',
      club_id: club.id,
      city_id: bogota.id,
    },
    {
      slug: 'queens-c-junio',
      name: 'Queens C — Open',
      format: 'eliminacion',
      tier: 'competitivo',
      weight: 1.0,
      status: 'open',
      category_kind: 'queens_estandar',
      category: 'queens_c',
      competition_unit: 'team',
      starts_at: inDays(21),
      ends_at: inDaysEnd(21),
      registration_deadline: inDays(20),
      price_per_team: 60000,
      max_teams: 8,
      min_teams: 4,
      rotation_games: 24,
      description: 'Eliminación directa, categoría Queens C. Premio: kit Bullpadel + paleta.',
      club_id: club.id,
      city_id: bogota.id,
    },
    {
      slug: 'americano-random-cuarta-mayo',
      name: 'Americano Random — 4ta',
      format: 'americano_random',
      tier: 'casual',
      weight: 0.4,
      status: 'open',
      category_kind: 'estandar',
      category: 'cuarta',
      pairing_mode: 'random',
      competition_unit: 'player',
      starts_at: inDays(3),
      ends_at: inDaysEnd(3),
      registration_deadline: inDays(2),
      price_per_team: 25000,
      max_teams: 16,
      min_teams: 8,
      rotation_games: 24,
      description: 'Inscripción individual. La app arma parejas aleatorias cada ronda.',
      club_id: club.id,
      city_id: bogota.id,
    },
    {
      slug: 'mixto-suma-10',
      name: 'Mixto Suma 10',
      format: 'americano_fijo',
      tier: 'competitivo',
      weight: 1.0,
      status: 'open',
      category_kind: 'mixto_suma',
      min_sum: 10,
      pairing_mode: 'fixed',
      competition_unit: 'team',
      starts_at: inDays(30),
      ends_at: inDaysEnd(30),
      registration_deadline: inDays(28),
      price_per_team: 100000,
      max_teams: 12,
      min_teams: 4,
      rotation_games: 24,
      description: '1 hombre + 1 mujer. Suma de categorías ≥ 10.',
      club_id: club.id,
      city_id: bogota.id,
    },
  ];

  for (const t of tournaments) {
    await getOrInsert('tournaments', 'slug', t.slug, t);
  }

  console.log('\n✓ SEED COMPLETO\n');
  console.log('Usuarios de prueba (todos con password: Padel2026!):');
  USERS.forEach((u) => console.log(`  · ${u.email}  (${u.display_name}, ${u.skill_category})`));
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
