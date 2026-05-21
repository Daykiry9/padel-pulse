-- PadelKing v3 — sistema de Sumas + categorias expandidas + validacion +
-- auto-progresion + player_points + vistas multi-dimension.
--
-- Cambios principales:
--   * Categorias estandar expandidas: Libre/Pro -> 1ra-7ma (masculino) y
--     Libre/A-E (Queens). Cada una con numeric_value (1-8 / 1-6).
--   * Tournament.category_kind enum: estandar | suma | mixto_estandar |
--     mixto_suma | queens_estandar | queens_suma | casual.
--   * Tope individual opcional en torneos Suma (max_player_category_value).
--   * Validacion de elegibilidad como funcion SQL + trigger BEFORE INSERT
--     en tournament_registrations.
--   * Auto-progresion: trigger AFTER INSERT en team_points/player_points
--     inserta sugerencias en category_change_suggestions cuando umbrales.
--   * Nueva tabla player_points para ranking personal Tier 2.
--   * Vistas: team_ranking_official, team_ranking_by_sum,
--     player_ranking_casual.

-- ============================================================
-- 0a. ENUMS nuevos
-- ============================================================
create type category_kind as enum (
  'estandar',         -- 1ra, 2da, etc. (masculino)
  'suma',             -- Suma 5, Suma 8, etc. (masculino)
  'mixto_estandar',   -- categoria mixta fija (raro, casi nunca usado)
  'mixto_suma',       -- Suma 8 Mixto (lo comun en Colombia)
  'queens_estandar',  -- A, B, C, etc.
  'queens_suma',      -- Suma Queens
  'casual'            -- Tier 2 individual sin categoria estricta
);

create type tournament_tier as enum ('competitivo', 'casual');
create type competition_unit as enum ('team', 'player');
create type pairing_mode as enum ('fixed', 'random', 'mixed');
create type category_change_status as enum ('suggested', 'approved', 'rejected', 'auto_applied');
create type gender_kind as enum ('male', 'female', 'nonbinary', 'prefer_not_to_say');

-- ============================================================
-- 0b. DROP vistas dependientes (las recreamos al final)
-- ============================================================
drop view if exists public.community_ranking_live cascade;
drop view if exists public.team_ranking_live cascade;

-- ============================================================
-- 1. ALTER columns que usan team_category a text temporalmente
-- ============================================================
alter table public.teams alter column category type text;
alter table public.tournaments alter column category type text;
alter table public.team_points alter column category type text;
alter table public.categories alter column code drop default;
-- categories.code es PK; quitar pero re-seed completo al final
delete from public.categories;
alter table public.categories alter column code type text;

-- ============================================================
-- 2. DROP enum viejo y crear nuevo expandido
-- ============================================================
drop type public.team_category;

create type team_category as enum (
  -- Masculino estandar (8 niveles)
  'libre', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'septima',
  -- Queens estandar (6 niveles)
  'queens_libre', 'queens_a', 'queens_b', 'queens_c', 'queens_d', 'queens_e'
);

-- ============================================================
-- 3. Migrar valores text -> nuevos enum (mapeo de v2 a v3)
-- ============================================================
-- En v2 existian: primera, segunda, tercera, cuarta, quinta, mixto, queens_1..5
-- Mapeo:
--   primera..quinta  -> mismo
--   mixto            -> NULL (mixto ahora es category_kind, no valor)
--   queens_1         -> queens_a
--   queens_2         -> queens_b
--   queens_3         -> queens_c
--   queens_4         -> queens_d
--   queens_5         -> queens_e

update public.teams set category = 'queens_a' where category = 'queens_1';
update public.teams set category = 'queens_b' where category = 'queens_2';
update public.teams set category = 'queens_c' where category = 'queens_3';
update public.teams set category = 'queens_d' where category = 'queens_4';
update public.teams set category = 'queens_e' where category = 'queens_5';
update public.teams set category = null where category = 'mixto';

update public.tournaments set category = 'queens_a' where category = 'queens_1';
update public.tournaments set category = 'queens_b' where category = 'queens_2';
update public.tournaments set category = 'queens_c' where category = 'queens_3';
update public.tournaments set category = 'queens_d' where category = 'queens_4';
update public.tournaments set category = 'queens_e' where category = 'queens_5';
update public.tournaments set category = null where category = 'mixto';

