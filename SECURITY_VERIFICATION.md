# Security Hardening — Verificación post-migración

> Después de aplicar la migración `20260523120000_security_hardening.sql` en producción, corré estas queries en el SQL editor de Supabase para confirmar que cada bloqueante está cerrado. Anotá ✅ / ❌ al lado de cada uno.

## Pasos previos

1. Aplicar la migración: `supabase db push` (con el linked project) o pegar el contenido del archivo en el SQL editor del dashboard.
2. **Regenerar types** localmente:
   ```bash
   pnpm --filter @padelking/supabase gen:types
   ```
   Luego los `as any` de los archivos modificados pueden retirarse en una limpieza posterior.
3. Hacer redeploy en Vercel (o `vercel --prod`) para que el código nuevo agarre la migración.

---

## C1 — `profiles` no expone PII cross-user

### Ataque (antes pasaba ✅, ahora debe fallar)

Necesitas un user de prueba (no super_admin). Reemplaza `<otro-user-id>` con el id de otro user.

```sql
-- Set session as authenticated user (NO super admin)
select set_config('request.jwt.claims', '{"sub":"<mi-user-id>"}', true);
set local role authenticated;

-- Intentar leer PII de otros profiles
select id, phone, birthdate, marketing_opt_in
  from public.profiles
 where id <> '<mi-user-id>';
-- ✅ Esperado: 0 rows (la policy "profiles self read" solo permite mi fila).

-- La vista pública sigue funcionando (para display_name, etc.)
select id, display_name, city, skill_category, elo_rating
  from public.profiles_public
 limit 5;
-- ✅ Esperado: rows con columnas seguras, sin phone/birthdate.

-- Verificar que NO existe phone en la vista
select column_name from information_schema.columns
 where table_schema = 'public'
   and table_name = 'profiles_public'
   and column_name in ('phone', 'birthdate', 'marketing_opt_in');
-- ✅ Esperado: 0 rows.
```

### Confirmación bonus

Como super admin, debe poder leer phone (para `/app/admin`):

```sql
select set_config('request.jwt.claims',
  '{"sub":"<juan-super-admin-id>"}', true);
set local role authenticated;

select id, phone, display_name
  from public.profiles
 where phone is not null
 limit 3;
-- ✅ Esperado: rows (la policy "super admin reads all profiles" lo permite).
```

---

## C2 — `invitation_tokens` no enumerable

```sql
select set_config('request.jwt.claims', '{"sub":"<mi-user-id>"}', true);
set local role authenticated;

-- Intentar enumerar todos los invites
select count(*) from public.invitation_tokens;
-- ✅ Esperado: solo el count de MIS invites (los que yo creé). NO el total.

-- Intentar leer un invite por code (sin haberlo creado yo)
select * from public.invitation_tokens
 where code = '<algun-code-de-otro-user>';
-- ✅ Esperado: 0 rows.
```

El redeem sigue funcionando porque el server action usa service role (bypass RLS).

---

## C3 — `community_members` no se puede insertar sin approval

```sql
select set_config('request.jwt.claims', '{"sub":"<mi-user-id>"}', true);
set local role authenticated;

-- Intentar unirme directo a una community sin pasar por join_request
insert into public.community_members (community_id, profile_id, role)
  values ('<alguna-community-id>', '<mi-user-id>', 'member');
-- ✅ Esperado: ERROR (new row violates row-level security policy).

-- El flow correcto (request join) sigue funcionando:
insert into public.community_join_requests (community_id, profile_id, message)
  values ('<alguna-community-id>', '<mi-user-id>', 'Quiero unirme');
-- ✅ Esperado: OK. El admin de la community decide después.
```

Verificar que el trigger `on_community_created` (SECURITY DEFINER) sigue funcionando: al crear una community, su owner se inserta como member automáticamente.

```sql
-- Tras crear una community via server action, verificar membership
select profile_id, role from public.community_members
 where community_id = '<community-recien-creada>';
-- ✅ Esperado: row con role='owner' y profile_id = creator.
```

---

## C4 — `team_members` no se puede insertar sin invitación

```sql
select set_config('request.jwt.claims', '{"sub":"<mi-user-id>"}', true);
set local role authenticated;

-- Intentar unirme directo a un team random
insert into public.team_members (team_id, profile_id, invited_by)
  values ('<algun-team-id>', '<mi-user-id>', '<mi-user-id>');
-- ✅ Esperado: ERROR (new row violates row-level security policy).

-- El flow correcto (createTeam o redeem de invite) sigue funcionando via service role:
-- 1) POST /app/teams/new → team-actions.createTeam usa adminClient → OK
-- 2) GET /i/[code] (team invite) → invitation-actions.redeemInvitation usa adminClient → OK

-- Verificar que el user PUEDE salirse (DELETE policy se mantiene)
delete from public.team_members
 where profile_id = '<mi-user-id>' and team_id = '<mi-team-id>';
-- ✅ Esperado: OK (la policy "self leaves team" lo permite).
```

---

## C5 — ELO no se re-aplica en corrección de score

Reproducible vía UI (manual). Asume que tienes un torneo `in_progress` con al menos un match scheduled entre dos parejas conocidas.

1. Snapshot inicial:
   ```sql
   select id, elo_rating from public.profiles
    where id in ('<p1>', '<p2>', '<p3>', '<p4>');
   ```
   Anotá los 4 valores (digamos `E0`).

