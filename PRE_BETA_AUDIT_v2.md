## PadelKing — Pre-Beta Audit · v2

> Fecha: 2026-05-23 · Branch: main · Cambios desde v1: aplicada migración `20260523120000_security_hardening.sql` + refactor de server actions a service role + RPC atómica para ELO.

---

## RESUMEN EJECUTIVO

**Veredicto:** ⚠️ **Casi listo para Gabriel — pendiente de aplicar la migración en producción y verificar.**

Bloque 1 (Seguridad) cerrado a nivel de código. Una vez que el user aplique la migración + corra `SECURITY_VERIFICATION.md` con ✅ en los 6 ítems, queda solo el bloque manual (mobile real + humano no-tech).

### Cambios resueltos

| # | Bloqueante v1 | Estado v2 | Cómo se cerró |
|---|---------------|-----------|---------------|
| C1 | profiles public read PII | ✅ Cerrado | Vista `profiles_public` (columnas seguras, security_invoker=off) + policy `profiles self read` + policy super_admin |
| C2 | invitation_tokens enumerables | ✅ Cerrado | Policy `creator reads own invitations` + redeem via service role |
| C3 | community_members bypass | ✅ Cerrado | Drop policy "users can join" + inserts via service role en redeem/decideJoinRequest |
| C4 | team_members bypass | ✅ Cerrado | Drop policy ALL + 2 policies (UPDATE/DELETE self) + inserts via service role en createTeam/redeem |
| C5 | ELO re-aplicado | ✅ Cerrado | Columna `matches.elo_applied_at` + guard `if (eloAlreadyApplied) skip` + UPDATE post-aplicación |
| C6 | Race condition ELO | ✅ Cerrado | RPC `apply_elo_delta(profile_id, delta, match_id)` con `SELECT FOR UPDATE` (lock atómico) |
| — | Service role rotada | ✅ Confirmado por user | Step 0 manual completado antes de esta sesión |

---

## FASE 1 — HEALTH CHECK

| Comando | v1 | v2 |
|---------|-----|------|
| `pnpm typecheck` | ✅ | ✅ (4/4 packages) |
| `pnpm build` | ✅ | ✅ (25 rutas, 28s) |
| `pnpm test` (vitest domain) | ✅ 31/31 | ✅ 31/31 |
| `pnpm lint` | ❌ (eslint missing) | ❌ igual (deuda no crítica) |

### Sweep estático v2

| Categoría | v1 | v2 |
|-----------|-----|-----|
| TODO/FIXME | 0 | 0 |
| `console.log` en prod | 0 | 0 |
| `as any` justificados | 10 | **~16** (subió por cast temporal a `profiles_public` mientras los types remotos se regeneran post-migración aplicada) |
| `@ts-ignore` | 0 | 0 |

### Acción pendiente (no bloqueante)

Tras aplicar la migración en remoto, regenerar `database.types.ts` y eliminar los casts temporales:

```bash
pnpm --filter @padelking/supabase gen:types
```

Luego sustituir los `(supabase as any).from('profiles_public')` por la llamada tipada normal en:
- `apps/web/src/app/api/search/route.ts`
- `apps/web/src/app/players/[id]/page.tsx`
- `apps/web/src/app/tournaments/[slug]/page.tsx`
- `apps/web/src/app/tournaments/[slug]/live/page.tsx`
- `apps/web/src/components/tournament-chat.tsx`

---

## FASE 2 — RLS AUDIT (re-run)

### Cambios en la matriz de policies

| Tabla | Antes | Ahora | Δ |
|-------|-------|-------|---|
| profiles | 🔴 public read | 🟢 self read + super_admin read | ✅ |
| invitation_tokens | 🔴 public read | 🟢 creator read only | ✅ |
| community_members | 🔴 self INSERT (bypass) | 🟢 INSERT solo via service role | ✅ |
| team_members | 🔴 self ALL (bypass) | 🟢 self UPDATE/DELETE, INSERT solo via service role | ✅ |

### Nuevos artefactos

- **Vista `public.profiles_public`** (security_invoker=off): 14 columnas seguras + SELECT a anon/authenticated.
- **Función `public.apply_elo_delta`** (SECURITY DEFINER): atómica, SELECT FOR UPDATE, REVOKE FROM PUBLIC + GRANT a service_role.
- **Columna `public.matches.elo_applied_at`**: timestamp de idempotencia.

### Hallazgos amarillos remanentes (no bloqueantes)

Sin cambios respecto a v1 — agendados para post-beta:

- A1: owner puede cambiar `tournaments.status` / `communities.status` libremente.
- A2: `community_creation_requests` no valida fundadores reales.
- A3: `assigned_category` aceptado en INSERT del propio user.
- A5: `matches` sin constraint de rango de score.
- A6: `open_matches.future_match` permite pasado de 1h.
- A7: open_matches abiertos vencidos no se autocierran.
- A8: chat_messages policy solo cubre `target_kind='tournament'`.
- A9: tournament_registrations DELETE policy duplicada.

---

## FASE 3 — LÓGICA DE DOMINIO (re-run)