update public.team_points set category = 'queens_a' where category = 'queens_1';
update public.team_points set category = 'queens_b' where category = 'queens_2';
update public.team_points set category = 'queens_c' where category = 'queens_3';
update public.team_points set category = 'queens_d' where category = 'queens_4';
update public.team_points set category = 'queens_e' where category = 'queens_5';

-- ============================================================
-- 4. Restaurar tipo enum en columnas (teams.category ahora nullable porque mixto)
-- ============================================================
alter table public.teams
  alter column category type team_category using category::team_category,
  alter column category drop not null;

alter table public.tournaments
  alter column category type team_category using category::team_category;

alter table public.team_points
  alter column category type team_category using category::team_category;

alter table public.categories
  alter column code type team_category using code::team_category;

-- ============================================================
-- 5. Re-seed categories con numeric_value para Sumas
-- ============================================================
alter table public.categories
  add column if not exists numeric_value smallint not null default 0,
  add column if not exists is_queens boolean not null default false;

insert into public.categories (code, display_name, short_label, sort_order, numeric_value, is_queens, is_mixed, min_rating, max_rating, description) values
  ('libre',    'Libre/Pro', 'Libre', 1, 1, false, false, 2000, null,  'Profesional o ex-profesional'),
  ('primera',  'Primera',   '1ra',   2, 2, false, false, 1850, 1999, 'Elite amateur'),
  ('segunda',  'Segunda',   '2da',   3, 3, false, false, 1700, 1849, 'Avanzado con experiencia competitiva'),
  ('tercera',  'Tercera',   '3ra',   4, 4, false, false, 1550, 1699, 'Intermedio plus'),
  ('cuarta',   'Cuarta',    '4ta',   5, 5, false, false, 1400, 1549, 'Intermedio consolidado'),
  ('quinta',   'Quinta',    '5ta',   6, 6, false, false, 1250, 1399, 'Intermedio bajo'),
  ('sexta',    'Sexta',     '6ta',   7, 7, false, false, 1100, 1249, 'Iniciacion competitiva'),
  ('septima',  'Septima',   '7ma',   8, 8, false, false, null, 1099, 'Iniciacion total'),
  ('queens_libre','Libre Queens',  'Libre Q', 9,  1, true, false, 2000, null,  'Pro femenina'),
  ('queens_a', 'Queens A',  'QA',   10, 2, true, false, 1850, 1999, 'Elite femenina'),
  ('queens_b', 'Queens B',  'QB',   11, 3, true, false, 1700, 1849, 'Avanzada femenina'),
  ('queens_c', 'Queens C',  'QC',   12, 4, true, false, 1550, 1699, 'Intermedia plus femenina'),
  ('queens_d', 'Queens D',  'QD',   13, 5, true, false, 1400, 1549, 'Intermedia femenina'),
  ('queens_e', 'Queens E',  'QE',   14, 6, true, false, null,  1399, 'Iniciacion femenina');

-- ============================================================
-- 6. Helper function: category_value (centraliza el mapping)
-- ============================================================
create or replace function public.category_value(cat team_category)
returns smallint language sql immutable as $$
  select case cat
    when 'libre'        then 1::smallint
    when 'primera'      then 2::smallint
    when 'segunda'      then 3::smallint
    when 'tercera'      then 4::smallint
    when 'cuarta'       then 5::smallint
    when 'quinta'       then 6::smallint
    when 'sexta'        then 7::smallint
    when 'septima'      then 8::smallint
    when 'queens_libre' then 1::smallint
    when 'queens_a'     then 2::smallint
    when 'queens_b'     then 3::smallint
    when 'queens_c'     then 4::smallint
    when 'queens_d'     then 5::smallint
    when 'queens_e'     then 6::smallint
  end
$$;

create or replace function public.is_queens_category(cat team_category)
returns boolean language sql immutable as $$
  select cat in ('queens_libre','queens_a','queens_b','queens_c','queens_d','queens_e')
$$;

