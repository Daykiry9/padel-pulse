-- PadelKing — Fix infinite recursion en RLS de profiles
--
-- La policy "super admin reads all profiles" (introducida en
-- 20260523120000_security_hardening.sql) subquerea public.profiles
-- desde una policy sobre la misma tabla. Postgres re-evalúa las
-- policies SELECT de profiles dentro del subquery, lo cual dispara
-- ERROR 42P17 — "infinite recursion detected in policy for relation
-- profiles". Cualquier SELECT/UPDATE/DELETE a profiles falla.
--
-- Fix: wrappear la verificación en una función SECURITY DEFINER
-- que corre como owner y bypassea RLS. La policy entonces invoca
-- la función en vez de subquerear la tabla directamente.

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_super_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.is_super_admin is
  'Retorna true si el caller (auth.uid()) es super admin. SECURITY DEFINER para evitar recursión en policies de profiles.';

-- Permisos: cualquier authenticated puede llamarla (la respuesta
-- es solo sobre sí mismo, no expone info de otros).
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated, service_role;

-- Recrear la policy usando la función
drop policy if exists "super admin reads all profiles" on public.profiles;
create policy "super admin reads all profiles" on public.profiles for select
  using (public.is_super_admin());
