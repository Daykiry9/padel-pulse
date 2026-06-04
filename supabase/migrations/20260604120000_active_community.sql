-- ============================================================
-- Active Community on profiles
-- ============================================================
-- Agrega `active_community_id` en profiles como SOURCE OF TRUTH para
-- saber en qué comunidad está operando el usuario en la app multi-community.
--
-- Reglas:
--  - Nullable + ON DELETE SET NULL (si la comunidad se elimina, el user queda sin activa).
--  - Backfill desde profiles.primary_community_id si existe.
--  - Trigger: cuando se elimina una row de community_members (user leaves),
--    si esa community era la activa del user, intenta fallback a otra
--    membership o setea NULL.
--  - Validation trigger BEFORE UPDATE: el active_community_id debe corresponder
--    a una membership real del user (community_members).
--  - RLS UPDATE policy ya existente ("users can update their own profile")
--    cubre el self-write; no agregamos policy nueva.
-- ============================================================

-- 1. Columna
alter table public.profiles
  add column if not exists active_community_id uuid
    references public.communities(id) on delete set null;

-- 2. Backfill desde primary_community_id (si existe en profiles)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'primary_community_id'
  ) then
    execute $sql$
      update public.profiles
         set active_community_id = primary_community_id
       where primary_community_id is not null
         and active_community_id is null
    $sql$;
  end if;
end$$;

-- Fallback adicional: si no tiene active, asignar el primer community_members
-- (joined_at asc) — útil para profiles que sí tienen membership pero ningún primary.
update public.profiles p
   set active_community_id = sub.community_id
  from (
    select distinct on (cm.profile_id)
      cm.profile_id,
      cm.community_id
    from public.community_members cm
    order by cm.profile_id, cm.joined_at asc
  ) sub
 where sub.profile_id = p.id
   and p.active_community_id is null;

-- 3. Index parcial (skip nulls)
create index if not exists profiles_active_community_idx
  on public.profiles (active_community_id)
  where active_community_id is not null;

-- 4. Validation trigger: el active_community_id debe ser una membership real
create or replace function public.validate_profile_active_community()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo validar si está siendo seteado a no-null y cambió respecto al valor previo
  if new.active_community_id is not null
     and (tg_op = 'INSERT' or new.active_community_id is distinct from old.active_community_id) then
    if not exists (
      select 1
        from public.community_members cm
       where cm.profile_id = new.id
         and cm.community_id = new.active_community_id
    ) then
      raise exception 'active_community_id % no corresponde a una membership del usuario %',
        new.active_community_id, new.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_validate_active_community on public.profiles;
create trigger profiles_validate_active_community
  before insert or update of active_community_id on public.profiles
  for each row execute procedure public.validate_profile_active_community();

-- 5. Trigger sobre community_members: si el user sale de la comunidad activa,
--    intentar fallback a otra membership o setear NULL.
create or replace function public.handle_community_member_left()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_id uuid;
begin
  -- Buscar otra membership del mismo profile (excluyendo la que se acaba de borrar)
  select cm.community_id
    into fallback_id
    from public.community_members cm
   where cm.profile_id = old.profile_id
     and cm.community_id <> old.community_id
   order by cm.joined_at asc
   limit 1;

  update public.profiles
     set active_community_id = fallback_id
   where id = old.profile_id
     and active_community_id = old.community_id;

  return old;
end;
$$;

drop trigger if exists community_members_after_delete_clear_active on public.community_members;
create trigger community_members_after_delete_clear_active
  after delete on public.community_members
  for each row execute procedure public.handle_community_member_left();
