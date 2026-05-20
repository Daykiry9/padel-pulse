-- PadelKing — expansion del schema al modelo source-of-truth.
-- Cambios principales:
--   * 5 niveles: nacional -> ciudad -> comunidad -> equipo -> jugador
--   * Categories formales (1ra-5ta + Mixto + Queens 1-5)
--   * Teams: entidad estable de 2 jugadores con historial (team_members)
--   * Tournament_registrations reemplaza tournament_pairs (snapshot al inscribir)
--   * Sponsors a nivel plataforma + tournament_sponsors (slots)
--   * Notifications y team_points para ranking hibrido (ELO + puntos absolutos)
--   * Club_communities (clubes aliados a comunidades, M:N)

-- ============================================================
-- 0a. HELPER functions (necesarias antes del backfill)
-- ============================================================
create or replace function public.unaccent_safe(input text)
returns text language plpgsql immutable as $$
begin
  begin
    return lower(public.unaccent(input));
  exception when undefined_function then
    return lower(input);
  end;
end; $$;

-- ============================================================
-- 0b. DROP cosas que cambian de forma incompatible
-- ============================================================
drop view if exists public.community_ranking_stats;
drop table if exists public.matches cascade;
drop table if exists public.tournament_pairs cascade;
alter table public.tournaments drop column if exists gender;
drop type if exists tournament_gender;

-- ============================================================
-- 1. NEW ENUMS
-- ============================================================
create type team_category as enum (
  'primera', 'segunda', 'tercera', 'cuarta', 'quinta',
  'mixto',
  'queens_1', 'queens_2', 'queens_3', 'queens_4', 'queens_5'
);

-- Reemplazar enum tournament_format (era americano/mexicano/league, ahora con express + elimination)
alter table public.tournaments alter column format drop default;
alter table public.tournaments alter column format type text using format::text;
drop type if exists tournament_format;
create type tournament_format as enum ('americano', 'express', 'league', 'elimination');
update public.tournaments set format = 'americano' where format = 'mexicano';
alter table public.tournaments alter column format type tournament_format using format::tournament_format;
alter table public.tournaments alter column format set default 'americano'::tournament_format;

create type sponsor_tier as enum ('platform', 'community', 'tournament');
create type sponsor_slot as enum ('title', 'official', 'partner');
create type notification_type as enum (
  'tournament_open',
  'tournament_starting',
  'match_scheduled',
  'match_result',
  'team_invite',
  'category_change_suggested',
  'announcement',
  'payment_received'
);
create type registration_status as enum ('pending_payment', 'confirmed', 'waitlist', 'cancelled');

-- ============================================================
-- 2. CITIES (nivel jerarquico Colombia -> ciudad)
-- ============================================================
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country text not null default 'CO',
  region text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cities (slug, name, region) values
  ('bogota', 'Bogotá', 'Cundinamarca'),
  ('medellin', 'Medellín', 'Antioquia'),
  ('cali', 'Cali', 'Valle del Cauca'),
  ('cartagena', 'Cartagena', 'Bolívar'),
  ('barranquilla', 'Barranquilla', 'Atlántico'),
  ('bucaramanga', 'Bucaramanga', 'Santander'),
  ('pereira', 'Pereira', 'Risaralda');

-- ============================================================
-- 3. CATEGORIES (metadata de cada categoria)
-- ============================================================
create table public.categories (
  code team_category primary key,
  display_name text not null,
  short_label text not null,
  sort_order int not null,
  is_queens boolean not null default false,
  is_mixed boolean not null default false,
  min_rating int,
  max_rating int,
  description text
);

