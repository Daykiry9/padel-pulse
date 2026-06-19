-- Enlace de bracket para eliminación directa (y el playoff del híbrido grupos+playoff).
-- Sin esto la tabla matches no puede representar una llave: no se sabe qué match
-- alimenta a cuál. Aditivo; null en formatos round-robin.

alter table public.matches
  -- código sintético del generador dentro del torneo (ej 'r1-m1', 'r2-m1').
  add column if not exists match_code text,
  -- match al que avanza el ganador (self-FK). null = es la final o no es bracket.
  add column if not exists next_match_id uuid references public.matches(id) on delete set null,
  -- en qué lado del next_match entra el ganador: 1 o 2.
  add column if not exists next_match_slot smallint,
  -- true si este match es un BYE (un lado pasó sin jugar).
  add column if not exists is_bye boolean not null default false;

alter table public.matches
  drop constraint if exists next_match_slot_valid;
alter table public.matches
  add constraint next_match_slot_valid check (next_match_slot is null or next_match_slot in (1, 2));

create index if not exists matches_next_match_idx on public.matches (next_match_id);

comment on column public.matches.match_code is
  'Código del match en la llave (ej r2-m1). Solo en formatos con bracket.';
comment on column public.matches.next_match_id is
  'Match al que avanza el ganador. advanceWinner escribe el ganador en next_match_slot de este match.';
comment on column public.matches.is_bye is
  'BYE: un lado pasa sin jugar. Se inserta como completed con el ganador ya propagado.';
