-- PadelKing — Open Matches (partidos sueltos al estilo Playtomic)
--
-- Un user abre un partido buscando 1-3 jugadores más para completar la cancha.
-- Otros jugadores ven los abiertos en su ciudad y se unen.
-- No es torneo: es un partido casual con resultado opcional (puede contar
-- como Tier 2 si reportan score, o solo social).

do $$ begin
  create type open_match_status as enum ('open', 'full', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.open_matches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  host_id uuid not null references public.profiles(id) on delete cascade,
  city text not null,
  venue text,                                          -- texto libre (club, dirección, etc.)
  club_id uuid references public.clubs(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 90,
  category team_category,                              -- nivel objetivo (opcional)
  max_players int not null default 4,
  current_players int not null default 1,              -- el host cuenta
  message text,                                        -- "traigo pelotas", "primera vez vengan tranquilos", etc.
  status open_match_status not null default 'open',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint max_players_valid check (max_players between 2 and 4),
  constraint current_le_max check (current_players <= max_players),
  constraint future_match check (scheduled_at > created_at - interval '1 hour')
);

create index open_matches_open_idx on public.open_matches (status, scheduled_at)
  where status = 'open';
create index open_matches_city_idx on public.open_matches (city, scheduled_at);
create index open_matches_host_idx on public.open_matches (host_id);

-- Participantes (incluye al host)
create table if not exists public.open_match_participants (
  open_match_id uuid not null references public.open_matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (open_match_id, profile_id)
);

create index open_match_participants_profile_idx on public.open_match_participants (profile_id);

-- RLS
alter table public.open_matches enable row level security;
alter table public.open_match_participants enable row level security;

-- Open matches: read público (cualquiera ve los partidos abiertos)
drop policy if exists "open matches public read" on public.open_matches;
create policy "open matches public read" on public.open_matches for select using (true);

-- Insert: cualquier authenticated user puede crear (es el host)
drop policy if exists "authenticated create open match" on public.open_matches;
create policy "authenticated create open match" on public.open_matches for insert
  with check (auth.uid() = host_id);

-- Update: solo el host puede modificar / cancelar
drop policy if exists "host updates own match" on public.open_matches;
create policy "host updates own match" on public.open_matches for update
  using (auth.uid() = host_id);

-- Delete: solo host
drop policy if exists "host deletes own match" on public.open_matches;
create policy "host deletes own match" on public.open_matches for delete
  using (auth.uid() = host_id);

-- Participantes: read público
drop policy if exists "participants public read" on public.open_match_participants;
create policy "participants public read" on public.open_match_participants for select using (true);

-- Insert: el propio user se une (la lógica de capacidad va en el server action)
drop policy if exists "self join open match" on public.open_match_participants;
create policy "self join open match" on public.open_match_participants for insert
  with check (auth.uid() = profile_id);

-- Delete: el propio user se sale, o el host saca a alguien
drop policy if exists "self or host removes participant" on public.open_match_participants;
create policy "self or host removes participant" on public.open_match_participants for delete
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.open_matches om
      where om.id = open_match_id and om.host_id = auth.uid()
    )
  );

comment on table public.open_matches is 'Partidos sueltos casuales — al estilo Playtomic open matches. Host abre buscando players, otros se unen.';
