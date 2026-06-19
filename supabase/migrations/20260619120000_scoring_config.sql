-- Scoring configurable por torneo: a puntos, a games, o por sets (mejor de N).
-- Aditivo: no rompe nada. score_one/score_two se mantienen como el AGREGADO que
-- decide el ganador (sets ganados en modo 'sets'; el numero directo en points/games),
-- asi ELO/standings/corona siguen leyendolos sin cambios. El detalle por set vive
-- en matches.set_scores.

-- ============================================================
-- 1. tournaments: configuracion de marcador
-- ============================================================
alter table public.tournaments
  add column if not exists scoring_mode text not null default 'points',
  add column if not exists num_sets int,
  add column if not exists games_per_set int;

alter table public.tournaments
  drop constraint if exists scoring_mode_valid;
alter table public.tournaments
  add constraint scoring_mode_valid check (scoring_mode in ('points', 'games', 'sets'));

-- En modo 'sets', num_sets es impar (mejor de N: 1, 3, 5, 7) y games_per_set > 0.
alter table public.tournaments
  drop constraint if exists scoring_sets_coherent;
alter table public.tournaments
  add constraint scoring_sets_coherent check (
    scoring_mode <> 'sets'
    or (num_sets is not null and num_sets between 1 and 9 and num_sets % 2 = 1
        and games_per_set is not null and games_per_set between 1 and 20)
  );

comment on column public.tournaments.scoring_mode is
  'Como se decide el marcador: points (un numero, americano), games (un set a N games), sets (mejor de num_sets).';
comment on column public.tournaments.num_sets is
  'Modo sets: cantidad maxima de sets (impar). Gana quien llega a ceil(num_sets/2). null si no es modo sets.';
comment on column public.tournaments.games_per_set is
  'Modo sets: games para ganar un set (ej 6). null si no es modo sets.';

-- ============================================================
-- 2. matches: detalle por set (solo modo 'sets')
-- ============================================================
-- jsonb array: [{ "one": 6, "two": 4 }, { "one": 6, "two": 3 }]. null en points/games.
alter table public.matches
  add column if not exists set_scores jsonb;

comment on column public.matches.set_scores is
  'Detalle por set en modo sets: [{one,two},...]. score_one/score_two siguen siendo el agregado (sets ganados) que decide el ganador.';
