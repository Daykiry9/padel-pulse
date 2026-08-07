-- PadelKing — moderación de contenido generado por usuarios
--
-- Requisito de tienda, no antojo: la guideline 1.2 de Apple (y la política
-- equivalente de UGC en Google Play) exigen que una app con contenido de
-- usuarios permita reportar contenido ofensivo y bloquear usuarios abusivos.
-- La app tiene chat, nombres de equipos y de invitados escritos por gente,
-- así que aplica.

do $$ begin
  create type report_target_kind as enum ('chat_message', 'profile');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('pending', 'reviewed', 'dismissed', 'actioned');
exception when duplicate_object then null; end $$;

-- ============================================================
-- content_reports — denuncias de contenido
-- ============================================================
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  target_kind report_target_kind not null,
  target_id uuid not null,
  -- Autor del contenido denunciado. Se guarda aparte del target porque si el
  -- mensaje se borra, el reporte sigue sirviendo para juzgar al autor.
  reported_profile_id uuid references public.profiles(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  note text,
  status report_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  constraint reason_length check (length(reason) between 1 and 80),
  constraint note_length check (note is null or length(note) <= 500),
  -- Un usuario no puede inflar el conteo reportando lo mismo muchas veces.
  unique (reporter_id, target_kind, target_id)
);

create index if not exists content_reports_status_idx
  on public.content_reports (status, created_at desc);
create index if not exists content_reports_target_idx
  on public.content_reports (target_kind, target_id);
create index if not exists content_reports_reported_idx
  on public.content_reports (reported_profile_id);

alter table public.content_reports enable row level security;

-- INSERT: cualquiera autenticado, pero solo en su propio nombre.
drop policy if exists "content_reports insert own" on public.content_reports;
create policy "content_reports insert own" on public.content_reports for insert
  with check (reporter_id = auth.uid());

-- SELECT: el denunciante ve lo suyo; el super admin ve todo para moderar.
drop policy if exists "content_reports read own or admin" on public.content_reports;
create policy "content_reports read own or admin" on public.content_reports for select
  using (reporter_id = auth.uid() or public.is_super_admin());

-- UPDATE: solo moderación.
drop policy if exists "content_reports admin update" on public.content_reports;
create policy "content_reports admin update" on public.content_reports for update
  using (public.is_super_admin());

-- ============================================================
-- user_blocks — bloqueo entre usuarios
-- ============================================================
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- Cada quien administra solo su propia lista de bloqueados.
drop policy if exists "user_blocks manage own" on public.user_blocks;
create policy "user_blocks manage own" on public.user_blocks for all
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- ============================================================
-- Filtrar mensajes de usuarios bloqueados
-- ============================================================
-- El filtro va en la policy y no en el frontend a proposito: asi aplica tanto
-- al render en servidor como a Realtime (que respeta RLS), sin duplicar la
-- lógica en cada consumidor del chat.
--
-- OJO: el criterio de abajo se copio de pg_policies en produccion, no del
-- archivo 20260522210000_chat_messages.sql. Ese archivo quedo desactualizado:
-- una migracion posterior amplio la policy para dar acceso tambien al dueño de
-- la comunidad (cm.owner_id). Reescribirla desde el archivo original le habria
-- quitado el chat a los dueños de comunidad.
drop policy if exists "tournament chat read" on public.chat_messages;
create policy "tournament chat read" on public.chat_messages for select
  using (
    target_kind = 'tournament'
    and not exists (
      select 1 from public.user_blocks ub
      where ub.blocker_id = auth.uid()
        and ub.blocked_id = chat_messages.profile_id
    )
    and exists (
      select 1
      from public.tournaments t
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
              and (
                r.player_id = auth.uid()
                or r.player_one_id = auth.uid()
                or r.player_two_id = auth.uid()
              )
          )
        )
    )
  );

comment on table public.content_reports is
  'Denuncias de contenido de usuarios. Requisito de App Store guideline 1.2.';
comment on table public.user_blocks is
  'Bloqueo entre usuarios. Filtra chat via RLS, no en el cliente.';
