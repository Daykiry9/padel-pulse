-- PadelKing — Americano Random (social).
--
-- En el americano fijo cada inscripción es una pareja y un match enfrenta 2
-- inscripciones. En el RANDOM los jugadores se inscriben individualmente y en
-- cada ronda se arman parejas distintas: un match enfrenta a 4 jugadores
-- individuales en 2 parejas que rotan ronda a ronda. El modelo de matches
-- (registration_one_id / registration_two_id) no alcanza, así que agregamos
-- los 4 jugadores explícitos por partido.

-- ============================================================
-- 1. tournaments: puntos por partido + rondas configurables
-- ============================================================
alter table public.tournaments
  add column if not exists points_per_match int not null default 12,
  add column if not exists total_rounds int;

-- ============================================================
-- 2. matches: soportar 4 jugadores individuales (parejas rotativas)
-- ============================================================
alter table public.matches
  alter column registration_one_id drop not null,
  alter column registration_two_id drop not null;

alter table public.matches
  add column if not exists pair_one_player_one_id uuid references public.profiles(id) on delete set null,
  add column if not exists pair_one_player_two_id uuid references public.profiles(id) on delete set null,
  add column if not exists pair_two_player_one_id uuid references public.profiles(id) on delete set null,
  add column if not exists pair_two_player_two_id uuid references public.profiles(id) on delete set null,
  add column if not exists reported_by_side smallint;

alter table public.matches
  drop constraint if exists reported_by_side_valid;
alter table public.matches
  add constraint reported_by_side_valid
  check (reported_by_side is null or reported_by_side in (1, 2));

-- Índices para resolver "mis partidos" por jugador en torneos random.
create index if not exists matches_pair_players_idx
  on public.matches (pair_one_player_one_id, pair_one_player_two_id,
                      pair_two_player_one_id, pair_two_player_two_id);