2. Reportá el match desde la UI con score `6-3`. Verificá:
   ```sql
   select profile_id, elo_before, elo_after, delta
     from public.elo_history
    where match_id = '<match-id>';
   ```
   ✅ Esperado: 4 rows, cada una con `elo_after = elo_before + delta_correcto`.

   ```sql
   select id, elo_applied_at from public.matches where id = '<match-id>';
   ```
   ✅ Esperado: `elo_applied_at` con timestamp reciente.

3. Snapshot después de primer reporte (`E1`):
   ```sql
   select id, elo_rating from public.profiles
    where id in ('<p1>', '<p2>', '<p3>', '<p4>');
   ```

4. **Corregir** el score desde la UI a `6-4`. Verificá:
   ```sql
   -- elo_history NO debe tener nuevas rows
   select count(*) from public.elo_history where match_id = '<match-id>';
   ```
   ✅ Esperado: sigue siendo 4 (no se sumaron 4 más).

   ```sql
   -- ratings no cambiaron
   select id, elo_rating from public.profiles
    where id in ('<p1>', '<p2>', '<p3>', '<p4>');
   ```
   ✅ Esperado: idénticos a `E1`. El delta del segundo reporte no se aplicó.

### Detección automatizada de la regresión

```sql
-- Si hubiera bug, los matches tendrían > 1 row por (profile, match) en elo_history
select match_id, profile_id, count(*) as inserts
  from public.elo_history
 group by match_id, profile_id
having count(*) > 1
limit 10;
-- ✅ Esperado: 0 rows.
```

---

## C6 — ELO atómico (sin race condition)

Verificación es difícil de simular sin script de concurrencia. La prueba indirecta:

```sql
-- Verificar que la función existe y está blindada
select proname, prosecdef, pg_get_function_identity_arguments(oid) as args
  from pg_proc
 where proname = 'apply_elo_delta'
   and pronamespace = 'public'::regnamespace;
-- ✅ Esperado: 1 row, prosecdef = true (SECURITY DEFINER).

-- Verificar permisos: solo service_role puede ejecutar
select grantee, privilege_type
  from information_schema.routine_privileges
 where routine_name = 'apply_elo_delta'
   and specific_schema = 'public';
-- ✅ Esperado: SOLO 2 rows — postgres (owner) + service_role.
-- ❌ Si aparecen `anon` o `authenticated`, hay que revokear:
--    revoke execute on function public.apply_elo_delta(uuid, int, uuid)
--      from anon, authenticated, public;
```

> **Nota crítica para aplicadores manuales en SQL Editor:**
>
> En Supabase, `anon` y `authenticated` **NO son miembros del rol `PUBLIC`**.
> Tienen grants explícitos por default. `REVOKE ALL FROM public` no los toca.
>
> La función `apply_elo_delta` es `SECURITY DEFINER`, así que si `anon` o
> `authenticated` mantienen EXECUTE, cualquier user autenticado puede inflar
> su ELO desde DevTools llamando al RPC directamente.
>
> La migración ya incluye `revoke ... from public, anon, authenticated` para
> instalaciones limpias. Pero si aplicaste por chunks en SQL Editor antes
> del fix, verificá los grantees y corré el revoke explícito si hace falta.

Test de concurrencia (opcional, en psql):

```sql
-- Terminal 1
begin;
select public.apply_elo_delta('<p1>', 30, gen_random_uuid());
-- (no commit aún)

-- Terminal 2 (otro psql session)
select public.apply_elo_delta('<p1>', -30, gen_random_uuid());
-- ✅ Esperado: BLOQUEADO hasta que terminal 1 commit. Entonces aplica sobre el ELO ya actualizado.
-- ANTES (sin FOR UPDATE): los dos leían el mismo elo_before, uno sobrescribía al otro.
```

### Detección automatizada de drift acumulado

```sql
-- Suma de deltas debe coincidir con elo_rating - 1000 (inicial)
with by_profile as (
  select profile_id,
         sum(delta) as total_delta,
         max(elo_after) as latest_elo
    from public.elo_history
   group by profile_id
)
select bp.profile_id, p.elo_rating, bp.total_delta,
       1000 + bp.total_delta as expected,
       p.elo_rating - (1000 + bp.total_delta) as drift
  from by_profile bp
  join public.profiles p on p.id = bp.profile_id
 where abs(p.elo_rating - (1000 + bp.total_delta)) > 0
 limit 10;
-- ✅ Esperado: 0 rows. Cualquier row = drift = bug confirmado.
```

---

## Resumen de verificación

| Bloqueante | Query | Resultado esperado |
|------------|-------|--------------------|
| C1 | SELECT phone FROM profiles WHERE id ≠ self | 0 rows |
| C2 | SELECT * FROM invitation_tokens (sin code mío) | solo mis invites |
| C3 | INSERT INTO community_members (cross-user) | ERROR RLS |
| C4 | INSERT INTO team_members (cross-user) | ERROR RLS |
| C5 | count(elo_history) tras corregir score | sin nuevas rows |
| C6 | proname='apply_elo_delta' + prosecdef=true | row presente |

Cuando los 6 estén ✅, podemos proceder a STEP 4 (re-run del PRE_BETA_AUDIT).
