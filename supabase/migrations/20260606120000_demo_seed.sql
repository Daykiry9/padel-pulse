-- PadelKing — demo seed
--
-- Llena la app con comunidades, clubes, miembros y torneos sintéticos para
-- que la UI se vea "viva" sin necesidad de tracción real. Toda la data está
-- marcada con email '@padelking-demo.local' para que un solo DELETE limpie
-- todo cuando llegue tracción real:
--
--   delete from auth.users where email like '%@padelking-demo.local';
--
-- Idempotente: usa WHERE NOT EXISTS / ON CONFLICT DO NOTHING en todos lados.

begin;

-- ============================================================
-- 1. Profiles demo (auth.users + public.profiles)
-- ============================================================
-- 32 perfiles repartidos entre 5 ciudades, mix de género y categoría.
-- Los hashes de password son dummies — no se puede hacer login con ellos.

with seed_users as (
  select * from (values
    -- Bogotá (10)
    ('bog01@padelking-demo.local','Carlos Mendoza','Bogotá','tercera','male'),
    ('bog02@padelking-demo.local','Andrés Castro','Bogotá','cuarta','male'),
    ('bog03@padelking-demo.local','Felipe Ríos','Bogotá','segunda','male'),
    ('bog04@padelking-demo.local','Mauricio León','Bogotá','tercera','male'),
    ('bog05@padelking-demo.local','Daniela Ortiz','Bogotá','queens_b','female'),
    ('bog06@padelking-demo.local','Camila Vega','Bogotá','queens_c','female'),
    ('bog07@padelking-demo.local','Laura Mejía','Bogotá','queens_a','female'),
    ('bog08@padelking-demo.local','Juan Pablo R.','Bogotá','quinta','male'),
    ('bog09@padelking-demo.local','Sara López','Bogotá','queens_d','female'),
    ('bog10@padelking-demo.local','Ricardo Páez','Bogotá','cuarta','male'),
    -- Medellín (8)
    ('med01@padelking-demo.local','Sebastián Uribe','Medellín','tercera','male'),
    ('med02@padelking-demo.local','Tomás Restrepo','Medellín','segunda','male'),
    ('med03@padelking-demo.local','Valentina Gómez','Medellín','queens_b','female'),
    ('med04@padelking-demo.local','Mariana Velez','Medellín','queens_c','female'),
    ('med05@padelking-demo.local','Alejandro Tobón','Medellín','cuarta','male'),
    ('med06@padelking-demo.local','Pablo Henao','Medellín','tercera','male'),
    ('med07@padelking-demo.local','Isabella Cano','Medellín','queens_a','female'),
    ('med08@padelking-demo.local','Diego Arias','Medellín','quinta','male'),
    -- Cali (6)
    ('cal01@padelking-demo.local','Mateo Salazar','Cali','tercera','male'),
    ('cal02@padelking-demo.local','Natalia Quintero','Cali','queens_b','female'),
    ('cal03@padelking-demo.local','Esteban Cárdenas','Cali','segunda','male'),
    ('cal04@padelking-demo.local','Paula Ramírez','Cali','queens_c','female'),
    ('cal05@padelking-demo.local','Santiago Vargas','Cali','cuarta','male'),
    ('cal06@padelking-demo.local','Camilo Buitrago','Cali','tercera','male'),
    -- Barranquilla (4)
    ('baq01@padelking-demo.local','Andrea Polo','Barranquilla','queens_b','female'),
    ('baq02@padelking-demo.local','Luis Pertuz','Barranquilla','tercera','male'),
    ('baq03@padelking-demo.local','Roberto Char','Barranquilla','segunda','male'),
    ('baq04@padelking-demo.local','Carolina Ávila','Barranquilla','queens_c','female'),
    -- Bucaramanga (4)
    ('bga01@padelking-demo.local','Jorge Serrano','Bucaramanga','cuarta','male'),
    ('bga02@padelking-demo.local','Mónica Acevedo','Bucaramanga','queens_c','female'),
    ('bga03@padelking-demo.local','Iván Galvis','Bucaramanga','tercera','male'),
    ('bga04@padelking-demo.local','Daniel Pinilla','Bucaramanga','quinta','male')
  ) as t(email, display_name, city, skill, gender)
)
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  s.email,
  -- bcrypt hash de "demo" — no se usa para login, solo satisface el NOT NULL
  '$2a$10$abcdefghijklmnopqrstuvDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEM',
  now() - interval '30 days',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', s.display_name),
  now() - interval '30 days',
  now() - interval '30 days',
  '', '', '', ''
