-- PadelKing — RLS para modalidades de inscripción (v4 personal-first).
--
-- La policy original "team members can register their team" solo permite
-- inscripciones cuando team_id está presente Y el caller es miembro activo
-- del team. Eso bloqueaba:
--   B) ad-hoc partner (team_id NULL, dos players)
--   C) individual (team_id NULL, un solo player_id)
--
-- Agregamos dos policies adicionales (las INSERT policies se OR-ean):

drop policy if exists "self register adhoc" on public.tournament_registrations;
create policy "self register adhoc" on public.tournament_registrations for insert
  with check (
    auth.uid() = registered_by
    and team_id is null
    and player_one_id is not null
    and player_two_id is not null
    and (player_one_id = auth.uid() or player_two_id = auth.uid())
  );

drop policy if exists "self register individual" on public.tournament_registrations;
create policy "self register individual" on public.tournament_registrations for insert
  with check (
    auth.uid() = registered_by
    and team_id is null
    and player_one_id is null
    and player_two_id is null
    and player_id = auth.uid()
  );

-- También DELETE para que el jugador pueda cancelar su propia inscripción
-- (la policy vieja solo cubría delete via team membership).
drop policy if exists "self cancel adhoc registration" on public.tournament_registrations;
create policy "self cancel adhoc registration" on public.tournament_registrations for delete
  using (
    player_one_id = auth.uid() or player_two_id = auth.uid() or player_id = auth.uid()
  );
