-- PadelKing — chat in-app por torneo
--
-- Polimórfico para escalar después a match-level o community-level chat.
-- Por ahora habilitamos solo target_kind='tournament'.

do $$ begin
  create type chat_target_kind as enum ('tournament', 'match', 'community');
exception when duplicate_object then null; end $$;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  target_kind chat_target_kind not null,
  target_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint body_length check (length(body) between 1 and 1000)
);

create index chat_messages_target_idx
  on public.chat_messages (target_kind, target_id, created_at desc);
create index chat_messages_profile_idx on public.chat_messages (profile_id);

alter table public.chat_messages enable row level security;

-- READ: para tournament chat, debe ser participante (registration confirmada) o
-- dueño del club que organiza (organizador).
drop policy if exists "tournament chat read" on public.chat_messages;
create policy "tournament chat read" on public.chat_messages for select
  using (
    target_kind = 'tournament' and (
      exists (
        select 1 from public.tournament_registrations tr
        where tr.tournament_id = target_id
          and tr.status = 'confirmed'
          and (
            tr.player_one_id = auth.uid()
            or tr.player_two_id = auth.uid()
            or tr.player_id = auth.uid()
          )
      )
      or exists (
        select 1 from public.tournaments t
        join public.clubs c on c.id = t.club_id
        where t.id = target_id and c.owner_id = auth.uid()
      )
    )
  );

-- INSERT: mismo criterio que read + el profile_id debe ser el auth.uid().
drop policy if exists "tournament chat post" on public.chat_messages;
create policy "tournament chat post" on public.chat_messages for insert
  with check (
    profile_id = auth.uid()
    and target_kind = 'tournament'
    and (
      exists (
        select 1 from public.tournament_registrations tr
        where tr.tournament_id = target_id
          and tr.status = 'confirmed'
          and (
            tr.player_one_id = auth.uid()
            or tr.player_two_id = auth.uid()
            or tr.player_id = auth.uid()
          )
      )
      or exists (
        select 1 from public.tournaments t
        join public.clubs c on c.id = t.club_id
        where t.id = target_id and c.owner_id = auth.uid()
      )
    )
  );

-- DELETE: solo el autor del mensaje
drop policy if exists "delete own chat" on public.chat_messages;
create policy "delete own chat" on public.chat_messages for delete
  using (profile_id = auth.uid());

comment on table public.chat_messages is 'Chat in-app polimórfico (torneo MVP, match/community futuro).';
