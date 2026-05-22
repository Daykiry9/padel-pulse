-- PadelKing — datos extendidos de perfil (marketing + premios + visibilidad sponsor)
--
-- Todos son opcionales (nullable) para no romper a usuarios existentes.
-- El onboarding nuevo los muestra como "complétalos para subir tu visibilidad ante marcas".

-- Mano dominante (sponsors de paletas: Bullpadel, Babolat, Adidas, etc.)
do $$ begin
  create type dominant_hand as enum ('left', 'right');
exception when duplicate_object then null; end $$;

-- Posición preferida en cancha
do $$ begin
  create type court_position as enum ('drive', 'reves', 'ambos');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists phone text,                       -- E.164 idealmente (+57 300...)
  add column if not exists birthdate date,                   -- demographics + age check
  add column if not exists instagram_handle text,            -- sin @, ej. 'juanesp_padel'
  add column if not exists dominant_hand dominant_hand,
  add column if not exists favorite_position court_position,
  add column if not exists playing_since_year smallint,      -- ej. 2019
  add column if not exists marketing_opt_in boolean not null default false;

-- Constraints sutiles (no trip a usuarios viejos)
alter table public.profiles
  drop constraint if exists phone_format;
alter table public.profiles
  add constraint phone_format check (phone is null or phone ~ '^[+0-9 ()-]{7,20}$');

alter table public.profiles
  drop constraint if exists birthdate_reasonable;
alter table public.profiles
  add constraint birthdate_reasonable check (
    birthdate is null or (birthdate > '1920-01-01' and birthdate < current_date - interval '5 years')
  );

alter table public.profiles
  drop constraint if exists playing_since_reasonable;
alter table public.profiles
  add constraint playing_since_reasonable check (
    playing_since_year is null or (playing_since_year >= 1990 and playing_since_year <= extract(year from current_date))
  );

alter table public.profiles
  drop constraint if exists instagram_handle_format;
alter table public.profiles
  add constraint instagram_handle_format check (
    instagram_handle is null or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'
  );

-- Indices para queries de marketing (segmentación por edad, ciudad, etc.)
create index if not exists profiles_birthdate_idx on public.profiles (birthdate);
create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists profiles_marketing_optin_idx on public.profiles (marketing_opt_in)
  where marketing_opt_in = true;

comment on column public.profiles.phone is 'Teléfono para premios y notificaciones críticas. Opcional pero recomendado.';
comment on column public.profiles.birthdate is 'Fecha de nacimiento. Usado para segmentación demográfica de sponsors.';
comment on column public.profiles.instagram_handle is 'Handle de Instagram sin el @. UGC + tagging en stories de torneos.';
comment on column public.profiles.marketing_opt_in is 'Consentimiento explícito para recibir promos de sponsors. Default false (opt-in).';