-- ============================================================
-- 7. Extender tournaments con sistema de Sumas y tope individual
-- ============================================================
alter table public.tournaments
  add column tier tournament_tier not null default 'competitivo',
  add column category_kind category_kind not null default 'estandar',
  add column competition_unit competition_unit not null default 'team',
  add column pairing_mode pairing_mode,
  add column min_sum smallint,
  add column max_player_category_value smallint,
  add column weight numeric(3,2) not null default 1.00;

-- Constraint coherencia: category_kind suma requiere min_sum
alter table public.tournaments add constraint suma_requires_min_sum
  check (
    (category_kind not in ('suma','mixto_suma','queens_suma') and min_sum is null)
    or
    (category_kind in ('suma','mixto_suma','queens_suma') and min_sum is not null and min_sum > 1)
  );

-- Constraint: category_estandar requiere column category set
alter table public.tournaments add constraint estandar_requires_category
  check (
    (category_kind in ('estandar','mixto_estandar','queens_estandar') and category is not null)
    or
    (category_kind in ('suma','mixto_suma','queens_suma','casual'))
  );

-- Constraint: weight refleja tier (1.0x competitivo, 0.4x casual)
alter table public.tournaments add constraint weight_matches_tier
  check (
    (tier = 'competitivo' and weight = 1.00) or
    (tier = 'casual' and weight = 0.40)
  );

-- Renombrar tournament_format viejos a los nuevos
alter table public.tournaments alter column format drop default;
alter table public.tournaments alter column format type text using format::text;
drop type public.tournament_format;
create type tournament_format as enum (
  'americano_fijo', 'americano_random', 'liguilla_casual',
  'liga', 'express', 'eliminacion'
);
update public.tournaments set format = 'americano_fijo' where format = 'americano';
update public.tournaments set format = 'eliminacion' where format = 'elimination';
alter table public.tournaments
  alter column format type tournament_format using format::tournament_format,
  alter column format set default 'americano_fijo'::tournament_format;

-- ============================================================
-- 8. Profiles: agregar skill_category y gender
-- ============================================================
alter table public.profiles
  add column skill_category team_category,
  add column gender gender_kind;

-- ============================================================
-- 9. player_points (ranking personal Tier 2)
-- ============================================================
create table public.player_points (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete restrict,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  category team_category,
  position int not null,
  points int not null,
  weight_applied numeric(3,2) not null,
  awarded_at timestamptz not null default now(),
  unique (profile_id, tournament_id)
);

create index player_points_profile_period_idx
  on public.player_points (profile_id, awarded_at desc);
create index player_points_community_period_idx
  on public.player_points (community_id, awarded_at desc);
create index player_points_category_period_idx
  on public.player_points (category, awarded_at desc);

-- ============================================================
-- 10. category_change_suggestions (auto-progresion)
-- ============================================================
create table public.category_change_suggestions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  current_category team_category,
  suggested_category team_category not null,
  reason text not null,
  evidence_points int,
  evidence_wins_vs_higher int,
  status category_change_status not null default 'suggested',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index category_change_open_idx
  on public.category_change_suggestions (profile_id, status, created_at desc)
  where status = 'suggested';

-- ============================================================
-- 11. tournament_registrations: soportar inscripcion individual
-- ============================================================
alter table public.tournament_registrations
  alter column team_id drop not null,
  alter column player_one_id drop not null,
  alter column player_two_id drop not null,
  add column player_id uuid references public.profiles(id) on delete restrict;

alter table public.tournament_registrations add constraint unit_consistency
  check (
    (team_id is not null and player_id is null) or
    (team_id is null and player_id is not null)
  );

create index tournament_regs_player_idx on public.tournament_registrations (player_id);

-- ============================================================
-- 12. validate_team_registration — funcion + trigger
-- ============================================================
create or replace function public.validate_registration_eligibility()
returns trigger language plpgsql as $$
declare
  v_tournament public.tournaments%rowtype;
  v_team public.teams%rowtype;
  v_p1 public.profiles%rowtype;
  v_p2 public.profiles%rowtype;
  v_p_one public.profiles%rowtype;
  v_pair_sum smallint;
  v_max_val smallint;
