-- PadelKing — torneos organizados directamente por una comunidad.
--
-- Hasta ahora un torneo colgaba SIEMPRE de un club (tournaments.club_id NOT NULL)
-- y toda la autorización pasaba por clubs.owner_id. Las comunidades no podían
-- organizar torneos propios. Este cambio permite que una comunidad sea el
-- organizador directo (sin club intermediario):
--   - tournaments.community_id (nullable) → comunidad organizadora
--   - tournaments.club_id pasa a nullable
--   - constraint: al menos uno de los dos debe estar presente
--   - la policy de gestión acepta al owner del club O de la comunidad

-- ============================================================
-- 1. Columna community_id + club_id nullable + constraint
-- ============================================================
alter table public.tournaments
  add column if not exists community_id uuid references public.communities(id) on delete cascade;

alter table public.tournaments
  alter column club_id drop not null;

alter table public.tournaments
  drop constraint if exists tournament_has_organizer;
alter table public.tournaments
  add constraint tournament_has_organizer
  check (club_id is not null or community_id is not null);

create index if not exists tournaments_community_idx on public.tournaments (community_id);

-- ============================================================
-- 2. Policy de gestión: club owner O community owner
-- ============================================================
drop policy if exists "club owners can manage tournaments" on public.tournaments;
drop policy if exists "organizers can manage tournaments" on public.tournaments;
create policy "organizers can manage tournaments" on public.tournaments for all
  using (
    (club_id is not null and exists (
      select 1 from public.clubs
      where clubs.id = tournaments.club_id and clubs.owner_id = auth.uid()
    ))
    or
    (community_id is not null and exists (
      select 1 from public.communities
      where communities.id = tournaments.community_id and communities.owner_id = auth.uid()
    ))
  )
  with check (
    (club_id is not null and exists (
      select 1 from public.clubs
      where clubs.id = tournaments.club_id and clubs.owner_id = auth.uid()
    ))
    or
    (community_id is not null and exists (
      select 1 from public.communities
      where communities.id = tournaments.community_id and communities.owner_id = auth.uid()
    ))
  );

-- ============================================================
-- 3. matches UPDATE: aceptar también al community owner (defensivo;
--    los scores van por service role, pero mantiene el modelo coherente)
-- ============================================================
drop policy if exists "match participants and club admins can update" on public.matches;
drop policy if exists "match participants and organizers can update" on public.matches;
create policy "match participants and organizers can update"
  on public.matches for update using (
    exists (
      select 1 from public.tournaments t
      left join public.clubs c on c.id = t.club_id
      left join public.communities cm on cm.id = t.community_id
      where t.id = matches.tournament_id
        and (c.owner_id = auth.uid() or cm.owner_id = auth.uid())
    )
    or exists (
      select 1 from public.tournament_registrations r
      join public.team_members tm on tm.team_id = r.team_id and tm.is_active
      where r.id in (matches.registration_one_id, matches.registration_two_id)
        and tm.profile_id = auth.uid()
    )
  );
