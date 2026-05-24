## PadelKing — Pre-Beta Audit

> Fecha: 2026-05-23 · Branch: main · Commit: 369c1d7
> Objetivo: identificar bugs críticos y deuda técnica antes de invitar a Gabriel y comunidad real (16 jugadores).

---

## RESUMEN EJECUTIVO

**Veredicto:** ❌ **NO listos para Gabriel todavía.** Bloqueantes: 6 issues críticos de privacidad y lógica de negocio + rotación pendiente de `SUPABASE_SERVICE_ROLE_KEY`.

### Top 5 issues críticos (bloqueantes para beta)

| # | Severidad | Issue | Archivo |
|---|-----------|-------|---------|
| C1 | 🔴🔴 | `profiles` con `select using (true)` expone teléfono + fecha nacimiento + instagram a TODOS los authenticated | [init.sql:172](supabase/migrations/20260520000000_init.sql#L172) |
| C3 | 🔴 | `community_members` permite INSERT directo, bypassea `community_join_requests` y aprobación con `assigned_category` | [init.sql:204](supabase/migrations/20260520000000_init.sql#L204) |
| C4 | 🔴 | `team_members` permite que cualquiera se inserte en cualquier team sin invitación | [expansion.sql:369](supabase/migrations/20260520200000_padelking_expansion.sql#L369) |
| C5 | 🔴 | ELO se re-aplica si el organizador corrige un score — ratings drift, elo_history duplicado | [tournament-actions.ts:319-503](apps/web/src/lib/tournament-actions.ts#L319-L503) |
| — | 🔴 | `SUPABASE_SERVICE_ROLE_KEY` pendiente de rotar (expuesto pre-público en 16 commits) | Supabase dashboard |

### Top 10 issues serios (no bloqueantes pero importantes)

| # | Severidad | Issue |
|---|-----------|-------|
| C2 | 🟠 | `invitation_tokens` enumerables — destruye el modelo de invite-only |
| C6 | 🟠 | Race condition en updates de ELO simultáneos |
| A1 | 🟡 | Owner puede cambiar `tournaments.status` y `communities.status` libremente |
| A2 | 🟡 | `community_creation_requests` no valida que los fundadores sean reales |
| A3 | 🟡 | `assigned_category` puede venir del INSERT del propio user en join_requests |
| A5 | 🟡 | `matches` sin constraint de rango de score |
| A7 | 🟡 | Open matches abiertos vencidos no se autocierran (sin cron) |
| — | 🟡 | `lint` falla por `eslint` no instalado en `packages/domain` y `packages/supabase` |
| — | 🟡 | `database.types.ts` desactualizado (4 migraciones nuevas) → 10 `as any` casts |
| — | 🟡 | `eliminacion` está en enum pero sin código que genere bracket |

### Recomendación de orden de fixes (1-2 sesiones)

**Bloque 1 — Seguridad/Privacidad (NO se puede saltar):**
1. **Rotar `SUPABASE_SERVICE_ROLE_KEY`** desde el dashboard de Supabase. Actualizar `.env.local` y Vercel env vars.
2. **Migración nueva** que arregle:
   - C1: drop `profiles are public read`; crear vista `profiles_public`; cambiar todas las queries del cliente a la vista.
   - C2: drop `invitations are public read`; mover redeem a server action con service role.
   - C3: drop `users can join communities`; insert via service role en `decideJoinRequest`.
   - C4: restringir `team_members` INSERT a token de invitación o service role.
3. Regenerar `database.types.ts` (`supabase gen types typescript`) y eliminar los 10 `as any`.

**Bloque 2 — Bugs de lógica (alto impacto en primer torneo):**
4. C5: en `reportMatchScore`, check `if (matchData.previous_status === 'completed') return` antes de aplicar ELO. O agregar columna `matches.elo_applied_at`.
5. C6: wrap ELO updates en una transacción con `UPDATE ... SET elo_rating = elo_rating + $delta` atómico.
6. Si Gabriel piensa usar formato `eliminacion`: implementar `generateEliminationBracket` o eliminar la opción del UI.

**Bloque 3 — Higiene (opcional pero recomendado pre-beta):**
7. Instalar `eslint` y plugins en `packages/domain` y `packages/supabase` para que `pnpm lint` pase clean.
8. Limpiar 3 imports no usados (`Search`, `Avatar`, `redirect`, `Users`).
9. Migrar [americano.test.ts](packages/domain/src/tournament/americano.test.ts) a `.spec.ts` con asserts de vitest.
10. Agregar tests para `applyPaddleElo` (empate, gap > 500), `pointsForPosition` (position > 8), `decayedPoints` (elapsed > window).

**Bloque 4 — Después de Gabriel (post-beta):**
- A1-A7: refinar policies y agregar cron de cierre de open_matches.
- Configurar Sentry / Logflare para captura de errores en prod.
- Suite Playwright e2e para los 8 flujos del prompt original.

### Criterio de aceptación para invitar a Gabriel

- [ ] Bloque 1 completo (C1-C4 cerrados + service_role rotado).
- [ ] C5 cerrado (Bloque 2.4).
- [ ] Q1, Q6, Q7, Q10 corridas contra prod sin sospechosos.
- [ ] Testing manual en mobile real (Android + iOS, no emulador).
- [ ] Al menos 1 humano no-tech logró inscribirse a un torneo sin guía.

Cuando los 5 checks anteriores estén ✅, podemos enviar el mensaje a Gabriel.

---

## FASE 1 — HEALTH CHECK DEL CÓDIGO

### Comandos

| Comando        | Resultado | Notas |
|----------------|-----------|-------|
| `pnpm typecheck` | ✅ PASS | 4/4 packages, 23.5s |
| `pnpm build`     | ✅ PASS | Web 25 rutas, 1m6s |
| `pnpm lint`      | ❌ FAIL | `eslint` no instalado en `packages/domain` y `packages/supabase`. **No es bug del código** — falta dependencia local. Sólo afecta CI/dev. |
| `pnpm test`      | ⚠️ NO-OP | `turbo.json` no declara task `test`. Corriendo vitest directo: **31/31 tests pasan** (`americano-pairing.spec.ts` 8 + `eligibility.spec.ts` 23). |

### Sweep estático

| Categoría | Hallazgo |
|-----------|----------|
| TODO/FIXME/HACK/XXX | **0** en `apps/web/src` y `packages/` |
| `console.log` en prod | **0** en `apps/web/src`. Solo en `scripts/*.mjs` (seed/generación, intencionales). |
| `: any` / `as any` | **10 ocurrencias** — todas justificadas por tablas nuevas no en `database.types.ts` (chat_messages, open_matches, etc.). |
| `@ts-ignore` / `@ts-expect-error` | **0** |
| Imports rotos | 0 errores de compilación |
| Imports no usados | 3 warnings: `Search` ([communities/page.tsx:2](apps/web/src/app/app/communities/page.tsx#L2)), `Avatar` ([matches/page.tsx:8](apps/web/src/app/app/matches/page.tsx#L8)), `redirect`/`Users` ([app/page.tsx:2,12](apps/web/src/app/app/page.tsx#L2)) |

### Archivos grandes (>400 líneas)

| Archivo | Líneas | Comentario |
|---------|--------|------------|
| `packages/supabase/src/database.types.ts` | 2141 | Generado, OK |
| [apps/web/src/app/page.tsx](apps/web/src/app/page.tsx) | 567 | Landing pública — candidato a split en secciones |
| [apps/web/src/lib/tournament-actions.ts](apps/web/src/lib/tournament-actions.ts) | 510 | Server actions del torneo — refactor opcional |
| [apps/web/src/app/app/page.tsx](apps/web/src/app/app/page.tsx) | 473 | Dashboard, dentro de límite razonable |
| [apps/web/src/app/queens/page.tsx](apps/web/src/app/queens/page.tsx) | 465 | Espejo de landing, mismo split aplicaría |
| [apps/web/src/app/tournaments/[slug]/page.tsx](apps/web/src/app/tournaments/[slug]/page.tsx) | 445 | Tournament detail |
| [apps/web/src/app/players/[id]/page.tsx](apps/web/src/app/players/[id]/page.tsx) | 410 | Player profile público |

### `as any` casts (detalle)

```
chat-actions.ts:24
open-match-actions.ts:47,48,94,95,155,156,194
tournaments/[slug]/page.tsx:195
app/matches/page.tsx:62
```

**Root cause:** `database.types.ts` no regenerado tras 4 últimas migraciones (`open_matches`, `chat_messages`, `community_*`, `invitations`).
**Acción:** regenerar con `supabase gen types typescript` antes de Gabriel.

### Tests existentes pero NO ejecutados por vitest

- [packages/domain/src/tournament/americano.test.ts](packages/domain/src/tournament/americano.test.ts) — comentario interno dice "Suite manual… cuando agreguemos vitest, mover a .spec.ts". Sigue siendo manual. Lo marca el código mismo: TODO técnico pendiente.

### Resumen Fase 1

✅ El código compila y tipa sin errores. No hay TODOs/console.log/ts-ignore acumulados. Casts a `any` son trazables a una sola causa (types desactualizados).
⚠️ Lint roto por config local, no por código.
⚠️ Tests existentes son mínimos (solo dominio puro). 0 tests de RLS, 0 tests de server actions, 0 tests e2e.

---

## FASE 2 — SCHEMA Y RLS AUDIT

### Tablas inventariadas (33 tablas + 5 vistas)

| Tabla | RLS | SELECT | INSERT | UPDATE | DELETE | Flag |
|-------|-----|--------|--------|--------|--------|------|
| profiles | ✅ | **public read TODO** | self | self | (none) | 🔴 |
| communities | ✅ | public | self owner | owner/admin | owner | 🟡 |
| community_members | ✅ | public | **self join (bypass approval)** | admin | self | 🔴 |
| clubs | ✅ | public | self owner | owner | (none) | 🟢 |
| tournaments | ✅ | public | club_owner | club_owner | club_owner | 🟢 |
| tournament_registrations | ✅ | public | team_member \| ad-hoc \| individual | (none) | self/team | 🟡 |
| matches | ✅ | public | club_owner | participants/owner | club_owner | 🟢 |
| cities | ✅ | public | (none) | (none) | (none) | 🟢 |
| categories | ✅ | public | (none) | (none) | (none) | 🟢 |
| club_communities | ✅ | public | club_owner/community_admin | (none) | (none) | 🟢 |
| teams | ✅ | public | community_member | team_member | (none) | 🟡 |
| team_members | ✅ | public | **self insert (bypass invite)** | self | self | 🔴 |
| sponsors | ✅ | public | (none, service role) | (none) | (none) | 🟢 |
| tournament_sponsors | ✅ | public | club_owner | club_owner | club_owner | 🟢 |
| notifications | ✅ | self | (service role) | self read-mark | (none) | 🟢 |
| team_points | ✅ | public | (service role) | (none) | (none) | 🟢 |
| player_points | ✅ | public | (service role) | (none) | (none) | 🟢 |
| category_change_suggestions | ✅ | self/community_admin | (service role) | community_admin | (none) | 🟢 |
| invitation_tokens | ✅ | **public read TODOS** | self creator | self creator | self creator | 🔴 |
| elo_history | ✅ | public | (service role only) | (none) | (none) | 🟢 |
| community_creation_requests | ✅ | self/super_admin | self | super_admin | (none) | 🟡 |
| community_join_requests | ✅ | self/community_admin | self | community_admin | (none) | 🟢 |
| open_matches | ✅ | public | self host | host | host | 🟢 |
| open_match_participants | ✅ | public | self | (none) | self or host | 🟢 |
| chat_messages | ✅ | tournament_participant/owner | tournament_participant/owner | (none) | self author | 🟢 |

### 🔴 Hallazgos críticos

#### C1. `profiles` expone PII de todos los usuarios autenticados

```sql
-- migrations/20260520000000_init.sql:172
create policy "profiles are public read"
  on public.profiles for select using (true);
```

La migración [20260521170000_profile_extended_fields.sql](supabase/migrations/20260521170000_profile_extended_fields.sql) agregó **phone, birthdate, instagram_handle, marketing_opt_in** al mismo `profiles`. Estos campos se sirven con la policy de "public read", por lo que **cualquier usuario autenticado puede correr `select phone, birthdate from profiles`** y exfiltrar contactos de toda la base.

El comentario de la columna `phone` dice _"Teléfono para premios y notificaciones críticas"_ — claramente no pensado como público.

También expuestos por la misma policy:
- `is_super_admin` (un user puede enumerar admins)
- `elo_rating` (OK público, deportivo)
- `skill_category`, `gender` (probablemente OK)

**Impacto:** privacidad. Cuando Gabriel + 16 jugadores entren con datos reales, cualquiera de ellos podrá scrapear teléfonos.

**Fix sugerido (NO ahora):**
- Crear vista `public.profiles_public` con solo columnas seguras (id, display_name, avatar_url, city, skill_category, elo_rating, gender).
- Revocar SELECT en `profiles` y dejar solo `select on profiles where id = auth.uid()` (yo veo lo mío).
- Apuntar todas las queries del cliente a `profiles_public`. Players in common, ranking, etc. ya solo necesitan los campos seguros.

#### C2. `invitation_tokens` listables por cualquier authenticated

```sql
-- migrations/20260521180000_invitations.sql:41
create policy "invitations are public read"
  on public.invitation_tokens for select using (true);
```

Comentario justifica _"cualquiera con el link debe poder ver el invite para resolverlo"_, pero la policy permite `select * from invitation_tokens` y enumerar **todos los códigos activos sin tener el link**.

**Impacto:** un user malicioso puede listar todos los invites pendientes (a torneos, teams o comunidades) y unirse a cualquiera. Esto destruye el modelo de invitación.

**Fix sugerido:**
- Cambiar lectura a `select` solo cuando el `code` viene en filtro (no se puede expresar en RLS directamente).
- Alternativa: mover redeem a server action que use service role para leer por code; revocar SELECT a authenticated.

#### C3. `community_members` se puede insertar sin pasar por `community_join_requests`

```sql
-- migrations/20260520000000_init.sql:204
create policy "users can join communities"
  on public.community_members for insert with check (auth.uid() = profile_id);
```

El flujo de aprobación [20260522100000_community_approval_flow.sql](supabase/migrations/20260522100000_community_approval_flow.sql) montó `community_join_requests` y RLS para que el owner apruebe — pero **la policy vieja de `community_members` sigue activa**, permitiendo que cualquier user authenticado se inserte directo a cualquier community.

**Impacto:** el flujo de approval (con `assigned_category`) que diseñaste es completamente bypassable.

**Fix sugerido:**
- Drop policy `users can join communities`.
- Hacer que el server action de approval inserte con service role.

#### C4. `team_members` se puede insertar sin invitación

```sql
-- migrations/20260520200000_padelking_expansion.sql:369
create policy "users manage their own team_member rows"
  on public.team_members for all using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
```

`for all` cubre INSERT/UPDATE/DELETE. **Cualquier authenticated puede insertarse a cualquier `team_id` siempre que `profile_id = auth.uid()`**. No hay validación de invitación o de que el team realmente lo invitó.

**Impacto:** spam y joins no consentidos. Un user puede agregarse a teams de jugadores famosos para inflar su perfil.

**Fix sugerido:**
- Restringir INSERT a casos: (a) el caller es `invited_by` de una row existente, o (b) la inserción viene con un `invitation_token` válido. La validación más simple es service role + invitation flow.

### 🟡 Hallazgos amarillos (no bloqueantes)

#### A1. `communities` — owner puede cambiar `status` directamente

`owners and admins can update community` no restringe columnas. Un owner puede `update communities set status='active' where id = mine` y bypassear el flujo de creación si pasa por la migración con status='pending'.

**Mitigación parcial:** la migración actual setea default a `'active'`, así que comunidades nuevas vía server action salen activas a menos que el código las marque pending. Hoy no es explotable, pero queda como deuda.

#### A2. `community_creation_requests` no valida fundadores reales

```sql
constraint min_5_founders check (jsonb_array_length(founding_members) >= 5)
```

Solo cuenta. Nada valida que los 5 sean profiles reales ni que el caller esté incluido. Un user puede meter 5 nombres random + email random y pasar el check.

**Mitigación:** lo cubre el super-admin manualmente al revisar.

#### A3. `community_join_requests.assigned_category` se permite en INSERT

La policy INSERT no restringe qué columnas vienen, así que el caller podría auto-asignarse `assigned_category` al pedir join. Si el admin no la sobrescribe al aprobar, queda como la pidió el user.

**Verificar:** server action `requestJoinCommunity` — debe stripear `assigned_category` antes de insertar.

#### A4. `tournaments` — el club owner puede revivir torneos `finished` a `open`

`club owners can manage tournaments for all` no restringe transiciones de estado. Posible inconsistencia con ELO ya aplicado, etc.

#### A5. `matches` — no hay validación de score range

Score puede ser cualquier int (incluso negativo). No hay constraint `score_one between 0 and 99`. Si la UI lo previene, OK; si alguien lo bypasea por API, queda data inválida.

#### A6. `open_matches.future_match` permite pasado de 1h

```sql
constraint future_match check (scheduled_at > created_at - interval '1 hour')
```

Permite crear matches con fecha pasada hasta 1h atrás. Probablemente intencional para tolerancia de reloj, pero raro.

#### A7. Open matches abiertos vencidos no se autocierran

No hay cron/trigger que cierre `open_matches` con `scheduled_at < now() AND status = 'open'`. Quedan "abiertos" siempre. Esto va a Fase 4 (queries).

#### A8. `chat_messages` policy SELECT/INSERT solo cubre `target_kind = 'tournament'`

Si en el futuro habilitas `match` o `community` chat, hay que agregar policies análogas. Hoy bloqueado por default (deny). OK pero hay que recordarlo.

#### A9. `tournament_registrations` DELETE policy doble

Hay dos delete policies: "team members can cancel registration" (de v2) y "self cancel adhoc registration" (de v4). RLS hace OR, así que efecto es: te puedes salir si eres parte del team o eres uno de los players. OK pero las policies acumuladas son ruido — vale revisar duplicados.

### 🟢 Áreas bien resueltas

- `notifications` correctamente restringe SELECT/UPDATE a `auth.uid() = profile_id`.
- `elo_history` lectura pública (deportivo) + INSERT solo via service role.
- `chat_messages` policy bien diseñada (participantes confirmados + organizador).
- `open_matches` policy de delete del participant correctamente permite "self o host".
- Service role usado solo en server actions justificados:
  - `tournament-actions.ts:430` (probable: crear notifications a otros).
  - `community-approval-actions.ts:131,324` (aprobar requests).
  - `open-match-actions.ts:48,95,156` (modificar contadores y notify).
  - `notification-actions.ts:32,44` (cross-user notify).

### Funciones SECURITY DEFINER

Solo 2, ambas en init.sql:172,141:
- `handle_new_user` — inserta en profiles para el `new.id` (auth.users trigger). `set search_path = public`. ✅ seguro.
- `add_owner_as_member` — inserta el owner como member tras crear community. `set search_path = public`. ✅ seguro.

Ningún SECURITY DEFINER nuevo en migraciones posteriores. OK.

### Resumen Fase 2

🔴 **4 issues críticos de privacidad/seguridad** (C1-C4) que se deben fixear antes de invitar a Gabriel:
1. PII de profiles expuesta (teléfono, fecha nacimiento).
2. Invitation_tokens enumerables.
3. Bypass del approval de comunidades vía community_members directo.
4. Cualquier user se mete a cualquier team sin invitación.

🟡 9 hallazgos amarillos no bloqueantes, agendar para post-beta.

---

## FASE 3 — LÓGICA DE DOMINIO

### Funciones core auditadas

| Archivo | LOC | Tests | Cobertura estimada |
|---------|-----|-------|--------------------|
| [packages/domain/src/tournament/americano-pairing.ts](packages/domain/src/tournament/americano-pairing.ts) | 250 | ✅ 8 tests | ~70% — buenos casos, faltan edges |
| [packages/domain/src/categories/eligibility.ts](packages/domain/src/categories/eligibility.ts) | 210 | ✅ 23 tests | ~90% — excelente cobertura |
| [packages/domain/src/ranking/elo.ts](packages/domain/src/ranking/elo.ts) | 118 | ❌ 0 tests | **0%** |
| [packages/domain/src/ranking/points.ts](packages/domain/src/ranking/points.ts) | 107 | ❌ 0 tests | **0%** |
| Lógica inline en page.tsx (nivel sub-decimal, reliability) | — | ❌ 0 tests | no-testable (inline) |

### 🔴 Hallazgos críticos

#### C5. ELO se aplica RE-applies si se corrige un score

[apps/web/src/lib/tournament-actions.ts:319-503](apps/web/src/lib/tournament-actions.ts#L319-L503) — `reportMatchScore`:

```ts
const isCompleted = scoreOne > 0 || scoreTwo > 0;
// ...
if (isCompleted && matchData) {
  // ELO update unconditional
  const eloResult = applyPaddleElo({...});
  // updates profiles.elo_rating
  // inserts elo_history
}
```

**No hay verificación** de si el match ya tenía status `completed` antes. Si el organizador reporta `7-5` (ELO se aplica → ratings cambian → elo_history insertado) y luego corrige a `6-4`, **vuelve a entrar el bloque** y aplica ELO nuevamente, usando los ratings ya actualizados como baseline. Cada corrección genera un drift acumulado.

**Impacto:** ratings inflados/deflados artificialmente por correcciones de marcador. `elo_history` queda con rows duplicadas para el mismo match.

**Reproducir:**
1. Reportar match A vs B con score 6-3 → A sube +12 ELO.
2. Corregir a 6-4 → A vuelve a entrar al bloque, sube +11 ELO más.
3. Total: +23 ELO en lugar de +11 final.

**Fix sugerido (NO ahora):**
- Verificar `matchData.status` antes del UPDATE: si era `completed` y ahora también, **no re-aplicar ELO**.
- O agregar columna `matches.elo_applied_at timestamptz` y skip si ya está set.
- O hacer un primer SELECT con `.eq('status', 'scheduled')` para limitar el update a transición scheduled→completed.

#### C6. Race condition en ELO con matches simultáneos

Misma función. Lee `profiles.elo_rating` (cliente normal) → calcula nuevo rating → escribe con service role. Si dos matches del mismo torneo se completan simultáneamente y un jugador está en ambos (raro en americano fijo, **común en americano random** donde el mismo player puede tener 2 matches consecutivos cuya finalización solapa), el segundo update sobrescribe el primero. El delta calculado no es atómico.

**Impacto:** pérdida silenciosa de uno de los dos updates de ELO.

**Fix sugerido:** wrap en transacción SQL con `UPDATE profiles SET elo_rating = elo_rating + $delta WHERE id = $id`, o usar advisory locks. Probablemente no salta en torneos de 16 jugadores, pero en torneos grandes sí.

### 🟡 Casos edge sin tests

#### Americano pairing

**`generateFixedAmericano`:**

- ❌ **Round-robin con courts insuficientes** — el código limita a `courts` matches por ronda y manda el resto a `resting`. Pero los enfrentamientos round-robin son C(n,2) y si las rondas tienen menos enfrentamientos que necesarios, **algunos enfrentamientos NUNCA se juegan**. Ejemplo: 8 parejas, 1 cancha → 7 rondas × 1 enfrentamiento = 7 partidos, pero C(8,2) = 28. Se pierden 21 enfrentamientos sin ser obvios para el organizador.
  - Test sugerido: con 6 parejas y 1 cancha, verificar que **NO se genera** un bracket inválido (debería tirar error o auto-aumentar rondas).
- ❌ **4 parejas, 1 cancha** — 3 rondas posibles pero solo 3 enfrentamientos por ronda y 1 cancha = 1 partido/ronda, faltan 3 cruzes.
- ❌ **n=2 parejas** — single match, debería retornar 1 ronda.
- ❌ **n=1 paireja** — lanza `Mínimo 2 parejas`. OK pero no testeado.

**`generateRandomAmericano`:**

- ❌ **n=4 jugadores** — caso mínimo. Sin test.
- ❌ **n=3 jugadores** — debe lanzar `Mínimo 4 jugadores`. Sin test.
- ❌ **n=5,7,11 (no múltiplo de 4)** — el código hace `n - n%4` así que 5→4 active, 1 resta. Sin test.
- ❌ **courts=0** — debe lanzar `No hay suficientes jugadores y canchas`. Sin test.

#### Eligibility

- ❌ **skillCategory null en SQL trigger** — la función SQL valida y rechaza. La función TS asume non-null (TypeScript lo previene en compile time), así que **si el caller envía un user sin categoría asignada, el INSERT lo hace pasar el trigger SQL pero el TS no lo previene en la UI**. Confiamos en el trigger. OK pero hay que asegurar que el formulario nunca permite avanzar sin categoría.

#### ELO (sin tests)

- ❌ **`applyPaddleElo` empate** (scoreOne === scoreTwo) — código devuelve delta 0 (`movBoost = 1`, `scoreActual = 0.5 - 0.5 = 0`). OK pero sin test.
- ❌ **Gap > 500 entre parejas** — `expectedOne` cerca de 1 (favorito) o 0 (underdog). Si gana underdog, delta grande positivo. Sin test.
- ❌ **Primer match (rating default 1000)** — sin caso explícito.
- ❌ **Margin extremo (40-0)** — `movBoost = log(41) ≈ 3.7` × `k=24` × `0.5 ≈ 44`. Sin test que valide el cap.

#### Points

- ❌ **`pointsForPosition` position > 8** — debe retornar 25 plano × format × size. Sin test.
- ❌ **`pointsForPosition` totalTeams < 8** — sizeFactor < 1, valida proporcionalidad. Sin test.
- ❌ **`decayedPoints` elapsed > window** — debe ser 0. Sin test.
- ❌ **`decayedPoints` future date** — `referenceDate < awardedAt`, elapsed negativo → retorna rawPoints completo. OK pero sin test.

### Bracket de eliminación: no implementado

El enum `tournament_format` incluye `'eliminacion'` pero **no existe función `generateEliminationBracket`** en `packages/domain`. Si un organizador elige formato eliminación, no hay generación de bracket. Tampoco hay tests porque no hay código.

**Impacto:** si Gabriel elige formato `eliminacion`, el botón "Generar bracket" probablemente falla o genera un americano (depende del fallback).

**Verificar:** [apps/web/src/app/app/tournaments/[slug]/manage/generate-bracket-button.tsx](apps/web/src/app/app/tournaments/[slug]/manage/generate-bracket-button.tsx) — qué hace si format es 'eliminacion'.

### Resumen Fase 3

🔴 **2 bugs críticos en server actions** (no en funciones puras de dominio):
- C5: ELO re-aplicado en corrección de marcador.
- C6: Race condition en updates simultáneos de ELO.

⚠️ **Cobertura de tests baja en módulos críticos:**
- 0 tests para `applyElo`, `applyPaddleElo`, `pointsForPosition`, `decayedPoints`.
- 0 tests para server actions (`reportMatchScore`, etc.).
- Generación de bracket de eliminación ausente del codebase.

✅ **Bien testeado:** `eligibility` (23 tests cubren todos los `category_kind`), `generateFixedAmericano` y `generateRandomAmericano` (8 tests, casos comunes OK).

---

## FASE 4 — DATA INTEGRITY CHECK

> **Nota:** no tengo acceso directo a la DB de Supabase desde Claude Code. Las queries siguientes están listas para pegar en el SQL editor del dashboard.
> Para cada una, anotar el `count` o las rows devueltas y diagnosticar como OK / sospechoso / bug claro.

### Q1. Profiles con actividad pero email no confirmado

```sql
select count(*) as zombies, array_agg(p.id) filter (where rownum < 10) as samples
from (
  select p.id,
         row_number() over (order by p.id) as rownum
    from public.profiles p
    join auth.users u on u.id = p.id
   where u.email_confirmed_at is null
     and (
       exists (select 1 from public.tournament_registrations r where r.player_id = p.id or r.player_one_id = p.id or r.player_two_id = p.id)
       or exists (select 1 from public.community_members cm where cm.profile_id = p.id)
       or exists (select 1 from public.elo_history eh where eh.profile_id = p.id)
     )
) p;
```

**Diagnóstico:** si zombies > 0, hay cuentas sin confirmar haciendo cosas. Confirma si tu flow permite uso sin verificar email (puede ser OK en dev, no en prod).

### Q2. Inscripciones a torneos ya empezados pero aún en estado `open`

```sql
select t.id, t.slug, t.name, t.status, t.starts_at,
       count(r.*) as registrations
  from public.tournaments t
  left join public.tournament_registrations r on r.tournament_id = t.id
 where t.status = 'open'
   and t.starts_at < now()
 group by t.id;
```

**Diagnóstico:** rows aquí = torneos que debieron auto-cerrarse / cambiar de status. No hay job que lo haga automáticamente — bug latente.

### Q3. Torneos sin organizador / sin club válido

```sql
select t.id, t.slug, t.name, t.club_id, c.owner_id
  from public.tournaments t
  left join public.clubs c on c.id = t.club_id
 where c.id is null or c.owner_id is null;
```

**Diagnóstico:** debería retornar 0 (FK + NOT NULL). Si hay rows = corrupción manual.

### Q4. Teams con cantidad incorrecta de miembros activos

```sql
select t.id, t.name, t.is_active, count(tm.*) filter (where tm.is_active) as active_members
  from public.teams t
  left join public.team_members tm on tm.team_id = t.id
 where t.is_active = true
 group by t.id, t.name, t.is_active
having count(tm.*) filter (where tm.is_active) <> 2;
```

**Diagnóstico:** padel doubles = exactamente 2 jugadores. Cualquier otro count en team activo es bug. Especialmente preocupante: 0 miembros activos (team huérfano) o 3+ (la unique index debería prevenirlo pero verificar).

### Q5. Chat messages en torneos `finished` / `cancelled`

```sql
select t.status, count(cm.*) as msgs
  from public.chat_messages cm
  join public.tournaments t on t.id = cm.target_id
 where cm.target_kind = 'tournament'
   and t.status in ('finished', 'cancelled')
 group by t.status;
```

**Diagnóstico:** ¿se permite seguir chateando post-torneo? Decisión de producto. Hoy no hay policy que lo bloquee, así que sí. Confirmar con coach Gabriel si esto es deseable o si quieres archivar el chat.

### Q6. ELO histórico con saltos sospechosamente grandes

```sql
select eh.id, eh.profile_id, p.display_name,
       eh.elo_before, eh.elo_after, eh.delta, eh.created_at
  from public.elo_history eh
  join public.profiles p on p.id = eh.profile_id
 where abs(eh.delta) > 200
 order by abs(eh.delta) desc
 limit 20;
```

**Diagnóstico:** con k=32 y margin boost, delta debería estar en [-80, +80] aprox. Si hay rows con |delta| > 200 = bug (probable C5: ELO re-aplicado o C6: race).

### Q7. Comunidades aprobadas con menos de 5 fundadores

```sql
select c.id, c.name, c.status, c.created_at,
       count(cm.profile_id) as members
  from public.communities c
  left join public.community_members cm on cm.community_id = c.id
 where c.status = 'active'
 group by c.id
having count(cm.profile_id) < 5
 order by c.created_at desc;
```

**Diagnóstico:** la regla decía mín 5 fundadores. Si comunidades activas tienen < 5 = bypass (C3) o data legacy de antes de la regla. Diferenciar por `created_at` < migration 20260522100000.

### Q8. Open matches vencidos sin cerrar

```sql
select om.id, om.slug, om.scheduled_at, om.status, om.current_players, om.max_players
  from public.open_matches om
 where om.status = 'open'
   and om.scheduled_at < now() - interval '2 hours'
 order by om.scheduled_at;
```

**Diagnóstico:** matches con hora ya pasada hace 2h+ y aún status='open' = no se cerraron solos. Como dije en A7, no hay cron. Cualquier número > 0 confirma la deuda; rows muy viejas = data junk en el feed.

### Q9. Notificaciones no leídas muy antiguas

```sql
select count(*) as old_unread
  from public.notifications
 where read_at is null
   and created_at < now() - interval '30 days';
```

**Diagnóstico:** si > 0, considerar autoarchivo. No crítico pero puede saturar el ícono de campana del user.

### Q10. Profiles con categoría null o inválida

```sql
select count(*) filter (where skill_category is null) as null_cat,
       count(*) filter (where skill_category is not null) as has_cat,
       count(*) as total
  from public.profiles;
```

**Diagnóstico:** quienes son `null_cat` no pueden inscribirse a torneos estandar/suma. Si Gabriel y sus 16 entran y no completan onboarding del quiz → quedan bloqueados. Estimar:
- Si null_cat > 0 → audit del onboarding: ¿se está seteando skill_category al terminar el quiz?

### Q11 (bonus). Invitations expirados que siguen sin invalidar

```sql
select count(*) as expired_still_active
  from public.invitation_tokens
 where expires_at is not null
   and expires_at < now();
```

**Diagnóstico:** no hay campo `is_active`, así que el redeem debe filtrar por expires_at. Verificar en `invitation-actions.ts` que respeta expires_at y max_uses.

### Q12 (bonus). Matches con score raro (negativo, igualados, etc.)

```sql
select id, tournament_id, score_one, score_two, status
  from public.matches
 where status = 'completed'
   and (
     score_one is null or score_two is null
     or score_one < 0 or score_two < 0
     or score_one = score_two  -- empates
     or (score_one > 9 and score_two = 0) or (score_two > 9 and score_one = 0)  -- "paliza imposible"
   );
```

**Diagnóstico:** valores raros indican bugs de input. Empates en padel son inusuales en sets cerrados — verificar.

### Q13 (bonus). Tournament_registrations duplicados por player

```sql
select tournament_id, coalesce(player_id, player_one_id, player_two_id) as player_key, count(*)
  from public.tournament_registrations
 where status in ('pending_payment', 'confirmed')
 group by tournament_id, player_key
having count(*) > 1;
```

**Diagnóstico:** un jugador no puede estar inscrito 2x al mismo torneo. Si hay rows = bug de unique constraint faltante (la unique actual es por team, no por player).

### Resumen Fase 4

13 queries listas para correr en SQL editor. Las críticas:
- **Q6** (ELO drift) confirma o descarta los bugs C5/C6.
- **Q7** (comunidades < 5) confirma o descarta C3.
- **Q10** (categorías null) crítica para el flujo de Gabriel.
- **Q13** (registrations duplicadas) revela falta de constraint si retorna rows.