begin
  select * into v_tournament from public.tournaments where id = new.tournament_id;
  if v_tournament.status not in ('open','draft') then
    raise exception 'Torneo no acepta inscripciones (status: %)', v_tournament.status;
  end if;

  -- Modalidad team (Tier 1 y Liguilla Casual)
  if new.team_id is not null then
    select * into v_team from public.teams where id = new.team_id;
    select * into v_p1 from public.profiles where id = new.player_one_id;
    select * into v_p2 from public.profiles where id = new.player_two_id;

    if v_p1.skill_category is null or v_p2.skill_category is null then
      raise exception 'Uno o ambos jugadores no tienen categoria asignada';
    end if;

    v_pair_sum := public.category_value(v_p1.skill_category) + public.category_value(v_p2.skill_category);
    v_max_val := greatest(public.category_value(v_p1.skill_category), public.category_value(v_p2.skill_category));

    if v_tournament.category_kind in ('estandar','queens_estandar') then
      -- 1 banda hacia abajo permitida
      if v_max_val < public.category_value(v_tournament.category) then
        raise exception 'Pareja muy fuerte: tu categoria mas alta es %, este torneo es % (valor %)',
          v_max_val, v_tournament.category, public.category_value(v_tournament.category);
      end if;
      if v_max_val > public.category_value(v_tournament.category) + 1 then
        raise exception 'Pareja muy debil: solo puedes bajar 1 banda (max permitido: valor %)',
          public.category_value(v_tournament.category) + 1;
      end if;

      -- Validacion de queens
      if v_tournament.category_kind = 'queens_estandar' then
        if not (public.is_queens_category(v_p1.skill_category) and public.is_queens_category(v_p2.skill_category)) then
          raise exception 'Queens requiere que ambos jugadores tengan categoria Queens';
        end if;
      end if;
    elsif v_tournament.category_kind in ('suma','queens_suma','mixto_suma') then
      if v_pair_sum < v_tournament.min_sum then
        raise exception 'Suma de pareja % es menor al minimo % requerido', v_pair_sum, v_tournament.min_sum;
      end if;

      if v_tournament.max_player_category_value is not null then
        if public.category_value(v_p1.skill_category) < v_tournament.max_player_category_value
           or public.category_value(v_p2.skill_category) < v_tournament.max_player_category_value then
          raise exception 'Un jugador supera el tope individual (max valor permitido: %)',
            v_tournament.max_player_category_value;
        end if;
      end if;

      if v_tournament.category_kind = 'mixto_suma' then
        if v_p1.gender is null or v_p2.gender is null then
          raise exception 'Mixto requiere genero asignado en ambos perfiles';
        end if;
        if not (
          (v_p1.gender = 'male' and v_p2.gender = 'female') or
          (v_p1.gender = 'female' and v_p2.gender = 'male')
        ) then
          raise exception 'Mixto requiere 1 hombre y 1 mujer';
        end if;
      end if;

      if v_tournament.category_kind = 'queens_suma' then
        if not (public.is_queens_category(v_p1.skill_category) and public.is_queens_category(v_p2.skill_category)) then
          raise exception 'Queens Suma requiere ambos jugadores en categoria Queens';
        end if;
      end if;
    end if;
  -- Modalidad player individual (Tier 2 Americano Random)
  elsif new.player_id is not null then
    select * into v_p_one from public.profiles where id = new.player_id;
    if v_p_one.skill_category is null then
      raise exception 'Jugador no tiene categoria asignada';
    end if;

    if v_tournament.category_kind in ('estandar','queens_estandar') then
      v_max_val := public.category_value(v_p_one.skill_category);
      if v_max_val < public.category_value(v_tournament.category) then
        raise exception 'Jugador muy fuerte: tu categoria es %, este torneo es %', v_p_one.skill_category, v_tournament.category;
      end if;
      if v_max_val > public.category_value(v_tournament.category) + 1 then
        raise exception 'Jugador muy debil: solo puedes bajar 1 banda';
      end if;
    end if;
    -- En casual, sin filtro de categoria
  end if;

  return new;
end;
$$;

create trigger validate_registration_before_insert
  before insert on public.tournament_registrations
  for each row execute procedure public.validate_registration_eligibility();

