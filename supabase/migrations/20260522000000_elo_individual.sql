-- PadelKing — ELO individual estilo Playtomic.
--
-- Sistema separado del ranking de puntos (player_ranking_consolidated):
--   * Puntos = posición en torneos × decaimiento 12 meses (vista política/torneos)
--   * ELO = rating match-by-match, fluctúa con cada resultado (vista deportiva)
--
-- Inicial: 1000. K=24 default. Updates aplicados desde server action en
-- el momento que el match queda 'completed' (no via trigger SQL para evitar
-- recursión y para tener mejor control + logging).

alter table public.profiles
  add column if not exists elo_rating int not null default 1000;

alter table public.profiles
  drop constraint if exists elo_rating_reasonable;
alter table public.profiles
  add constraint elo_rating_reasonable check (elo_rating >= 200 and elo_rating <= 3500);

create index if not exists profiles_elo_rating_idx on public.profiles (elo_rating desc);

comment on column public.profiles.elo_rating is 'ELO individual, fluctúa con cada match completed. Default 1000.';

-- Histórico opcional para gráfica de evolución
create table if not exists public.elo_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  elo_before int not null,
  elo_after int not null,
  delta int not null,
  created_at timestamptz not null default now()
);

create index if not exists elo_history_profile_idx on public.elo_history (profile_id, created_at desc);

alter table public.elo_history enable row level security;

drop policy if exists "elo history public read" on public.elo_history;
create policy "elo history public read" on public.elo_history for select using (true);

-- INSERT via service role solamente (no policy = blocked para anon/authed)
