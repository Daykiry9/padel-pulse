-- PadelKing — flujo de aprobación para comunidades + admin role
--
-- Cambios:
-- 1) profiles.is_super_admin: rol global para aprobar communities request
-- 2) communities.status: pending | active | rejected (default 'active' para no romper data vieja)
-- 3) community_creation_requests: el flujo para pedir crear una comunidad (min 5 fundadores)
-- 4) community_join_requests: el flujo para pedir unirse a una comunidad
--    + assigned_category opcional (el admin asigna al aprobar)

-- ============================================================
-- 1. Super admin role
-- ============================================================
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

create index if not exists profiles_super_admin_idx on public.profiles (is_super_admin)
  where is_super_admin = true;

-- ============================================================
-- 2. communities.status
-- ============================================================
do $$ begin
  create type community_status as enum ('pending', 'active', 'rejected');
exception when duplicate_object then null; end $$;

alter table public.communities
  add column if not exists status community_status not null default 'active';

create index if not exists communities_status_idx on public.communities (status);

-- ============================================================
-- 3. community_creation_requests
-- ============================================================
create table if not exists public.community_creation_requests (
  id uuid primary key default gen_random_uuid(),
  proposed_name text not null,
  proposed_slug text not null,
  proposed_city text not null,
  proposed_description text,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  -- Fundadores: nombre + (opcional) email/phone para validar
  founding_members jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  decision_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  approved_community_id uuid references public.communities(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint status_valid check (status in ('pending', 'approved', 'rejected')),
  constraint min_5_founders check (jsonb_array_length(founding_members) >= 5)
);

create index if not exists community_creation_requests_status_idx
  on public.community_creation_requests (status, created_at desc);
create index if not exists community_creation_requests_requester_idx
  on public.community_creation_requests (requested_by);

alter table public.community_creation_requests enable row level security;

drop policy if exists "users see own creation requests" on public.community_creation_requests;
create policy "users see own creation requests"
  on public.community_creation_requests for select
  using (requested_by = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin
  ));

drop policy if exists "authenticated users create requests" on public.community_creation_requests;
create policy "authenticated users create requests"
  on public.community_creation_requests for insert
  with check (auth.uid() = requested_by);

drop policy if exists "super admins decide requests" on public.community_creation_requests;
create policy "super admins decide requests"
  on public.community_creation_requests for update
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin
  ));

-- ============================================================
-- 4. community_join_requests
-- ============================================================
create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending',
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  assigned_category team_category,
  decision_note text,
  created_at timestamptz not null default now(),
  constraint join_status_valid check (status in ('pending', 'approved', 'rejected'))
);

-- Solo una pending por (community, profile) — no spam de requests
create unique index if not exists community_join_requests_pending_unique
  on public.community_join_requests (community_id, profile_id)
  where status = 'pending';

create index if not exists community_join_requests_community_idx
  on public.community_join_requests (community_id, status, created_at desc);
create index if not exists community_join_requests_profile_idx
  on public.community_join_requests (profile_id, created_at desc);

alter table public.community_join_requests enable row level security;

drop policy if exists "users see own join requests" on public.community_join_requests;
create policy "users see own join requests"
  on public.community_join_requests for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.communities c
      where c.id = community_join_requests.community_id and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = community_join_requests.community_id
        and cm.profile_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

drop policy if exists "authenticated users create join requests" on public.community_join_requests;
create policy "authenticated users create join requests"
  on public.community_join_requests for insert
  with check (auth.uid() = profile_id);

drop policy if exists "community admins decide join requests" on public.community_join_requests;
create policy "community admins decide join requests"
  on public.community_join_requests for update
  using (
    exists (
      select 1 from public.communities c
      where c.id = community_join_requests.community_id and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = community_join_requests.community_id
        and cm.profile_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

comment on table public.community_creation_requests is 'Solicitudes para crear nuevas comunidades. Super admin aprueba.';
comment on table public.community_join_requests is 'Solicitudes para unirse a una comunidad. Owner/admin de la comunidad aprueba.';
