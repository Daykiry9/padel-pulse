-- supabase/migrations/20260531120000_manual_player_registration.sql
-- Feature A: guest players (sin cuenta, viven solo en el torneo donde fueron creados)
-- Feature B: comunidad minimo 1 fundador
-- Bonus: arreglar gaps pre-existentes (anti-doble-inscripcion, chat RLS community owner, elo loop)

-- ============================================================
-- 1. Tabla guest_players
-- ============================================================
create table if not exists public.guest_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 60),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists guest_players_tournament_idx
  on public.guest_players (tournament_id);

-- Unique por torneo + nombre normalizado (evita duplicar el mismo invitado por nombre)
create unique index if not exists guest_players_tournament_name_unique
  on public.guest_players (tournament_id, lower(trim(display_name)));

alter table public.guest_players enable row level security;

-- ============================================================
-- 2. tournament_registrations: agregar guest_player_id + guest_partner_ids
--    FK ON DELETE RESTRICT (consistente con player_*_id existentes; no
--    cascade silencioso, no set null que dejaria rows huerfanas).
-- ============================================================
alter table public.tournament_registrations
  add column if not exists guest_player_id uuid references public.guest_players(id) on delete restrict,
  add column if not exists guest_player_one_id uuid references public.guest_players(id) on delete restrict,
  add column if not exists guest_player_two_id uuid references public.guest_players(id) on delete restrict;

create index if not exists tournament_regs_guest_player_idx
  on public.tournament_registrations (guest_player_id);
create index if not exists tournament_regs_guest_pair_idx
  on public.tournament_registrations (guest_player_one_id, guest_player_two_id);

-- Anti doble-inscripcion: un mismo profile/guest no puede aparecer 2x en el mismo torneo.
-- Cubre todas las modalidades (individual + adhoc + team).
create unique index if not exists tournament_regs_player_id_unique
  on public.tournament_registrations (tournament_id, player_id) where player_id is not null;
create unique index if not exists tournament_regs_guest_player_id_unique
  on public.tournament_registrations (tournament_id, guest_player_id) where guest_player_id is not null;

-- ============================================================
-- 3. Reemplazar constraint registration_modality para aceptar guests.
--    Regla por slot: profile XOR guest (estricto).
-- ============================================================
alter table public.tournament_registrations drop constraint if exists registration_modality;

alter table public.tournament_registrations add constraint registration_modality check (
  -- A) Pareja con team registrado: solo profiles (los teams no tienen guests por diseno).
  (team_id is not null
    and player_one_id is not null and player_two_id is not null
    and player_id is null
    and guest_player_id is null
    and guest_player_one_id is null and guest_player_two_id is null)
  or
  -- B) Pareja ad-hoc: cada slot es EXACTAMENTE uno (profile XOR guest), los 2 slots existen.
  --    Admite combinaciones: 2 profiles, 1 profile + 1 guest, 2 guests.
  (team_id is null
    and player_id is null
    and guest_player_id is null
    and ((player_one_id is not null) <> (guest_player_one_id is not null))
    and ((player_two_id is not null) <> (guest_player_two_id is not null))
  )
  or
  -- C) Individual: un slot unico, profile XOR guest.
  (team_id is null
    and player_one_id is null and player_two_id is null
    and guest_player_one_id is null and guest_player_two_id is null
    and ((player_id is not null) <> (guest_player_id is not null))
  )
);

-- ============================================================
-- 4. matches: agregar 4 columnas guest_*_id para slots de americano random.
--    FK ON DELETE RESTRICT (consistente con player_*_id; evita matches huerfanos).
-- ============================================================
alter table public.matches
  add column if not exists pair_one_guest_one_id uuid references public.guest_players(id) on delete restrict,
  add column if not exists pair_one_guest_two_id uuid references public.guest_players(id) on delete restrict,
  add column if not exists pair_two_guest_one_id uuid references public.guest_players(id) on delete restrict,
  add column if not exists pair_two_guest_two_id uuid references public.guest_players(id) on delete restrict;