-- ============================================================
-- 13. Auto-progresion: trigger AFTER insert en player_points
--
-- Logica MVP (stub conservador, calibrar con datos reales):
--   Si profile suma >= 2500 pts en su categoria en ultimos 6 meses
--   Y tiene >= 3 wins en matches contra equipos de categoria superior
--   -> INSERT en category_change_suggestions
--
-- Nota: la pieza "wins vs superior" requiere queries pesadas. Por ahora
-- solo basamos en puntos; refinar al lanzar Fase 2.
-- ============================================================
create or replace function public.suggest_category_change()
returns trigger language plpgsql as $$
declare
  v_profile public.profiles%rowtype;
  v_sum_points int;
  v_current_val smallint;
  v_next_cat team_category;
begin
  select * into v_profile from public.profiles where id = new.profile_id;
  if v_profile.skill_category is null then return new; end if;

  v_current_val := public.category_value(v_profile.skill_category);
  if v_current_val <= 1 then return new; end if; -- ya esta en Libre/Pro

  -- Solo sugerimos ascenso si la categoria actual matchea con la del torneo
  -- (no sugerimos ascenso por jugar 1 banda abajo)
  if new.category is null or new.category <> v_profile.skill_category then
    return new;
  end if;

  select coalesce(sum(points), 0) into v_sum_points
  from public.player_points
  where profile_id = new.profile_id
    and category = v_profile.skill_category
    and awarded_at >= now() - interval '6 months';

  if v_sum_points < 2500 then return new; end if;

  -- Calcular categoria sugerida (1 nivel arriba)
  v_next_cat := case v_profile.skill_category
    when 'segunda' then 'primera'::team_category
    when 'tercera' then 'segunda'::team_category
    when 'cuarta'  then 'tercera'::team_category
    when 'quinta'  then 'cuarta'::team_category
    when 'sexta'   then 'quinta'::team_category
    when 'septima' then 'sexta'::team_category
    when 'queens_a' then 'queens_libre'::team_category
    when 'queens_b' then 'queens_a'::team_category
    when 'queens_c' then 'queens_b'::team_category
    when 'queens_d' then 'queens_c'::team_category
    when 'queens_e' then 'queens_d'::team_category
    else null
  end;

  if v_next_cat is null then return new; end if;

  -- No duplicar si ya hay sugerencia abierta
  if exists (
    select 1 from public.category_change_suggestions
    where profile_id = new.profile_id and status = 'suggested'
  ) then return new; end if;

  insert into public.category_change_suggestions (
    profile_id, current_category, suggested_category, reason, evidence_points
  ) values (
    new.profile_id, v_profile.skill_category, v_next_cat,
    format('Acumulo %s pts en %s en los ultimos 6 meses (umbral: 2500)', v_sum_points, v_profile.skill_category),
    v_sum_points
  );

  return new;
end;
$$;

create trigger suggest_category_after_player_points
  after insert on public.player_points
  for each row execute procedure public.suggest_category_change();

-- ============================================================
-- 14. team_points: agregar tier_weight para filtrar / ponderar
-- ============================================================
alter table public.team_points
  add column weight_applied numeric(3,2) not null default 1.00;

-- ============================================================
-- 15. VIEWS: rankings multi-dimension
-- ============================================================

-- A. team_ranking_official: solo Tier 1 (competitivo), por categoria estandar
create view public.team_ranking_official as
select
  t.id as team_id,
  t.name as team_name,
  t.logo_url as team_logo_url,
  t.category,
  t.rating as elo_rating,
  t.primary_community_id as community_id,
  c.name as community_name,
  ci.name as city_name,
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
left join public.team_points tp on tp.team_id = t.id and tp.weight_applied = 1.00
where t.is_active
group by t.id, t.name, t.logo_url, t.category, t.rating, t.primary_community_id,
         c.name, ci.name;