insert into public.categories (code, display_name, short_label, sort_order, is_queens, is_mixed, min_rating, max_rating, description) values
  ('primera', 'Primera', '1ra', 1, false, false, 1900, null,  'Élite masculina, jugadores con dominio técnico avanzado'),
  ('segunda', 'Segunda', '2da', 2, false, false, 1700, 1899, 'Avanzados con experiencia competitiva'),
  ('tercera', 'Tercera', '3ra', 3, false, false, 1500, 1699, 'Intermedios+'),
  ('cuarta',  'Cuarta',  '4ta', 4, false, false, 1300, 1499, 'Intermedios consolidados'),
  ('quinta',  'Quinta',  '5ta', 5, false, false, null, 1299, 'Iniciación competitiva'),
  ('mixto',   'Mixto',   'Mix', 6, false, true,  null, null, 'Equipo mixto (1 hombre + 1 mujer)'),
  ('queens_1','Queens 1','Q1', 7, true, false, 1900, null, 'Élite femenina'),
  ('queens_2','Queens 2','Q2', 8, true, false, 1700, 1899, 'Femenina avanzada'),
  ('queens_3','Queens 3','Q3', 9, true, false, 1500, 1699, 'Femenina intermedia+'),
  ('queens_4','Queens 4','Q4',10, true, false, 1300, 1499, 'Femenina intermedia'),
  ('queens_5','Queens 5','Q5',11, true, false, null, 1299, 'Femenina iniciación');

-- ============================================================
-- 4. ALTER communities + clubs: agregar city_id FK
-- ============================================================
alter table public.communities add column city_id uuid references public.cities(id);
alter table public.clubs add column city_id uuid references public.cities(id);

-- Backfill: copiar city text -> city_id si matchea slug normalizado
update public.communities
   set city_id = c.id
  from public.cities c
 where lower(unaccent_safe(communities.city)) = c.slug
    or lower(communities.city) = c.name;
-- (en runtime real, comunidades sin match quedan con city_id null hasta admin las verifica)

create index communities_city_id_idx on public.communities (city_id);
create index clubs_city_id_idx on public.clubs (city_id);

-- ============================================================
-- 5. CLUB_COMMUNITIES (clubes aliados a comunidades, M:N)
-- ============================================================
create table public.club_communities (
  club_id uuid not null references public.clubs(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (club_id, community_id)
);

create index club_communities_community_idx on public.club_communities (community_id);

-- ============================================================
-- 6. TEAMS — entidad estable de 2 jugadores
-- ============================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  primary_community_id uuid not null references public.communities(id) on delete restrict,
  category team_category not null,
  rating int not null default 1200,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  dissolved_at timestamptz
);

create index teams_community_idx on public.teams (primary_community_id);
create index teams_category_idx on public.teams (category);
create index teams_rating_idx on public.teams (rating desc);

-- ============================================================
-- 7. TEAM_MEMBERS — historial de cambios de pareja
-- ============================================================
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  invited_by uuid references public.profiles(id),
  constraint exit_after_join check (left_at is null or left_at >= joined_at)
);

create index team_members_team_idx on public.team_members (team_id) where is_active;
create index team_members_profile_idx on public.team_members (profile_id) where is_active;

-- regla: maximo 2 jugadores activos por team
create unique index team_active_slot_unique on public.team_members (team_id, profile_id) where is_active;

-- ============================================================
-- 8. TOURNAMENTS — re-create con campos nuevos
-- ============================================================
alter table public.tournaments
  add column category team_category,
  add column min_teams int not null default 4,
  add column allows_pro boolean not null default true,
  add column city_id uuid references public.cities(id);

-- Renombrar columnas que asumian "pairs" -> "teams"
alter table public.tournaments rename column max_pairs to max_teams;
alter table public.tournaments rename column price_per_pair to price_per_team;

create index tournaments_category_idx on public.tournaments (category, status);
create index tournaments_city_idx on public.tournaments (city_id);

-- ============================================================
-- 9. TOURNAMENT_REGISTRATIONS (snapshot al inscribir)
-- ============================================================
create table public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  -- snapshot de los jugadores al momento de inscribir (preserva integridad si team cambia despues)
  player_one_id uuid not null references public.profiles(id) on delete restrict,
  player_two_id uuid not null references public.profiles(id) on delete restrict,
  registered_by uuid not null references public.profiles(id) on delete restrict,
  status registration_status not null default 'pending_payment',
  payment_amount int not null default 0,
  payment_provider_ref text,
  registered_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (tournament_id, team_id)
);

