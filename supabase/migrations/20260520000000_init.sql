-- PadelKing — esquema inicial
-- Estructura: extensions → enums → tablas → indexes → functions/triggers → policies → views
-- (las policies van al final para evitar forward references)

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type skill_level as enum ('beginner', 'intermediate', 'advanced', 'pro');
create type member_role as enum ('owner', 'admin', 'member');
create type tournament_format as enum ('americano', 'mexicano', 'league');
create type tournament_status as enum ('draft', 'open', 'in_progress', 'finished', 'cancelled');
create type tournament_gender as enum ('mixed', 'male', 'female');
create type match_status as enum ('scheduled', 'in_progress', 'completed', 'disputed');

-- ============================================================
-- TABLES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  city text,
  skill_level skill_level not null default 'intermediate',
  rating int not null default 1200,
  created_at timestamptz not null default now()
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  city text not null,
  country text not null default 'CO',
  owner_id uuid not null references public.profiles(id) on delete restrict,
  rating int not null default 1200,
  created_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, profile_id)
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text not null,
  country text not null default 'CO',
  logo_url text,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  format tournament_format not null default 'americano',
  status tournament_status not null default 'draft',
  gender tournament_gender not null default 'mixed',
  club_id uuid not null references public.clubs(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_deadline timestamptz not null,
  price_per_pair int not null default 0,
  max_pairs int not null default 16,
  rotation_games int not null default 24,
  description text,
  banner_url text,
  sponsor_name text,
  sponsor_logo_url text,
  created_at timestamptz not null default now(),
  constraint valid_dates check (ends_at >= starts_at and registration_deadline <= starts_at),
  constraint valid_max_pairs check (max_pairs >= 4 and max_pairs % 2 = 0)
);

create table public.tournament_pairs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete restrict,
  player_one_id uuid not null references public.profiles(id) on delete restrict,
  player_two_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint distinct_players check (player_one_id <> player_two_id),
  unique (tournament_id, player_one_id, player_two_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number int not null,
  court_number int not null,
  pair_one_id uuid not null references public.tournament_pairs(id) on delete cascade,
  pair_two_id uuid not null references public.tournament_pairs(id) on delete cascade,
  score_pair_one int,
  score_pair_two int,
  status match_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distinct_pairs check (pair_one_id <> pair_two_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index communities_city_idx on public.communities (city);
create index communities_rating_idx on public.communities (rating desc);
create index community_members_profile_idx on public.community_members (profile_id);
create index tournaments_status_idx on public.tournaments (status, starts_at desc);
create index tournaments_club_idx on public.tournaments (club_id);
create index tournament_pairs_tournament_idx on public.tournament_pairs (tournament_id);
create index tournament_pairs_community_idx on public.tournament_pairs (community_id);
create index matches_tournament_idx on public.matches (tournament_id, round_number);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.add_owner_as_member()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.community_members (community_id, profile_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_community_created
  after insert on public.communities for each row execute procedure public.add_owner_as_member();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger matches_touch_updated_at
  before update on public.matches for each row execute procedure public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.clubs enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_pairs enable row level security;
alter table public.matches enable row level security;

-- profiles
create policy "profiles are public read"
  on public.profiles for select using (true);

create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- communities
create policy "communities are public read"
  on public.communities for select using (true);

create policy "authenticated users can create communities"
  on public.communities for insert with check (auth.uid() = owner_id);

create policy "owners and admins can update community"
  on public.communities for update using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.community_members
      where community_id = communities.id and profile_id = auth.uid() and role = 'admin'
    )
  );

create policy "owners can delete community"
  on public.communities for delete using (auth.uid() = owner_id);

-- community_members
create policy "members are public read"
  on public.community_members for select using (true);

create policy "users can join communities"
  on public.community_members for insert with check (auth.uid() = profile_id);

create policy "users can leave communities"
  on public.community_members for delete using (auth.uid() = profile_id);

create policy "admins can manage members"
  on public.community_members for update using (
    exists (
      select 1 from public.community_members me
      where me.community_id = community_members.community_id
        and me.profile_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
  );

-- clubs
create policy "clubs are public read"
  on public.clubs for select using (true);

create policy "users can create clubs"
  on public.clubs for insert with check (auth.uid() = owner_id);

create policy "owners can update clubs"
  on public.clubs for update using (auth.uid() = owner_id);

-- tournaments
create policy "tournaments are public read"
  on public.tournaments for select using (true);

create policy "club owners can manage tournaments"
  on public.tournaments for all using (
    exists (
      select 1 from public.clubs
      where clubs.id = tournaments.club_id and clubs.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.clubs
      where clubs.id = tournaments.club_id and clubs.owner_id = auth.uid()
    )
  );

-- tournament_pairs
create policy "pairs are public read"
  on public.tournament_pairs for select using (true);

create policy "community members can register pairs"
  on public.tournament_pairs for insert with check (
    exists (
      select 1 from public.community_members
      where community_id = tournament_pairs.community_id and profile_id = auth.uid()
    )
  );

create policy "community admins can delete pairs"
  on public.tournament_pairs for delete using (
    exists (
      select 1 from public.community_members
      where community_id = tournament_pairs.community_id
        and profile_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- matches
create policy "matches are public read"
  on public.matches for select using (true);

create policy "club owners and players can update match scores"
  on public.matches for update using (
    exists (
      select 1 from public.tournaments t
      join public.clubs c on c.id = t.club_id
      where t.id = matches.tournament_id and c.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.tournament_pairs tp
      where tp.id in (matches.pair_one_id, matches.pair_two_id)
        and auth.uid() in (tp.player_one_id, tp.player_two_id)
    )
  );

-- ============================================================
-- VIEW: ranking de comunidades por torneo (cliente filtra por fechas)
-- ============================================================
create view public.community_ranking_stats as
select
  c.id as community_id,
  c.name as community_name,
  c.logo_url as community_logo_url,
  c.city as city,
  c.rating as rating,
  t.id as tournament_id,
  t.starts_at as tournament_starts_at,
  count(*) filter (where m.status = 'completed') as matches_played,
  count(*) filter (
    where m.status = 'completed'
      and (
        (m.pair_one_id = tp.id and m.score_pair_one > m.score_pair_two)
        or (m.pair_two_id = tp.id and m.score_pair_two > m.score_pair_one)
      )
  ) as matches_won,
  sum(
    case
      when m.pair_one_id = tp.id then coalesce(m.score_pair_one, 0) - coalesce(m.score_pair_two, 0)
      when m.pair_two_id = tp.id then coalesce(m.score_pair_two, 0) - coalesce(m.score_pair_one, 0)
      else 0
    end
  ) as point_diff
from public.communities c
join public.tournament_pairs tp on tp.community_id = c.id
join public.tournaments t on t.id = tp.tournament_id
join public.matches m on m.tournament_id = t.id and tp.id in (m.pair_one_id, m.pair_two_id)
where t.status = 'finished'
group by c.id, c.name, c.logo_url, c.city, c.rating, t.id, t.starts_at;