| Función | v1 | v2 |
|---------|-----|------|
| americano-pairing (fixed + random) | ✅ 8 tests | ✅ 8 tests (sin cambio) |
| eligibility | ✅ 23 tests | ✅ 23 tests (sin cambio) |
| **elo.ts** | ❌ 0 tests | ⚠️ 0 tests aún, pero **nuevo helper `computePaddleEloDeltas`** agregado para usar con RPC atómica |
| points.ts | ❌ 0 tests | ⚠️ sin cambios |

### C5 — fix verificado en código

[apps/web/src/lib/tournament-actions.ts](apps/web/src/lib/tournament-actions.ts):

```ts
// Antes del UPDATE: capturar elo_applied_at previo
const { data: prevData } = await supabase
  .from('matches')
  .select('status, elo_applied_at')
  .eq('id', matchId)
  .maybeSingle();
const eloAlreadyApplied = Boolean(prevMatch?.elo_applied_at);

// Bloque ELO solo si NO se aplicó antes:
if (isCompleted && matchData && !eloAlreadyApplied) {
  // ... ELO via apply_elo_delta RPC ...

  // Marcar idempotencia
  await admin.from('matches')
    .update({ elo_applied_at: new Date().toISOString() })
    .eq('id', matchId);
}
```

### C6 — RPC atómica

[supabase/migrations/20260523120000_security_hardening.sql](supabase/migrations/20260523120000_security_hardening.sql):

```sql
create or replace function public.apply_elo_delta(...)
  language plpgsql security definer ...
as $$
declare v_before int; v_after int;
begin
  select elo_rating into v_before from public.profiles
   where id = p_profile_id for update;   -- ← lock atómico
  v_after := greatest(200, least(3500, v_before + p_delta));
  update public.profiles set elo_rating = v_after where id = p_profile_id;
  insert into public.elo_history (...) values (...);
  return v_after;
end; $$;
```

Cada llamada al RPC se serializa por jugador. Dos matches concurrentes con un jugador en común ya no pierden updates.

### Casos edge aún sin test (deuda, no bloqueante)

- `computePaddleEloDeltas`: empate, gap >500, primer match. **Sugerencia post-beta:** agregar `elo.spec.ts`.
- `pointsForPosition` position > 8.
- `decayedPoints` elapsed > window.
- Generación de bracket de eliminación: sigue sin existir el código pese a estar en el enum. **Acción pre-Gabriel:** confirmar con coach que el primer torneo es americano (no eliminación) o stubear el formato del UI.

---

## FASE 4 — DATA INTEGRITY (re-run)

Las 13 queries SQL del v1 siguen vigentes. Adicionalmente, las queries de verificación del Bloque 1 están en [SECURITY_VERIFICATION.md](SECURITY_VERIFICATION.md):

| Query | Pre-migración | Post-migración esperada |
|-------|---------------|-------------------------|
| C1 attack (read phone cross-user) | retorna rows | 0 rows |
| C2 attack (enum invitation_tokens) | retorna todos | solo mis invites |
| C3 attack (insert community_members) | éxito | ERROR RLS |
| C4 attack (insert team_members) | éxito | ERROR RLS |
| C5 attack (re-aplicar ELO) | suma deltas duplicados | sin nuevas rows en elo_history |
| C6 verify (apply_elo_delta exists) | n/a | row con prosecdef=true |

---

## CRITERIO DE ACEPTACIÓN para invitar a Gabriel

### Bloqueantes técnicos

- [x] C1-C6 cerrados en código
- [x] `pnpm typecheck` + `pnpm build` verdes
- [ ] **Migración aplicada en producción** (acción del user: `supabase db push` o pegar SQL en dashboard)
- [ ] **6 queries de `SECURITY_VERIFICATION.md` pasan ✅** (acción del user post-migración)
- [x] `SUPABASE_SERVICE_ROLE_KEY` rotada

### Bloqueantes operativos (no de código)

- [ ] Mobile real probado en Android y iOS (no emulador)
- [ ] Humano no-tech logra inscribirse a un torneo sin guía
- [ ] Generación de bracket `eliminacion` definida (stubeado en UI o implementado)

### No bloqueantes recomendados

- [ ] Regenerar types tras aplicar migración + limpiar casts
- [ ] Q1, Q6, Q7, Q10 del v1 corridas contra prod sin sospechosos
- [ ] Tests para `applyPaddleElo`, `computePaddleEloDeltas`, `pointsForPosition`

---

## PRÓXIMOS PASOS

1. **Tu turno:** aplicar la migración `20260523120000_security_hardening.sql` en producción.
2. **Tu turno:** correr `SECURITY_VERIFICATION.md` y marcar los 6 checks.
3. Cuando los 6 estén ✅: regenerar types + limpiar casts en una sesión rápida.
4. Después de eso, hablamos del Bloque 2 (eliminación bracket, tests del dominio para ELO, refinamientos amarillos).
5. Recién entonces: mobile real + humano no-tech, y si pasan ambos → mensaje a Gabriel.