from seed_users s
where not exists (
  select 1 from auth.users u where u.email = s.email
);

-- profiles: el trigger on_auth_user_created ya creó las filas con city=NULL.
-- Aquí backfilleamos los campos demográficos.
update public.profiles p
set
  city = case
    when u.email like 'bog%' then 'Bogotá'
    when u.email like 'med%' then 'Medellín'
    when u.email like 'cal%' then 'Cali'
    when u.email like 'baq%' then 'Barranquilla'
    when u.email like 'bga%' then 'Bucaramanga'
  end,
  skill_category = (case substr(u.email, 1, 3)
    when 'bog' then (array['tercera','cuarta','segunda','tercera','queens_b','queens_c','queens_a','quinta','queens_d','cuarta'])[ ((right(split_part(u.email,'@',1), 2))::int) ]
    when 'med' then (array['tercera','segunda','queens_b','queens_c','cuarta','tercera','queens_a','quinta'])[ ((right(split_part(u.email,'@',1), 2))::int) ]
    when 'cal' then (array['tercera','queens_b','segunda','queens_c','cuarta','tercera'])[ ((right(split_part(u.email,'@',1), 2))::int) ]
    when 'baq' then (array['queens_b','tercera','segunda','queens_c'])[ ((right(split_part(u.email,'@',1), 2))::int) ]
    when 'bga' then (array['cuarta','queens_c','tercera','quinta'])[ ((right(split_part(u.email,'@',1), 2))::int) ]
  end)::team_category,
  gender = (case
    when u.raw_user_meta_data->>'display_name' ~* '^(Daniela|Camila|Laura|Sara|Valentina|Mariana|Isabella|Natalia|Paula|Andrea|Carolina|Mónica)' then 'female'
    else 'male'
  end)::gender_kind,
  rating = 1100 + (abs(hashtext(u.email::text)) % 400)
from auth.users u
where p.id = u.id
  and u.email like '%@padelking-demo.local'
  and p.city is null; -- solo backfilea las que el trigger dejó vacías

-- ============================================================
-- 2. Comunidades demo
-- ============================================================
-- 8 comunidades repartidas; owners son los primeros demo profiles por ciudad.

with city_owners as (
  select
    p.id as owner_id,
    p.city,
    row_number() over (partition by p.city order by p.created_at) as rn
  from public.profiles p
  where p.id in (select id from auth.users where email like '%@padelking-demo.local')
)
insert into public.communities (slug, name, description, city, city_id, owner_id, rating, status, is_public)
select * from (values
  ('padel-norte-bogota', 'Padel Norte Bogotá',
   'Comunidad de jugadores de la zona norte. Encuentros sábados y torneos mensuales.',
   'Bogotá',
   (select id from public.cities where slug = 'bogota'),
   (select owner_id from city_owners where city = 'Bogotá' and rn = 1),
   1280, 'active'::community_status, true),
  ('chico-padel-club', 'Chicó Padel Club',
   'Grupo cerrado del Chicó. Niveles 2da-4ta principalmente. Pet-friendly off-court.',
   'Bogotá',
   (select id from public.cities where slug = 'bogota'),
   (select owner_id from city_owners where city = 'Bogotá' and rn = 2),
   1340, 'active'::community_status, false),
  ('queens-bogota', 'Queens Bogotá',
   'Comunidad femenina de Bogotá. Torneos Queens de A a D. Solo mujeres.',
   'Bogotá',
   (select id from public.cities where slug = 'bogota'),
   (select owner_id from city_owners where city = 'Bogotá' and rn = 5),
   1260, 'active'::community_status, true),
  ('padel-poblado', 'Padel El Poblado',
   'La comunidad más activa de Medellín. Mejor americano de la ciudad cada miércoles.',
   'Medellín',
   (select id from public.cities where slug = 'medellin'),
   (select owner_id from city_owners where city = 'Medellín' and rn = 1),
   1310, 'active'::community_status, true),
  ('laureles-padel', 'Laureles Padel',
   'Padel casual en Laureles, ambiente relajado. Para entrar de la mano del padel.',
   'Medellín',
   (select id from public.cities where slug = 'medellin'),
   (select owner_id from city_owners where city = 'Medellín' and rn = 5),
   1180, 'active'::community_status, true),
  ('padel-cali-sur', 'Padel Cali Sur',
   'Jugadores del sur de Cali. Toques sociales viernes y torneos abiertos cada 15 días.',
   'Cali',
   (select id from public.cities where slug = 'cali'),
   (select owner_id from city_owners where city = 'Cali' and rn = 1),
   1220, 'active'::community_status, true),
  ('padel-caribe', 'Padel del Caribe',
   'Comunidad costeña: Barranquilla + alrededores. Calor, sal y revés liftado.',
   'Barranquilla',
   (select id from public.cities where slug = 'barranquilla'),
   (select owner_id from city_owners where city = 'Barranquilla' and rn = 1),
   1190, 'active'::community_status, true),
  ('bucaramanga-padel', 'Bucaramanga Padel',
   'Crew de Bucaramanga. Cancha cubierta, juego durante el año entero.',
   'Bucaramanga',
   (select id from public.cities where slug = 'bucaramanga'),
   (select owner_id from city_owners where city = 'Bucaramanga' and rn = 1),
   1150, 'active'::community_status, true)
) as t(slug, name, description, city, city_id, owner_id, rating, status, is_public)
where not exists (select 1 from public.communities c where c.slug = t.slug);