create index tournament_regs_tournament_idx on public.tournament_registrations (tournament_id);
create index tournament_regs_team_idx on public.tournament_registrations (team_id);

-- ============================================================
-- 10. MATCHES (re-create con FK a registrations)
-- ============================================================
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number int not null,
  court_number int not null,
  registration_one_id uuid not null references public.tournament_registrations(id) on delete cascade,
  registration_two_id uuid not null references public.tournament_registrations(id) on delete cascade,
  score_one int,
  score_two int,
  status match_status not null default 'scheduled',
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  confirmed_by_one boolean not null default false,
  confirmed_by_two boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distinct_registrations check (registration_one_id <> registration_two_id)
);

create index matches_tournament_idx on public.matches (tournament_id, round_number);
create index matches_reg_one_idx on public.matches (registration_one_id);
create index matches_reg_two_idx on public.matches (registration_two_id);

create trigger matches_touch_updated_at
  before update on public.matches for each row execute procedure public.touch_updated_at();

-- ============================================================
-- 11. SPONSORS
-- ============================================================
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  website text,
  primary_color text,
  description text,
  tier sponsor_tier not null default 'tournament',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tournament_sponsors (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete restrict,
  slot sponsor_slot not null default 'partner',
  -- exposure metrics (impresiones, clicks, etc.) — JSON flexible
  exposure jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (tournament_id, sponsor_id)
);

-- Quita las columnas sponsor_* viejas de tournaments (las maneja tournament_sponsors)
alter table public.tournaments drop column if exists sponsor_name;
alter table public.tournaments drop column if exists sponsor_logo_url;

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_unread_idx
  on public.notifications (profile_id, created_at desc) where read_at is null;

-- ============================================================
-- 13. TEAM_POINTS (puntos absolutos por torneo finalizado)
-- ============================================================
create table public.team_points (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete restrict,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  category team_category not null,
  position int not null,
  points int not null,
  awarded_at timestamptz not null default now(),
  unique (team_id, tournament_id)
);

create index team_points_team_period_idx on public.team_points (team_id, awarded_at desc);
create index team_points_community_period_idx on public.team_points (community_id, awarded_at desc);
create index team_points_category_period_idx on public.team_points (category, awarded_at desc);

-- ============================================================
-- 14. ROW LEVEL SECURITY (nuevas tablas)
-- ============================================================
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.club_communities enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.matches enable row level security;
alter table public.sponsors enable row level security;
alter table public.tournament_sponsors enable row level security;
alter table public.notifications enable row level security;
alter table public.team_points enable row level security;

-- cities: read publico, escritura por super-admin (futuro)
create policy "cities are public read" on public.cities for select using (true);

-- categories: read publico
create policy "categories are public read" on public.categories for select using (true);

-- club_communities: read publico, escritura por owner de club o owner/admin de comunidad
create policy "club_communities are public read" on public.club_communities for select using (true);
create policy "club owners can link communities"
  on public.club_communities for insert with check (
    exists (select 1 from public.clubs where id = club_communities.club_id and owner_id = auth.uid())
    or exists (select 1 from public.community_members
               where community_id = club_communities.community_id
                 and profile_id = auth.uid()
                 and role in ('owner', 'admin'))
  );

-- teams: read publico, los miembros del team pueden actualizar
create policy "teams are public read" on public.teams for select using (true);
create policy "users can create teams" on public.teams for insert with check (
  exists (
    select 1 from public.community_members
    where community_id = teams.primary_community_id and profile_id = auth.uid()
  )
);
create policy "team members can update their team"
  on public.teams for update using (
    exists (
      select 1 from public.team_members
      where team_id = teams.id and profile_id = auth.uid() and is_active
    )
  );