-- B. team_ranking_by_sum: agrupa por valor de suma de la pareja (no por categoria estandar)
create view public.team_ranking_by_sum as
select
  t.id as team_id,
  t.name as team_name,
  t.primary_community_id as community_id,
  c.name as community_name,
  coalesce(public.category_value(p1.skill_category), 0)
    + coalesce(public.category_value(p2.skill_category), 0) as team_sum,
  t.rating as elo_rating,
  coalesce(sum(
    case
      when tp.awarded_at >= now() - interval '12 months'
      then (tp.points * greatest(0,
        1 - extract(epoch from (now() - tp.awarded_at)) / extract(epoch from interval '12 months')
      ))::int
      else 0
    end
  ), 0) as absolute_points
from public.teams t
join public.communities c on c.id = t.primary_community_id
join public.team_members tm1 on tm1.team_id = t.id and tm1.is_active
join public.team_members tm2 on tm2.team_id = t.id and tm2.is_active and tm2.profile_id > tm1.profile_id
join public.profiles p1 on p1.id = tm1.profile_id
join public.profiles p2 on p2.id = tm2.profile_id
left join public.team_points tp on tp.team_id = t.id
where t.is_active
group by t.id, t.name, t.primary_community_id, c.name, p1.skill_category, p2.skill_category, t.rating;

-- C. player_ranking_casual: ranking personal Tier 2 por categoria individual
create view public.player_ranking_casual as
select
  p.id as profile_id,
  p.display_name,
  p.avatar_url,
  p.skill_category as category,
  p.gender,
  coalesce(sum(
    case
      when pp.awarded_at >= now() - interval '12 months'
      then (pp.points * pp.weight_applied * greatest(0,
        1 - extract(epoch from (now() - pp.awarded_at)) / extract(epoch from interval '12 months')
      ))::int
      else 0
    end
  ), 0) as casual_points,
  count(pp.id) filter (where pp.awarded_at >= now() - interval '12 months') as tournaments_played_12mo
from public.profiles p
left join public.player_points pp on pp.profile_id = p.id
group by p.id, p.display_name, p.avatar_url, p.skill_category, p.gender;

-- D. community_ranking_live: suma top-5 equipos por absolute_points oficial
create view public.community_ranking_live as
with team_ranks as (
  select
    team_id, community_id, community_name, city_name, category,
    absolute_points, elo_rating,
    row_number() over (partition by community_id order by absolute_points desc) as rn
  from public.team_ranking_official
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

-- ============================================================
-- 16. RLS para nuevas tablas
-- ============================================================
alter table public.player_points enable row level security;
alter table public.category_change_suggestions enable row level security;

create policy "player_points are public read"
  on public.player_points for select using (true);

create policy "users see their own suggestions"
  on public.category_change_suggestions for select using (auth.uid() = profile_id);

create policy "community admins see suggestions in their community"
  on public.category_change_suggestions for select using (
    exists (
      select 1
      from public.teams t
      join public.team_members tm on tm.team_id = t.id and tm.is_active
      join public.community_members cm on cm.community_id = t.primary_community_id
        and cm.role in ('owner','admin')
      where tm.profile_id = category_change_suggestions.profile_id
        and cm.profile_id = auth.uid()
    )
  );

create policy "community admins can review suggestions"
  on public.category_change_suggestions for update using (
    exists (
      select 1
      from public.teams t
      join public.team_members tm on tm.team_id = t.id and tm.is_active
      join public.community_members cm on cm.community_id = t.primary_community_id
        and cm.role in ('owner','admin')
      where tm.profile_id = category_change_suggestions.profile_id
        and cm.profile_id = auth.uid()
    )
  );

-- Comentario final
comment on function public.category_value is 'Mapea team_category enum a su numeric_value para Sumas';
comment on function public.validate_registration_eligibility is 'Trigger BEFORE INSERT en tournament_registrations; valida categoria, suma, tope, mixto, queens';
comment on function public.suggest_category_change is 'Trigger AFTER INSERT en player_points; sugiere ascenso si umbrales';
comment on view public.team_ranking_official is 'Tier 1 ranking de equipos por categoria estandar (1ra-7ma + Queens libre-E)';
comment on view public.team_ranking_by_sum is 'Ranking de equipos agrupados por team_sum (para torneos Suma X)';
comment on view public.player_ranking_casual is 'Tier 2 ranking personal por categoria individual + decaimiento + peso';
