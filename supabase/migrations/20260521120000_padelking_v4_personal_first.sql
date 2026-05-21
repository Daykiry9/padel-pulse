-- PadelKing v4 — Pivote a Personal-first.
--
-- Realidad colombiana: las parejas estables son la excepcion, no la norma.
-- Antes: inscripcion a Tier 1 obligaba a tener un team registrado.
-- Ahora: 3 modalidades de inscripcion:
--   A) Con team registrado (parejas estables que SI duran)
--   B) Con partner ad-hoc (yo + alguien por este torneo solamente)
--   C) Individual (Tier 2 random / casuales)
--
-- Los puntos siempre van al perfil personal (player_points). team_points
-- se llena adicionalmente solo cuando la inscripcion fue con team formal.

-- ============================================================
-- 1. Constraint de modalidad
-- ============================================================
alter table public.tournament_registrations drop constraint if exists unit_consistency;

alter table public.tournament_registrations add constraint registration_modality check (
  -- A) Equipo registrado
  (team_id is not null
   and player_one_id is not null and player_two_id is not null
   and player_id is null)
  or
  -- B) Pareja ad-hoc (sin team, 2 jugadores)
  (team_id is null
   and player_one_id is not null and player_two_id is not null
   and player_id is null)
  or
  -- C) Individual (Tier 2)
  (team_id is null
   and player_one_id is null and player_two_id is null
   and player_id is not null)
);

-- ============================================================
-- 2. Trigger eligibility — soportar modalidad B (ad-hoc)
-- La logica antigua ya leia player_one_id/player_two_id, asi que igual
-- funciona. Solo necesitamos actualizar la primera rama para que NO
-- requiera team_id.
-- ============================================================
create or replace function public.validate_registration_eligibility()
returns trigger language plpgsql as $$
declare
  v_tournament public.tournaments%rowtype;
  v_p1 public.profiles%rowtype;
  v_p2 public.profiles%rowtype;
  v_p_one public.profiles%rowtype;
  v_pair_sum smallint;
  v_max_val smallint;
  v_min_val smallint;
begin
  select * into v_tournament from public.tournaments where id = new.tournament_id;
  if v_tournament.status not in ('open','draft') then
    raise exception 'Torneo no acepta inscripciones (status: %)', v_tournament.status;
  end if;

  -- Modalidad por equipo o ad-hoc (con 2 player snapshots)
  if new.player_one_id is not null and new.player_two_id is not null then
    if new.player_one_id = new.player_two_id then
      raise exception 'Los dos jugadores deben ser distintos';
    end if;

    select * into v_p1 from public.profiles where id = new.player_one_id;
    select * into v_p2 from public.profiles where id = new.player_two_id;

    if v_p1.skill_category is null or v_p2.skill_category is null then
      raise exception 'Ambos jugadores deben tener categoria asignada';
    end if;

    v_pair_sum := public.category_value(v_p1.skill_category) + public.category_value(v_p2.skill_category);
    v_min_val  := least(public.category_value(v_p1.skill_category), public.category_value(v_p2.skill_category));
    v_max_val  := greatest(public.category_value(v_p1.skill_category), public.category_value(v_p2.skill_category));

    if v_tournament.category_kind in ('estandar','queens_estandar') then
      -- En padel: MENOR valor = MAS FUERTE. Permitimos 1 banda hacia abajo.
      -- min_val = fuerza del jugador mas fuerte del equipo
      -- targetV = categoria del torneo
      if v_min_val > public.category_value(v_tournament.category) then
        raise exception 'Pareja muy debil: el equipo no alcanza la categoria del torneo. No se permite subir bandas.';
      end if;
      if v_min_val < public.category_value(v_tournament.category) - 1 then
        raise exception 'Pareja muy fuerte: solo puedes bajar 1 banda';
      end if;

      if v_tournament.category_kind = 'queens_estandar' then
        if not (public.is_queens_category(v_p1.skill_category) and public.is_queens_category(v_p2.skill_category)) then
          raise exception 'Queens requiere ambas jugadoras en categoria Queens';
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
          raise exception 'Queens Suma requiere ambas jugadoras en categoria Queens';
        end if;
      end if;
    end if;

  -- Modalidad individual (Tier 2)
  elsif new.player_id is not null then
    select * into v_p_one from public.profiles where id = new.player_id;
    if v_p_one.skill_category is null then
      raise exception 'Jugador no tiene categoria asignada';
    end if;

    if v_tournament.category_kind in ('estandar','queens_estandar') then
      v_min_val := public.category_value(v_p_one.skill_category);
      if v_min_val > public.category_value(v_tournament.category) then
        raise exception 'Jugador muy debil: tu categoria es menor a la del torneo';
      end if;
      if v_min_val < public.category_value(v_tournament.category) - 1 then
        raise exception 'Jugador muy fuerte: solo puedes bajar 1 banda';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 3. VIEW player_ranking_official: ranking personal Tier 1 only
--    (con decaimiento 12 meses)
-- ============================================================
drop view if exists public.player_ranking_official;

create view public.player_ranking_official as
select
  p.id as profile_id,
  p.display_name,
  p.avatar_url,
  p.skill_category,
  p.gender,
  p.city,
  coalesce(sum(
    case
      when pp.awarded_at >= now() - interval '12 months' and pp.weight_applied >= 1.0
      then (pp.points * greatest(0,
        1 - extract(epoch from (now() - pp.awarded_at)) / extract(epoch from interval '12 months')
      ))::int
      else 0
    end
  ), 0) as official_points,
  count(pp.id) filter (
    where pp.awarded_at >= now() - interval '12 months' and pp.weight_applied >= 1.0
  ) as tier1_tournaments
from public.profiles p
left join public.player_points pp on pp.profile_id = p.id
group by p.id, p.display_name, p.avatar_url, p.skill_category, p.gender, p.city;

-- ============================================================
-- 4. VIEW player_ranking_consolidated: Tier 1 + Tier 2 ponderado
-- ============================================================
drop view if exists public.player_ranking_consolidated;

create view public.player_ranking_consolidated as
select
  p.id as profile_id,
  p.display_name,
  p.avatar_url,
  p.skill_category,
  p.gender,
  p.city,
  coalesce(sum(
    case
      when pp.awarded_at >= now() - interval '12 months'
      then (pp.points * pp.weight_applied * greatest(0,
        1 - extract(epoch from (now() - pp.awarded_at)) / extract(epoch from interval '12 months')
      ))::int
      else 0
    end
  ), 0) as total_points,
  count(pp.id) filter (where pp.awarded_at >= now() - interval '12 months') as tournaments_played,
  -- Desglose por tier
  coalesce(sum(case when pp.weight_applied >= 1.0 and pp.awarded_at >= now() - interval '12 months'
                    then pp.points::int else 0 end), 0) as raw_tier1_points,
  coalesce(sum(case when pp.weight_applied < 1.0 and pp.awarded_at >= now() - interval '12 months'
                    then (pp.points * pp.weight_applied)::int else 0 end), 0) as raw_tier2_points
from public.profiles p
left join public.player_points pp on pp.profile_id = p.id
group by p.id, p.display_name, p.avatar_url, p.skill_category, p.gender, p.city;

comment on view public.player_ranking_official is 'Tier 1 ranking de jugadores (parejas oficiales + ad-hoc + equipos)';
comment on view public.player_ranking_consolidated is 'Ranking personal consolidado: Tier 1 + Tier 2 con weights aplicados';
