-- PadelKing — soporte de bracket auto-generado.
--
-- 1) Agrega `courts` al torneo (cantidad de canchas disponibles, alimenta el
--    pareo americano).
-- 2) Permite al dueño del club insertar/borrar matches del torneo (las RLS
--    existentes ya cubren select y update).

-- ============================================================
-- 1. tournaments.courts
-- ============================================================
alter table public.tournaments add column if not exists courts int not null default 2;
alter table public.tournaments
  drop constraint if exists courts_valid;
alter table public.tournaments
  add constraint courts_valid check (courts between 1 and 16);

-- ============================================================
-- 2. matches INSERT/DELETE policies para club owner
-- ============================================================
drop policy if exists "club owner can insert matches" on public.matches;
create policy "club owner can insert matches" on public.matches for insert
  with check (
    exists (
      select 1 from public.tournaments t
      join public.clubs c on c.id = t.club_id
      where t.id = matches.tournament_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "club owner can delete matches" on public.matches;
create policy "club owner can delete matches" on public.matches for delete
  using (
    exists (
      select 1 from public.tournaments t
      join public.clubs c on c.id = t.club_id
      where t.id = matches.tournament_id and c.owner_id = auth.uid()
    )
  );