-- ============================================================
-- 3. Members: cada comunidad demo se llena con todos los profiles
--    de su ciudad. Owner es admin automáticamente.
-- ============================================================
-- owners ya son members vía el trigger del init, pero defensivo:
insert into public.community_members (community_id, profile_id, role, joined_at)
select c.id, c.owner_id, 'owner'::member_role, c.created_at
from public.communities c
where c.slug in (
  'padel-norte-bogota','chico-padel-club','queens-bogota','padel-poblado',
  'laureles-padel','padel-cali-sur','padel-caribe','bucaramanga-padel'
)
on conflict do nothing;

-- miembros regulares: profiles de la ciudad que NO son el owner
insert into public.community_members (community_id, profile_id, role, joined_at)
select c.id, p.id, 'member'::member_role,
       c.created_at + (random() * interval '20 days')
from public.communities c
join public.profiles p on p.city = c.city
where c.slug in (
  'padel-norte-bogota','chico-padel-club','queens-bogota','padel-poblado',
  'laureles-padel','padel-cali-sur','padel-caribe','bucaramanga-padel'
)
  and p.id <> c.owner_id
  and p.id in (select id from auth.users where email like '%@padelking-demo.local')
  -- Queens Bogotá solo femenino
  and (c.slug <> 'queens-bogota' or p.gender = 'female')
on conflict do nothing;

-- Juan (super admin) entra como member en 3 comunidades para que vea data
-- al hacer swipe entre tabs. No-op si no existe ese profile.
insert into public.community_members (community_id, profile_id, role, joined_at)
select c.id, p.id, 'member'::member_role, now() - interval '5 days'
from public.communities c
cross join public.profiles p
where c.slug in ('padel-norte-bogota','padel-poblado','padel-cali-sur')
  and p.is_super_admin = true
on conflict do nothing;

-- ============================================================
-- 4. Clubs demo
-- ============================================================
with city_owners as (
  select
    p.id as owner_id,
    p.city,
    row_number() over (partition by p.city order by p.created_at) as rn
  from public.profiles p
  where p.id in (select id from auth.users where email like '%@padelking-demo.local')
)
insert into public.clubs (slug, name, city, owner_id)
select * from (values
  ('arena-padel-93', 'Arena Padel 93', 'Bogotá',
   (select owner_id from city_owners where city = 'Bogotá' and rn = 3)),
  ('club-padel-usaquen', 'Club Padel Usaquén', 'Bogotá',
   (select owner_id from city_owners where city = 'Bogotá' and rn = 4)),
  ('vertical-padel-medellin', 'Vertical Padel Medellín', 'Medellín',
   (select owner_id from city_owners where city = 'Medellín' and rn = 2)),
  ('padel-house-cali', 'Padel House Cali', 'Cali',
   (select owner_id from city_owners where city = 'Cali' and rn = 3))
) as t(slug, name, city, owner_id)
where not exists (select 1 from public.clubs cl where cl.slug = t.slug);

-- ============================================================
-- 5. Torneos demo (mix scope/status)
-- ============================================================
-- 'open' = inscripciones abiertas. 'draft' = invisible al público.
-- Las fechas se computan a partir de now() para que se vean siempre frescos.

