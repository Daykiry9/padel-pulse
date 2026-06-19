-- Formato híbrido: fase de grupos (round-robin) + playoff (eliminación).
-- Reusa el motor de eliminación (match_code/next_match_id de 20260619130000)
-- para el playoff y el round-robin existente para los grupos.

-- Nuevo valor del enum de formato. (ADD VALUE no corre dentro de transacción;
-- por eso esta migración se aplica vía Management API en statements separados.)
alter type public.tournament_format add value if not exists 'grupos_eliminacion';

-- Config del híbrido en tournaments.
alter table public.tournaments
  add column if not exists num_groups int,
  add column if not exists qualifiers_per_group int;

comment on column public.tournaments.num_groups is
  'Híbrido grupos+playoff: cantidad de grupos en la fase de grupos.';
comment on column public.tournaments.qualifiers_per_group is
  'Híbrido: cuántos clasifican por grupo al playoff (default 2).';

-- Fase y grupo de cada match.
alter table public.matches
  add column if not exists group_number int,
  add column if not exists stage text;

alter table public.matches
  drop constraint if exists match_stage_valid;
alter table public.matches
  add constraint match_stage_valid check (stage is null or stage in ('group', 'playoff'));

create index if not exists matches_stage_group_idx on public.matches (tournament_id, stage, group_number);

comment on column public.matches.group_number is
  'Híbrido: número de grupo del match en la fase de grupos. null en playoff/round-robin.';
comment on column public.matches.stage is
  'Híbrido: group | playoff. null en formatos de una sola fase.';
