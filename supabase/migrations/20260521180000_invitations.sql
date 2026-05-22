-- PadelKing — sistema de invitaciones virales
--
-- Una sola tabla polimórfica para invitaciones a 3 targets:
--   - tournament: inscríbete al torneo (lleva a página de inscripción)
--   - team: únete a este equipo como segundo jugador
--   - community: únete a la comunidad como miembro
--
-- Flow:
--   1) Owner genera link -> /i/<code>
--   2) Visitante abre /i/<code>:
--      a) Si NO autenticado: cookie con code + redirect a /signup
--      b) Si autenticado: ejecuta redeem y redirect al target
--   3) Tras signup+onboarding, el flujo detecta la cookie y aplica el invite.

do $$ begin
  create type invitation_kind as enum ('tournament', 'team', 'community');
exception when duplicate_object then null; end $$;

create table public.invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                         -- nanoid 10-12 chars URL-safe
  kind invitation_kind not null,
  target_id uuid not null,                            -- FK lógico al tournament/team/community
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,                             -- opcional; null = no expira
  max_uses int,                                       -- opcional; null = ilimitado
  use_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb,        -- flex (rol, mensaje custom, etc.)
  created_at timestamptz not null default now(),
  constraint code_format check (code ~ '^[A-Za-z0-9_-]{6,32}$'),
  constraint max_uses_positive check (max_uses is null or max_uses > 0)
);

create index invitation_tokens_code_idx on public.invitation_tokens (code);
create index invitation_tokens_target_idx on public.invitation_tokens (kind, target_id);
create index invitation_tokens_creator_idx on public.invitation_tokens (created_by);

alter table public.invitation_tokens enable row level security;

-- Lectura: pública. Cualquiera con el link debe poder ver el invite para resolverlo.
create policy "invitations are public read"
  on public.invitation_tokens for select using (true);

-- Insert: cualquiera autenticado (la lógica de "puedes invitar a este target" se valida en
-- la server action chequeando ownership/membership antes de insertar).
create policy "authenticated users can create invitations"
  on public.invitation_tokens for insert
  with check (auth.uid() = created_by);

-- Update: el creador del invite (para revocar o cambiar expires_at).
-- Note: use_count++ lo hace el service role en redeem (bypass RLS).
create policy "creator can update own invitation"
  on public.invitation_tokens for update
  using (auth.uid() = created_by);

-- Delete: el creador puede revocar.
create policy "creator can delete own invitation"
  on public.invitation_tokens for delete
  using (auth.uid() = created_by);

comment on table public.invitation_tokens is 'Tokens de invitación polimórficos para crecimiento orgánico. Tres targets: tournament, team, community.';
