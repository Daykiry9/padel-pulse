-- PadelKing — Security hardening pre-beta
--
-- Cierra 6 issues identificados en PRE_BETA_AUDIT.md:
--   C1: profiles expone PII a todos los authenticated
--   C2: invitation_tokens enumerables sin tener el link
--   C3: community_members INSERT directo bypassea el approval flow
--   C4: team_members INSERT directo permite joins sin invitación
--   C5: ELO se re-aplica si organizador corrige el score
--   C6: race condition en updates simultáneos de ELO

-- ============================================================
-- C1 — profiles: cerrar la lectura abierta + vista pública segura
-- ============================================================

-- Vista con columnas seguras. SECURITY INVOKER OFF = corre con permisos
-- del owner (postgres), bypassando RLS de la tabla subyacente.
create or replace view public.profiles_public
  with (security_invoker = off) as
select
  id,
  display_name,
  avatar_url,
  city,
  skill_category,
  gender,
  elo_rating,
  instagram_handle,
  dominant_hand,
  favorite_position,
  playing_since_year,
  created_at,
  rating,
  is_super_admin
from public.profiles;

grant select on public.profiles_public to anon, authenticated;

-- Cerrar el SELECT abierto histórico
drop policy if exists "profiles are public read" on public.profiles;

-- Self-read: cada user lee su propia fila completa (incluye PII)
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select
  using (auth.uid() = id);

-- Super admin lee todas las filas (necesario para /app/admin que muestra
-- phone del requester en community_creation_requests)
drop policy if exists "super admin reads all profiles" on public.profiles;
create policy "super admin reads all profiles" on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_super_admin = true
    )
  );

-- ============================================================
-- C2 — invitation_tokens: cerrar enumeración
-- ============================================================

drop policy if exists "invitations are public read" on public.invitation_tokens;

-- Solo el creator ve sus propias invitaciones (para listarlas en su panel).
-- El redeem se hace via service role en el server action, no por el cliente.
drop policy if exists "creator reads own invitations" on public.invitation_tokens;
create policy "creator reads own invitations" on public.invitation_tokens for select
  using (auth.uid() = created_by);

-- ============================================================
-- C3 — community_members: cerrar INSERT directo (bypass del approval)
-- ============================================================

drop policy if exists "users can join communities" on public.community_members;

-- INSERT ahora SOLO via service role (en decideJoinRequest / redeem de invite).
-- El trigger on_community_created (SECURITY DEFINER) sigue bypassando RLS, OK.
-- DELETE self (users can leave communities) se mantiene.

-- ============================================================
-- C4 — team_members: cerrar INSERT directo (bypass de invitación)
-- ============================================================

drop policy if exists "users manage their own team_member rows" on public.team_members;

-- Self UPDATE/DELETE — para dejar un team o marcar inactive
drop policy if exists "self leaves team" on public.team_members;
create policy "self leaves team" on public.team_members for delete
  using (auth.uid() = profile_id);

drop policy if exists "self updates own team_member" on public.team_members;
create policy "self updates own team_member" on public.team_members for update
  using (auth.uid() = profile_id);

-- INSERT: SIN policy = bloqueado por default. Sólo service role
-- (en team-actions.createTeam y en redeemInvitation para invites de team).

-- ============================================================
-- C5 — matches: columna para idempotencia del ELO
-- ============================================================

alter table public.matches
  add column if not exists elo_applied_at timestamptz;

comment on column public.matches.elo_applied_at is
  'Timestamp cuando se aplicó ELO al match. Si no es null, no re-aplicar (idempotencia).';

-- ============================================================
-- C6 — RPC atómica para aplicar delta de ELO sin race
-- ============================================================

create or replace function public.apply_elo_delta(
  p_profile_id uuid,
  p_delta int,
  p_match_id uuid
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_before int;
  v_after int;
begin
  -- SELECT FOR UPDATE: lock de fila hasta el commit. Dos llamadas
  -- concurrentes con el mismo profile_id se serializan.
  select elo_rating into v_before
    from public.profiles
   where id = p_profile_id
     for update;

  if v_before is null then
    raise exception 'Profile % no existe', p_profile_id;
  end if;

  -- Clamp en el rango válido del constraint elo_rating_reasonable (200-3500)
  v_after := greatest(200, least(3500, v_before + p_delta));

  update public.profiles
     set elo_rating = v_after
   where id = p_profile_id;

  insert into public.elo_history (profile_id, match_id, elo_before, elo_after, delta)
    values (p_profile_id, p_match_id, v_before, v_after, v_after - v_before);

  return v_after;
end;
$$;

comment on function public.apply_elo_delta is
  'Atómicamente aplica un delta de ELO a un profile y registra la historia. Usa SELECT FOR UPDATE para evitar race conditions con updates simultáneos.';

-- El RPC se invoca con service role (BYPASS RLS), pero por seguridad
-- explicitamos revoke público y grant a service_role.
revoke all on function public.apply_elo_delta(uuid, int, uuid) from public;
grant execute on function public.apply_elo_delta(uuid, int, uuid) to service_role;