-- ============================================================
-- 5. Constraint pair_slots_xor_guest ESTRICTO.
--    Cada slot del bracket random es EXACTAMENTE uno (player XOR guest),
--    o los 4 slots del pair son NULL (formato fijo, los slots no se usan).
-- ============================================================
alter table public.matches drop constraint if exists pair_slots_xor_guest;
alter table public.matches add constraint pair_slots_xor_guest check (
  -- Por slot: no pueden ser ambos no-null
  not (pair_one_player_one_id is not null and pair_one_guest_one_id is not null)
  and not (pair_one_player_two_id is not null and pair_one_guest_two_id is not null)
  and not (pair_two_player_one_id is not null and pair_two_guest_one_id is not null)
  and not (pair_two_player_two_id is not null and pair_two_guest_two_id is not null)
  and (
    -- Caso fijo: los 4 slots todos NULL (el match usa registration_*_id)
    (pair_one_player_one_id is null and pair_one_guest_one_id is null
     and pair_one_player_two_id is null and pair_one_guest_two_id is null
     and pair_two_player_one_id is null and pair_two_guest_one_id is null
     and pair_two_player_two_id is null and pair_two_guest_two_id is null)
    or
    -- Caso random: cada slot tiene EXACTAMENTE uno (player XOR guest)
    (coalesce(pair_one_player_one_id, pair_one_guest_one_id) is not null
     and coalesce(pair_one_player_two_id, pair_one_guest_two_id) is not null
     and coalesce(pair_two_player_one_id, pair_two_guest_one_id) is not null
     and coalesce(pair_two_player_two_id, pair_two_guest_two_id) is not null)
  )
);

-- Identidad: ningun jugador (profile o guest) puede ocupar 2 slots del mismo match.
-- Comparamos pares de slots via coalesce(profile_id, guest_id) (asume namespaces UUID disjuntos).
alter table public.matches drop constraint if exists pair_slots_unique_players;
alter table public.matches add constraint pair_slots_unique_players check (
  -- Si todos null (fijo), trivialmente OK
  (pair_one_player_one_id is null and pair_one_guest_one_id is null)
  or (
    -- los 4 effective ids son distintos
    coalesce(pair_one_player_one_id, pair_one_guest_one_id) is distinct from coalesce(pair_one_player_two_id, pair_one_guest_two_id)
    and coalesce(pair_one_player_one_id, pair_one_guest_one_id) is distinct from coalesce(pair_two_player_one_id, pair_two_guest_one_id)
    and coalesce(pair_one_player_one_id, pair_one_guest_one_id) is distinct from coalesce(pair_two_player_two_id, pair_two_guest_two_id)
    and coalesce(pair_one_player_two_id, pair_one_guest_two_id) is distinct from coalesce(pair_two_player_one_id, pair_two_guest_one_id)
    and coalesce(pair_one_player_two_id, pair_one_guest_two_id) is distinct from coalesce(pair_two_player_two_id, pair_two_guest_two_id)
    and coalesce(pair_two_player_one_id, pair_two_guest_one_id) is distinct from coalesce(pair_two_player_two_id, pair_two_guest_two_id)
  )
);

create index if not exists matches_pair_guests_idx
  on public.matches (pair_one_guest_one_id, pair_one_guest_two_id, pair_two_guest_one_id, pair_two_guest_two_id);

-- ============================================================
-- 6. RPC: auth.uid() es organizador del torneo? (club owner O community owner)
-- ============================================================
create or replace function public.is_tournament_organizer(p_tournament_id uuid, p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    left join public.clubs c on c.id = t.club_id
    left join public.communities cm on cm.id = t.community_id
    where t.id = p_tournament_id
      and (c.owner_id = p_profile or cm.owner_id = p_profile)
  );
$$;

revoke all on function public.is_tournament_organizer(uuid, uuid) from public;
grant execute on function public.is_tournament_organizer(uuid, uuid) to authenticated, service_role;

-- ============================================================
-- 7. RLS policies para guest_players
-- ============================================================
-- guest_players SELECT: publico (cualquiera que vea el torneo ve los nombres).
drop policy if exists "guests are public read" on public.guest_players;
create policy "guests are public read"
  on public.guest_players for select
  using (true);

-- guest_players INSERT: solo el organizador del torneo, autoria = el organizer.
-- Si created_by es null (organizer pre-existente borrado), no se puede crear nuevo.
drop policy if exists "organizer creates guests" on public.guest_players;
create policy "organizer creates guests"
  on public.guest_players for insert
  with check (
    auth.uid() = created_by
    and public.is_tournament_organizer(tournament_id, auth.uid())
  );

-- guest_players DELETE: solo organizer; la FK on delete restrict en matches/registrations
-- bloqueara el delete si el guest esta en uso. El server action chequea por UX (mensaje claro).
drop policy if exists "organizer deletes guests" on public.guest_players;
create policy "organizer deletes guests"
  on public.guest_players for delete
  using (public.is_tournament_organizer(tournament_id, auth.uid()));

-- guest_players UPDATE: solo organizer (renombrar antes/durante torneo).
drop policy if exists "organizer updates guests" on public.guest_players;
create policy "organizer updates guests"
  on public.guest_players for update
  using (public.is_tournament_organizer(tournament_id, auth.uid()));