insert into public.tournaments (
  slug, name, format, status, scope,
  community_id, club_id, city_id,
  starts_at, ends_at, registration_deadline,
  price_per_team, max_teams, description,
  category_kind
)
select * from (values
  ('liga-norte-junio',
   'Liga Norte Junio',
   'liga'::tournament_format,
   'open'::tournament_status,
   'community',
   (select id from public.communities where slug = 'padel-norte-bogota'),
   null::uuid,
   (select id from public.cities where slug = 'bogota'),
   now() + interval '10 days',
   now() + interval '40 days',
   now() + interval '8 days',
   80000, 16,
   'Round-robin a una sola ronda. Cat 3ra-4ta. Premios para top 3 + revancha gratis.',
   'casual'::category_kind),
  ('americano-poblado-sabado',
   'Americano El Poblado · Sábado',
   'americano_random'::tournament_format,
   'open'::tournament_status,
   'community',
   (select id from public.communities where slug = 'padel-poblado'),
   null::uuid,
   (select id from public.cities where slug = 'medellin'),
   now() + interval '3 days',
   now() + interval '3 days 4 hours',
   now() + interval '2 days',
   45000, 12,
   'Social random. Cervezas incluidas. 4 rondas. Mejor turn-out garantizado.',
   'casual'::category_kind),
  ('queens-cup-abierta',
   'Queens Cup Abierta',
   'eliminacion'::tournament_format,
   'open'::tournament_status,
   'community',
   (select id from public.communities where slug = 'queens-bogota'),
   null::uuid,
   (select id from public.cities where slug = 'bogota'),
   now() + interval '15 days',
   now() + interval '17 days',
   now() + interval '12 days',
   120000, 16,
   'Bracket eliminación 16 parejas. Cat queens_a a queens_c. Sponsoreado por The Padel Lab.',
   'casual'::category_kind),
  ('arena-93-open-junio',
   'Arena 93 Open · Junio',
   'liga'::tournament_format,
   'open'::tournament_status,
   'club_open',
   null::uuid,
   (select id from public.clubs where slug = 'arena-padel-93'),
   (select id from public.cities where slug = 'bogota'),
   now() + interval '20 days',
   now() + interval '50 days',
   now() + interval '18 days',
   150000, 24,
   'Open city-wide. Cualquier club o comunidad de Bogotá puede inscribir parejas.',
   'casual'::category_kind),
  ('express-cali-friday',
   'Express Cali Viernes',
   'express'::tournament_format,
   'open'::tournament_status,
   'community',
   (select id from public.communities where slug = 'padel-cali-sur'),
   null::uuid,
   (select id from public.cities where slug = 'cali'),
   now() + interval '6 days',
   now() + interval '6 days 3 hours',
   now() + interval '5 days',
   35000, 8,
   '6 rondas express, 12 puntos por partido. Pizza al final.',
   'casual'::category_kind),
  ('americano-laureles-mier',
   'Americano Laureles Miércoles',
   'americano_fijo'::tournament_format,
   'in_progress'::tournament_status,
   'community',
   (select id from public.communities where slug = 'laureles-padel'),
   null::uuid,
   (select id from public.cities where slug = 'medellin'),
   now() - interval '1 hour',
   now() + interval '3 hours',
   now() - interval '1 day',
   40000, 12,
   'Estamos jugando ahora. Cancha 1 y 2 de Vertical.',
   'casual'::category_kind),
  ('liga-caribe-mayo',
   'Liga del Caribe · Mayo',
   'liga'::tournament_format,
   'finished'::tournament_status,
   'community',
   (select id from public.communities where slug = 'padel-caribe'),
   null::uuid,
   (select id from public.cities where slug = 'barranquilla'),
   now() - interval '20 days',
   now() - interval '5 days',
   now() - interval '25 days',
   70000, 16,
   'Liga terminó: ganadores premiados con paletas Bullpadel. Próxima en julio.',
   'casual'::category_kind),
  ('bga-summer-open-draft',
   'Bucaramanga Summer Open',
   'liga'::tournament_format,
   'draft'::tournament_status,
   'community',
   (select id from public.communities where slug = 'bucaramanga-padel'),
   null::uuid,
   (select id from public.cities where slug = 'bucaramanga'),
   now() + interval '45 days',
   now() + interval '60 days',
   now() + interval '40 days',
   60000, 16,
   'En construcción. Publicaremos cuando tengamos sponsor confirmado.',
   'casual'::category_kind)
) as t(slug, name, format, status, scope,
       community_id, club_id, city_id,
       starts_at, ends_at, registration_deadline,
       price_per_team, max_teams, description,
       category_kind)
where not exists (select 1 from public.tournaments tt where tt.slug = t.slug);

commit;