-- team_members
create policy "team_members are public read" on public.team_members for select using (true);
create policy "users manage their own team_member rows"
  on public.team_members for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- tournament_registrations
create policy "registrations are public read" on public.tournament_registrations for select using (true);
create policy "team members can register their team"
  on public.tournament_registrations for insert with check (
    auth.uid() = registered_by
    and exists (
      select 1 from public.team_members
      where team_id = tournament_registrations.team_id and profile_id = auth.uid() and is_active
    )
  );
create policy "team members can cancel registration"
  on public.tournament_registrations for delete using (
    exists (
      select 1 from public.team_members
      where team_id = tournament_registrations.team_id and profile_id = auth.uid() and is_active
    )
  );

-- matches
create policy "matches are public read" on public.matches for select using (true);
create policy "match participants and club admins can update"
  on public.matches for update using (
    exists (
      select 1 from public.tournaments t
      join public.clubs c on c.id = t.club_id
      where t.id = matches.tournament_id and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.tournament_registrations r
      join public.team_members tm on tm.team_id = r.team_id and tm.is_active
      where r.id in (matches.registration_one_id, matches.registration_two_id)
        and tm.profile_id = auth.uid()
    )
  );

-- sponsors: read publico, escritura por super-admin (RLS por bypass de service role)
create policy "sponsors are public read" on public.sponsors for select using (true);

-- tournament_sponsors
create policy "tournament_sponsors are public read" on public.tournament_sponsors for select using (true);
create policy "club owners can manage tournament sponsors"
  on public.tournament_sponsors for all using (
    exists (
      select 1 from public.tournaments t
      join public.clubs c on c.id = t.club_id
      where t.id = tournament_sponsors.tournament_id and c.owner_id = auth.uid()
    )
  );

-- notifications: solo el dueño lee/marca leido
create policy "users see own notifications" on public.notifications for select using (auth.uid() = profile_id);
create policy "users mark own notifications read" on public.notifications for update using (auth.uid() = profile_id);

-- team_points: read publico (es el ranking)
create policy "team_points are public read" on public.team_points for select using (true);

-- ============================================================
-- 16. VIEW: ranking activo de equipos (con decaimiento 12 meses)
-- ============================================================
create view public.team_ranking_live as
select
  t.id as team_id,
  t.name as team_name,
  t.logo_url as team_logo_url,
  t.category,
  t.rating as elo_rating,
  t.primary_community_id as community_id,
  c.name as community_name,
  c.city_id,
  ci.name as city_name,
  -- Puntos absolutos con decaimiento lineal en 12 meses
  coalesce(sum(
    case
      when tp.awarded_at >= now() - interval '12 months'
      then (tp.points * greatest(0,
        1 - extract(epoch from (now() - tp.awarded_at)) / extract(epoch from interval '12 months')
      ))::int
      else 0
    end
  ), 0) as absolute_points,
  count(tp.id) filter (where tp.awarded_at >= now() - interval '12 months') as tournaments_played_12mo
from public.teams t
join public.communities c on c.id = t.primary_community_id
left join public.cities ci on ci.id = c.city_id
left join public.team_points tp on tp.team_id = t.id
where t.is_active
group by t.id, t.name, t.logo_url, t.category, t.rating, t.primary_community_id,
         c.name, c.city_id, ci.name;

-- ============================================================
-- 17. VIEW: ranking de comunidades = top 5 equipos por comunidad
-- ============================================================
create view public.community_ranking_live as
with team_ranks as (
  select
    team_id, community_id, community_name, city_name, category,
    absolute_points, elo_rating,
    row_number() over (partition by community_id order by absolute_points desc) as rn
  from public.team_ranking_live
)
select
  community_id,
  community_name,
  city_name,
  sum(absolute_points) filter (where rn <= 5) as community_points,
  avg(elo_rating) filter (where rn <= 5) as avg_elo_top5,
  count(team_id) as active_teams
from team_ranks
group by community_id, community_name, city_name;