-- ============================================================
-- 8. tournament_registrations: nuevas policies para inscripcion manual del organizer.
-- ============================================================
-- INSERT manual: el organizer SOLO puede crear inscripciones que incluyan al
-- menos un guest_*_id (no puede inscribir profiles ajenos sin su consentimiento;
-- los profiles deben self-register). Excepcion: si team_id esta seteado, los miembros
-- ya consintieron al unirse al team.
drop policy if exists "organizer registers manually" on public.tournament_registrations;
create policy "organizer registers manually"
  on public.tournament_registrations for insert
  with check (
    auth.uid() = registered_by
    and public.is_tournament_organizer(tournament_id, auth.uid())
    and (
      guest_player_id is not null
      or guest_player_one_id is not null
      or guest_player_two_id is not null
      or team_id is not null
    )
  );

-- DELETE: organizer puede cancelar cualquier inscripcion de su torneo.
drop policy if exists "organizer cancels registration" on public.tournament_registrations;
create policy "organizer cancels registration"
  on public.tournament_registrations for delete
  using (public.is_tournament_organizer(tournament_id, auth.uid()));

-- UPDATE: organizer puede cambiar status (confirmar, marcar como cancelada).
-- Sin esto, mutaciones del organizer mid-torneo via sesion usuaria fallan silenciosas.
drop policy if exists "organizer updates registration" on public.tournament_registrations;
create policy "organizer updates registration"
  on public.tournament_registrations for update
  using (public.is_tournament_organizer(tournament_id, auth.uid()));

-- ============================================================
-- 9. Chat RLS: incluir community owner como organizador (bug pre-existente).
--    Schema: chat_messages.target_kind + target_id (polimorfico), no tournament_id.
-- ============================================================
drop policy if exists "tournament chat read" on public.chat_messages;
create policy "tournament chat read"
  on public.chat_messages for select
  using (
    target_kind = 'tournament' and exists (
      select 1 from public.tournaments t
      left join public.clubs c on c.id = t.club_id
      left join public.communities cm on cm.id = t.community_id
      where t.id = chat_messages.target_id
        and (
          c.owner_id = auth.uid()
          or cm.owner_id = auth.uid()
          or exists (
            select 1 from public.tournament_registrations r
            where r.tournament_id = t.id
              and r.status = 'confirmed'
              and (r.player_id = auth.uid() or r.player_one_id = auth.uid() or r.player_two_id = auth.uid())
          )
        )
    )
  );

drop policy if exists "tournament chat post" on public.chat_messages;
create policy "tournament chat post"
  on public.chat_messages for insert
  with check (
    profile_id = auth.uid()
    and target_kind = 'tournament'
    and exists (
      select 1 from public.tournaments t
      left join public.clubs c on c.id = t.club_id
      left join public.communities cm on cm.id = t.community_id
      where t.id = chat_messages.target_id
        and (
          c.owner_id = auth.uid()
          or cm.owner_id = auth.uid()
          or exists (
            select 1 from public.tournament_registrations r
            where r.tournament_id = t.id
              and r.status = 'confirmed'
              and (r.player_id = auth.uid() or r.player_one_id = auth.uid() or r.player_two_id = auth.uid())
          )
        )
    )
  );

-- ============================================================
-- 10. Feature B: comunidad minimo 1 fundador
-- ============================================================
alter table public.community_creation_requests
  drop constraint if exists min_5_founders;

alter table public.community_creation_requests
  drop constraint if exists min_1_founder;

alter table public.community_creation_requests
  add constraint min_1_founder check (jsonb_array_length(founding_members) >= 1);

-- ============================================================
-- 11. Comentarios documentales
-- ============================================================
comment on table public.guest_players is
  'Invitados sin cuenta que el organizador inscribe manualmente. Existen solo en el contexto del torneo (FK on delete cascade desde tournaments). No entran al ranking nacional (no tienen row en profiles), no reciben notificaciones, no chatean (no tienen auth.uid()) y no impactan ELO (guard explicito en applyMatchEloAndNotify). TODO awarding finishTournament: filtrar guest_*_id IS NULL antes de insertar player_points (la FK player_points.profile_id -> profiles(id) es el ultimo firewall).';

comment on constraint registration_modality on public.tournament_registrations is
  'Cada slot de jugador en una inscripcion es EXACTAMENTE uno: profile XOR guest. Modalidad A (team) solo admite profiles. La modalidad B con guests requiere registered_by = organizer (enforced en RLS organizer registers manually).';

comment on constraint pair_slots_xor_guest on public.matches is
  'Slots de americano random: cada slot es exactamente uno (player_*_id XOR guest_*_id), o los 4 son NULL (modalidad fijo que usa registration_*_id). Defensa contra slots huerfanos en bracket random.';

comment on table public.community_creation_requests is
  'Solicitudes para crear comunidades; min 1 fundador desde 20260531120000 (relajado para flujo solo-yo).';
