## PadelKing — VISUAL_AUDIT

> Sesión 1 del sprint UX/UI · Auditoría sin fixes · 5 pantallas core + 17 components/ui · Framework Impeccable
> Fecha: 2026-05-24 · Branch: main

---

## 🔴 TOP 12 ISSUES CRÍTICOS (revisado tras feedback)

Ordenados por impacto. Estos son los que mueven la aguja de 8/10 → 9.5/10 y deberían ir en la Sesión 2 (sistema global).

**Cambios de severidad aplicados:**
- #7 (doble uppercase) — subido a 🔴 **P0** por regresión activa de screen reader.
- #5 (gold drift) — bajado a 🟡 **P2** (visible solo side-by-side).
- **+2 hallazgos nuevos** del feedback: #11 touch targets (P0/mobile) y #12 estados de error visuales (P1).

### 1. `*:focus-visible { outline: none }` global rompe accesibilidad de teclado

[apps/web/src/app/globals.css:169-171](apps/web/src/app/globals.css#L169-L171):

```css
*:focus-visible { outline: none; }
```

Esto elimina el focus-visible por **toda** la app. Solo Button/Input/Select lo restauran con `ring`. Cualquier `<Link>` actuando como card (dashboard torneos, communities, players in common, equipos, otros torneos grid, mobile-nav, share buttons) **no tiene indicador visual de focus**. Usuario de teclado queda perdido en Tab navigation.

**Por qué importa:** WCAG 2.4.7 (Focus Visible) Level AA. Bloqueante para sponsors institucionales y app stores.

**Fix conceptual:** quitar la regla global y agregar `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` a todos los `<Link>` que actúan como card, o crear utility `.focusable-card`.

### 2. Cards-as-link sin focus-visible (consecuencia directa de #1)

Lugares afectados:
- [apps/web/src/app/app/page.tsx:232,338](apps/web/src/app/app/page.tsx#L232) — featured tournament card + otros torneos grid (Link)
- [apps/web/src/app/app/page.tsx:400](apps/web/src/app/app/page.tsx#L400) — community list rows (Link)
- [apps/web/src/components/marketing/tournament-list-view.tsx](apps/web/src/components/marketing/tournament-list-view.tsx) — listado público
- [apps/web/src/app/players/[id]/page.tsx:342](apps/web/src/app/players/[id]/page.tsx#L342) — players in common
- [apps/web/src/app/tournaments/page.tsx:165](apps/web/src/app/tournaments/page.tsx#L165) — CityChip filter pills

**Fix:** una utility `.focusable` aplicada en todos. Si cae bien, agregarla al component Card via prop `interactive` o nuevo `LinkCard`.

### 3. Chevron hardcoded gold en Select rompe theme-queens

[apps/web/src/components/ui/select.tsx:19](apps/web/src/components/ui/select.tsx#L19):

```css
bg-[url("data:image/svg+xml...stroke='%23FFC53D'...")]
```

El stroke del chevron es `#FFC53D` (gold-400). En `.theme-queens` el resto del UI cambia a magenta pero el chevron sigue dorado. Bug visual obvio.

**Fix:** usar `currentColor` en el SVG y heredar `text-ring` o `text-crown` (que ya cambia en theme-queens).

### 4. Color `live` y `warning` y `destructive` colapsan

| Token | Valor en globals.css | Valor en tokens.ts |
|-------|---------------------|---------------------|
| `--live` | `#fb7185` (coral) | `live: '#FB7185'` ✅ |
| `--destructive` | `#fb7185` (coral) | n/a |
| `--warning` | `#fbbf24` (amber) | `warning: '#FB7185'` ❌ |

[globals.css:119,131-132](apps/web/src/app/globals.css#L119) vs [tokens.ts:60-61](packages/ui/src/tokens.ts#L60):

- `live` y `destructive` son el mismo coral. Inconveniente: el dot rojo de "live torneo" se lee como alerta.
- `warning` está desincronizado entre dos fuentes (CSS = amber, TS = coral igual que live).

**Fix:**
- `live` debe ser distinto de `destructive`. Sugerencia: live = data cyan (`#5EEAD4`) o success green; destructive queda coral.
- Sincronizar `warning` en `tokens.ts` con el valor de CSS (`#fbbf24` amber).

### 5. Tres representaciones del color principal: `crown` vs `gold-400` vs `gold-300` 🟡 P2

> _Bajado a P2 — visible solo side-by-side. Cleanup post-beta._



| Uso | Archivo | Color |
|-----|---------|-------|
| Landing hero `PÁDEL` | [page.tsx:113](apps/web/src/app/page.tsx#L113) | `text-crown` |
| StatCard number | [stat-card.tsx:18](apps/web/src/components/ui/stat-card.tsx#L18) | `text-gold-400` |
| CategoryBadge text | [category-badge.tsx:72](apps/web/src/components/ui/category-badge.tsx#L72) | `text-gold-300` |
| Teams card rating | [app/teams/page.tsx:147](apps/web/src/app/app/teams/page.tsx#L147) | `text-gold-400` |
| Featured tournament border | [app/page.tsx:233](apps/web/src/app/app/page.tsx#L233) | `border-gold-400/30` |
| Player card border | [players/[id]/page.tsx:193](apps/web/src/app/players/[id]/page.tsx#L193) | `border-crown/30` |

Drift acumulado: tres formas de decir "el dorado de PadelKing". `crown` es el alias semántico que se reescribe en `.theme-queens`. `gold-400` es el token de escala. `gold-300` es 10% más claro.

**Por qué importa:** en theme-queens, `gold-400` y `gold-300` **NO** se reescriben — los usos cross-brand siguen viéndose dorados en una pantalla queens.

**Fix:** estandarizar todos los usos accent semánticos a `text-crown` / `border-crown/N` / `bg-crown/N`. Reservar `gold-300` / `gold-400` solo para casos donde explícitamente quieres "amarillo deportivo" no-brand (e.g., chip activo en filtros).

### 6. Escala tipográfica de "hero" dispar entre las 5 pantallas

| Pantalla | Tamaño hero h1 |
|----------|----------------|
| Landing | `text-5xl md:text-7xl` (48 → 72) |
| Dashboard | `text-4xl md:text-5xl` (36 → 48) |
| Tournaments | `text-5xl md:text-6xl` (48 → 60) |
| Player profile | `text-4xl md:text-5xl` (36 → 48) |
| Mis equipos | `text-4xl md:text-5xl` (36 → 48) |

Tres niveles distintos sin justificación clara. Y peor: las utilities `text-display-xl` ([globals.css:252-256](apps/web/src/app/globals.css#L252-L256)) y `text-display` ([globals.css:258-262](apps/web/src/app/globals.css#L258-L262)) — que usan `clamp()` para fluid type — **NO se están usando en ninguna parte**.

**Fix:** adoptar las utilities ya definidas. Landing hero = `text-display-xl`. Dashboard/perfiles = `text-display`. Subsecciones = `text-2xl md:text-3xl`.

### 7. Doble uppercase: CSS h1-h6 + `.toUpperCase()` en JSX 🔴 **P0** (subido)

> _Subido a P0 — regresión activa de screen reader, no cosmético._



[globals.css:163](apps/web/src/app/globals.css#L163): `h1,h2,h3,h4,h5,h6 { @apply font-display tracking-tight uppercase; }`

Luego en JSX:
- [app/page.tsx:266](apps/web/src/app/app/page.tsx#L266): `{nextTournament.name.toUpperCase()}`
- [players/[id]/page.tsx:181](apps/web/src/app/players/[id]/page.tsx#L181): `{player.display_name.toUpperCase()}`
- [tournaments/[slug]/page.tsx](apps/web/src/app/tournaments/[slug]/page.tsx) — varios
- [app/teams/page.tsx:135](apps/web/src/app/app/teams/page.tsx#L135): `{t.name.toUpperCase()}`

**Por qué importa:** dos problemas.
1. **Screen readers** leen mayúsculas letra por letra cuando el contenido original era case mixto (algunos lectores). Names como "Juan Vergara" se leen "J. U. A. N." en lugar de "Juan".
2. **i18n / nombres con acentos**: `'Bárbaros'.toUpperCase()` → `'BÁRBAROS'`. CSS uppercase tiene mejor handling de unicode en algunos browsers viejos.
3. **Redundante** si CSS ya lo hace.

**Fix:** dejar solo CSS `text-transform: uppercase`. Quitar todos los `.toUpperCase()` de JSX. Para tags no-heading donde se quiere uppercase (cards de tournament name), aplicar `uppercase` className.

### 8. Radius scale TS y CSS desincronizadas (cross-platform drift)

[packages/ui/src/tokens.ts:82-89](packages/ui/src/tokens.ts#L82-L89):

```ts
radius: { sm: 6, md: 10, lg: 16, xl: 24, '2xl': 32 }
```

[globals.css:77-81](apps/web/src/app/globals.css#L77-L81):

```css
--radius: 0.875rem;  /* 14px */
--radius-sm: calc(var(--radius) - 4px);  /* 10px */
--radius-md: calc(var(--radius) - 2px);  /* 12px */
--radius-lg: var(--radius);  /* 14px */
--radius-xl: calc(var(--radius) + 4px);  /* 18px */
--radius-2xl: calc(var(--radius) + 12px); /* 26px */
```

Web tiene sm=10, md=12, lg=14, xl=18, 2xl=26.
Mobile via tokens.ts tiene sm=6, md=10, lg=16, xl=24, 2xl=32.

**Por qué importa:** cuando llegue el mobile build, las cards y buttons tendrán radii distintos web vs mobile. Diluye la identidad.

**Fix:** elegir una source of truth. Recomiendo CSS (más fácil ajustar con calc) y derivar TS desde ahí. O alinear ambas a una escala canónica (sm=8, md=10, lg=14, xl=18, 2xl=24 por ejemplo).

### 9. Empty states inconsistentes: 2/5 usan el component bueno

| Pantalla | Patrón empty state usado |
|----------|--------------------------|
| Dashboard sin torneos | ✅ `<EmptyState />` component |
| Mis equipos sin equipos | ✅ `<EmptyState />` con preview mock (excelente) |
| Tournaments sin resultados | ❌ `<Card>` con Trophy + texto + button, raw |
| Player sin torneos jugados | ❌ `<div>` con border-dashed inline |
| Players in common sin matches | ❌ `<div>` con border-dashed inline |

[apps/web/src/components/ui/empty-state.tsx](apps/web/src/components/ui/empty-state.tsx) es un component excelente con título, descripción, bullets, primary/secondary action y preview mock. Pero solo se usa en 2 pantallas.

**Fix:** refactor las 3 pantallas restantes a usar `<EmptyState />`. Especialmente "players in common" en perfil de jugador nuevo (no-tech persona test).

### 10. Vertical rhythm: 3 paradigmas mezclados entre pantallas 🟡 P2

| Pantalla | Paradigma de spacing vertical |
|----------|-------------------------------|
| Dashboard | `space-y-10` en root (Section internamente usa space-y-3/4/6) |
| Teams | `space-y-10` igual |
| Tournaments | `py-10 md:py-14` en main (sin space-y) |
| Player | `py-10` en main (sin md:, sin space-y) |
| Landing | cada sección con `py-24` propio + max-w wrappers |

**Por qué importa:** sensación de rhythm distinta al navegar entre pantallas. Squint test falla.

**Fix:** dos paradigmas máximo:
- App authenticated screens (dashboard, teams, etc): `<main class="space-y-10">` consistente.
- Public landing/marketing: `section-y` utility (ya definida, clamp 2.5-5rem).
- Hero/intro de cada app screen: `mb-10` antes del primer Section.

### 11. Touch targets < 44×44 en mobile 🔴 **P0**

WCAG 2.5.5 Level AAA (target size) recomienda mín 44×44px. Apple HIG / Material Design lo elevan a hard requirement en mobile.

| Componente | Tamaño actual | Status |
|------------|---------------|--------|
| [Button `default`](apps/web/src/components/ui/button.tsx#L49) | `h-10` = 40px | ❌ FALLA |
| [Button `sm`](apps/web/src/components/ui/button.tsx#L50) | `h-8` = 32px | ❌ FALLA |
| [Button `icon`](apps/web/src/components/ui/button.tsx#L53) | `h-10 w-10` = 40×40 | ❌ FALLA |
| [Button `lg`](apps/web/src/components/ui/button.tsx#L51) | `h-12` = 48px | ✅ |
| [Button `xl`](apps/web/src/components/ui/button.tsx#L52) | `h-14` = 56px | ✅ |
| `Input` / `Select` | `h-11` = 44px | ✅ |
| [CityChip filter](apps/web/src/app/tournaments/page.tsx#L166) | `px-3 py-1 text-xs` ≈ 26px | ❌ FALLA |
| [MobileNav items](apps/web/src/components/mobile-nav.tsx#L36) | `py-2.5` ≈ 50px | ✅ |

**Por qué importa:** Gabriel y su comunidad van a usar la app principalmente en mobile (Chrome Android / Safari iOS). Botones de 32-40px están en el límite y producen miss-taps. Especialmente:
- "Inscribirme" en featured tournament card es `size="sm"` → 32px ❌
- "Ver todos" link en Sections → 32px ❌
- ShareInviteButton → 32px ❌
- "Invitar" en team card → 32px ❌
- Botones "Salirme/Cancelar/Unirme" en open matches → 32px ❌

**Fix conceptual:**
- Subir `Button.sm` a `h-9` (36px) + `min-h-[44px]` en mobile, o conservar h-8 desktop pero touch-padding extra: `touch-action-manipulation` + `min-h-[44px]` con media query.
- Cleaner: redefinir sizes:
  - `xs` (nuevo, desktop-only): h-7
  - `sm`: h-9 (subido), 44px touch via `before:` pseudo en mobile
  - `default`: h-11 (subido para coincidir con Input)
  - `lg`: h-12 ✅
- CityChip: subir `py-1` a `py-2` (mín 36px) + `min-h-[44px]` mobile.

### 12. Estados de error visuales: texto rojo seco sin contexto 🔴 P1

19 ocurrencias del patrón:
```tsx
{error && <p className="text-destructive text-xs">{error}</p>}
```

Donde aparece:
- [register-button.tsx:63,111](apps/web/src/app/tournaments/[slug]/register-button.tsx#L63) — bounce de inscripción
- [tournament-chat.tsx:194](apps/web/src/components/tournament-chat.tsx#L194) — error post chat
- [action-form.tsx:39](apps/web/src/components/forms/action-form.tsx#L39) — ✅ pattern base, todos los forms heredan
- [share-story-button.tsx:98](apps/web/src/components/share-story-button.tsx#L98), [share-invite-button.tsx:143](apps/web/src/components/share-invite-button.tsx#L143)
- [generate-bracket-button.tsx:46](apps/web/src/app/app/tournaments/[slug]/manage/generate-bracket-button.tsx#L46)
- [join-request-row.tsx:106](apps/web/src/app/app/communities/[slug]/join-request-row.tsx#L106)
- ... 13 más

**Lo que NO está mal:** [error-translate.ts](apps/web/src/lib/error-translate.ts) es excelente. Traduce RLS, FK violations, NOT NULL, timeouts, duplicate keys a mensajes en español amigables. NO TOCAR esa lógica.

**Lo que sí está mal:**
1. **Display sin jerarquía visual:** texto rojo `text-xs` debajo del form. Nada llama atención, sin icono `<AlertCircle>`, sin border/bg. Cuando un usuario falla un submit, escanea visualmente y no encuentra el feedback.
2. **No hay `not-found.tsx`:** rutas tipo `/tournaments/no-existe`, `/players/uuid-falso` caen en el 404 default de Next.js (genérico, sin brand).
3. **No hay `error.tsx`:** boundary global. Si una RSC tira excepción, el user ve "Something went wrong" sin brand ni acción.
4. **No hay variant "error" en EmptyState:** cuando una query falla (no es empty, falló), no hay component para representarlo. Hoy se mezcla con "no hay data".

**Fix conceptual:**
- Crear `<ErrorState>` (variante de EmptyState con accent destructive, icono `<AlertTriangle>`, recovery CTA).
- Crear `<InlineError>` component: icono + texto + borde sutil destructive, con `role="alert"` aria.
- Reemplazar las 19 ocurrencias `<p className="text-destructive text-xs">` por `<InlineError>`.
- Crear `[apps/web/src/app/not-found.tsx]` con brand + CTA "Volver al inicio".
- Crear `[apps/web/src/app/error.tsx]` (Client Component, requerido por Next.js para error boundary) con brand + reset action.

---

## 🟡 TOP 20 ISSUES MENORES

### Typography (T)

- **T3** — Tracking de small caps inconsistente: 4 valores (`tracking-widest`, `tracking-[0.1em]`, `tracking-[0.15em]`, `tracking-[0.3em]`). Estandarizar a 2 (0.1em badges, 0.15em metadata).
- **T4** — Stat-line del dashboard ([app/page.tsx:142-168](apps/web/src/app/app/page.tsx#L142-L168)): 5 piezas de info en una línea flex con peso idéntico (`text-sm`). Squint test → todo se ve igual. Jerarquía con 1-2 prominentes + meta más pequeño.
- **T5** — `text-balance` solo en hero del landing. Aplicar en H2 de "4 horas WhatsApp → 4 minutos PadelKing", bajadas, etc. Gratis y mejora la línea final.

### Spacing (S)

- **S2** — `max-w` containers tienen 3 valores (`max-w-6xl`, `max-w-7xl`, `max-w-3xl`) sin razón clara. Landing 6xl, dashboards/listas 6xl o 7xl pero pick one, perfiles 3xl.
- **S3** — Padding entre cards similares varía: featured (`p-6 md:p-8`), grid item (`p-4`), player card (`p-3`). Definir scale: `card-tight` (p-4), `card-default` (p-5), `card-feature` (p-6 md:p-8).
- **S4** — Gap en grids: `gap-3` (12px) vs `gap-4` (16px) sin distinción. Unificar.

### Colors (C)

- **C1** — Hardcoded hex en `:root` ([globals.css:104-132](apps/web/src/app/globals.css#L104-L132)) en lugar de `var(--color-gold-400)`. No urgente pero acumula drift.
- **C3** — `border-border/40`, `/30`, `/60` ad-hoc en 20+ lugares. El token `--border` ya es `rgba(241,239,234,0.08)` — `/40` de eso es casi invisible. Crear tokens `--border-subtle` / `--border-strong`.

### Borders & Radius (B)

- **B3** — Card shadow ultra-sutil (`shadow-[0_1px_2px_rgba(0,0,0,0.25)]`) que apenas se distingue en dark mode. O eliminar y dejar solo border, o subir a `0_2px_8px_rgba(0,0,0,0.4)`. Ahora es "ni-ni".
- **B5** — Border accent en cards tiene 3 enfoques: `border-gold-400/30`, `border-crown/30`, ó token sin tinte. Estandarizar a `border-crown/30` (alias semántico).

### A11Y

- **A11Y3** — Avatar texto `text-white/90` sobre gradient. Para palettes claras (gold `#FFC53D`, cream, cyan), contraste blanco ≈ 1.6:1 (FAIL WCAG). Calcular best-text per palette.
- **A11Y4** — Iconos decorativos a veces con `aria-hidden`, otros sin. `<span className="size-1.5 rounded-full bg-live animate-pulse" />` (landing hero) → "3 clubes en beta" sin context para SR.
- **A11Y6** — Marquee scroll en landing ([page.tsx:211](apps/web/src/app/page.tsx#L211)) con `animate-[scroll_40s_linear_infinite]`. En reduced-motion la duration baja a 0.01ms → scroll terminó en posición random. Debería detenerse en posición home.

### Polish (P)

- **P1** — Hover states inconsistentes en cards-as-link:
  - Dashboard featured: `hover:border-gold-400/60 hover:bg-gold-400/[0.06]`
  - Grid items: `hover:border-foreground/20`
  - HowItWorks landing: `hover:border-crown/40 hover:border-foreground/20` (dos conflictivas, la 2da gana)
  - Teams card: `hover:border-gold-400/40`
  Estandarizar.
- **P4** — Player profile hero plano: Badge + h1 + ciudad inline, sin avatar grande. El jugador es el "producto" del perfil. Hero merece más peso visual.
- **P6** — Players in common empty: "Aún sin torneos compartidos" pelado. Sugerir mock mini como en Teams.
- **P8** — Buttons primary sin `hover:scale-[1.02]`. Tienen `active:scale-[0.97]` pero no el lift on hover.
- **P9** — Avatar split frágil en teams card ([app/teams/page.tsx:124-128](apps/web/src/app/app/teams/page.tsx#L124-L128)): `t.name.split(/[/-]/)`. Si team "Los Bárbaros" → split = `["Los Bárbaros"]` → solo 1 avatar. Query real a team_members.
- **P12** — Marquee landing 40s para 33% → 13.3s por ciclo de items. Difícil de leer mientras pasa. Subir a 60-80s.

---

## ✅ COSAS QUE YA ESTÁN BIEN — NO TOCAR

### Sistema de tokens y fundamentos

- **11-step color scales** (ink, gold, magenta) con progression bien pensada — replicar la calidad.
- **Motion tokens** `--ease-out`, `--ease-out-soft`, `--ease-press`, durations `instant/quick/base/relaxed/modal` — bien dimensionados (no se está usando "1s" o "300ms" sin pensar).
- **Tipografía base**: Archivo Black display + Manrope body. Pareja sólida y distintiva. Compensación light-on-dark ya aplicada (`line-height: 1.6, font-weight: 450` en body).
- **Tabular-nums** utility para números — broadcast feel correcto.
- **Reduced-motion** respetado en transitions globales.
- **Dark-first** sin pure black (`#0A0A0A`), tinted neutrals correctos.

### Componentes que son ejemplares

- `<StatCard>` ([stat-card.tsx](apps/web/src/components/ui/stat-card.tsx)): loading skeleton, delta arrow, 7 accents, 3 sizes — completo.
- `<EmptyState>` con preview prop: el patrón de "así se vería" en Teams es excelente, no hay nada genérico ahí.
- `<Avatar>` procedural: hash → 10 palettes → gradient. Cero feel de avatar "default cuadrado marrón".
- `<Countdown>`: urgency tinting cuando faltan <6h. Detalle pro.
- `<Button>` cva: 8 variants × 5 sizes, transitions específicas (no `all`), `active:scale-[0.97]`.
- `<Card>`: transition específica `border-color, background-color, box-shadow`. No `transition-all`.

### Identidad

- **Dual-brand kings/queens** vía cookie → class swap → CSS vars. Limpio.
- **KingLogo/QueensLogo** con corona + teardrop + grip trapezoidal — distintivos.
- **Court-grid utility** (líneas dorado-translucidas) en hero — detalle deportivo.

### Estructura

- **Server Components** por default, `'use client'` solo donde necesario.
- **Loading.tsx** files ya existen en `/app`, `/tournaments`, etc. (no son issue).

---

## 📋 SUGERENCIAS POR PANTALLA

### Landing ([apps/web/src/app/page.tsx](apps/web/src/app/page.tsx))

| Issue | Severidad |
|-------|-----------|
| T6 — adoptar `text-display-xl` en hero (utility ya definida) | medium |
| T2 — quitar `.toUpperCase()` de JSX (CSS ya hace uppercase) | medium |
| T5 — `text-balance` en bajadas H2, no solo hero | low |
| P12 — marquee scroll velocidad subir a 60s | low |
| A11Y6 — marquee respetar reduced-motion (detener, no acelerar) | medium |
| P1 — hover de HowItWorks cards tiene 2 clases conflictivas, la 2da gana | low |
| Comunidades grid: 4 cards idénticos con thumbnail procedural plano. "Identical card grids" del Impeccable. Considerar variar tamaños o agregar 1 metric específica por card. | medium |
| Monetization grid: 4 cards en `<l.icon /><label><title><desc>` repetidas. Mismo problema. | medium |
| "4 HORAS DE WHATSAPP → 4 MINUTOS DE PADELKING" se lee a SaaS-template (transición narrativa con flecha). Reescribir más específico o quitar la transición. | low |

### Dashboard usuario ([apps/web/src/app/app/page.tsx](apps/web/src/app/app/page.tsx))

| Issue | Severidad |
|-------|-----------|
| T4 — stat-line del hero (`{display_name} · cat · city · #rank · torneos`) aplanada. Jerarquía: display_name dominante, los demás como meta-line debajo. | high |
| Featured tournament card es excelente. Solo P1 hover (unificar). | low |
| StatCard de "Tier 1 oficiales" y "Tier 2 casuales" con `accent="neutral"` quedan grises. Considerar `accent="crown"` y `accent="data"` para que se distingan. | medium |
| "Mis comunidades" + "Pareja estable" lado a lado. Pareja estable empty está bien, pero "Mis comunidades" empty es Card pelada → debería usar EmptyState. | low |
| Crown decorativo en bottom-right fixed (línea 468) opacity `[0.03]` — casi invisible. Considerar quitarlo o subir opacity. Está "ni-ni". | low |

### Lista pública de torneos ([apps/web/src/app/tournaments/page.tsx](apps/web/src/app/tournaments/page.tsx))

| Issue | Severidad |
|-------|-----------|
| Empty state es `<Card>` raw con Trophy + texto. Migrar a `<EmptyState>` component. | high |
| Hero stats `<dl>` con `divide-x divide-border/40` — los 3 numbers (Abiertos/Ciudades/Inscritos) son excelentes pero la `border/40` casi no se ve. Subir contraste. | low |
| Filtros: solo ciudad. Para audiencia real (Gabriel + 16) probablemente necesitan también categoría y fecha. **No agregar** en este sprint (regla 5 del sprint) — anotar para post-beta. | n/a |
| `tracking-[0.15em]` aparece literal aquí en CityChip — estandarizar a un token. | low |

### Perfil público de jugador ([apps/web/src/app/players/[id]/page.tsx](apps/web/src/app/players/[id]/page.tsx))

| Issue | Severidad |
|-------|-----------|
| P4 — Hero plano. Avatar size-2xl, nombre prominente, categoría como overline. El jugador es el producto del perfil. | high |
| ELO card con reliability bar está muy bien. NO TOCAR. | n/a |
| 2 cards adicionales (Puntos ranking, Torneos) con números grandes. La de "Torneos" muestra `0` cuando no hay data — sin diff visual del "no juega aún". Considerar empty state. | medium |
| "Historial · 12 meses" empty es div con border-dashed inline. Migrar a EmptyState mini variant. | medium |
| "Players in common" empty es div con border-dashed inline. Migrar + mockup como en Teams. | medium |
| C5 — chevron del Select rompe theme-queens (aunque player profile no usa Select, otras pantallas sí). | high |
| "Desglose de ranking" Tier 1 / Tier 2 cards usan `text-crown` y `text-data`. Bien. | n/a |

### Mis equipos ([apps/web/src/app/app/teams/page.tsx](apps/web/src/app/app/teams/page.tsx))

| Issue | Severidad |
|-------|-----------|
| P9 — Avatar split frágil. Query a team_members real. | high |
| Empty state con preview mock es referencia de oro. NO TOCAR. | n/a |
| Card de team muestra rating con label "rating" pero sin context (es alto? bajo? promedio?). Agregar comparativa "Top 25%" o similar cuando se tenga data. | low |
| Hover de card team: `hover:border-gold-400/40` — usar `hover:border-crown/40` (semántico). | low |

---

## 🔧 COMPONENTES PARA SESIÓN 4 (21st.dev)

Candidatos donde upgrade visual aportaría más que rework manual:

| Componente actual | Por qué upgrade vale | Prioridad |
|-------------------|----------------------|-----------|
| `<Select>` ([select.tsx](apps/web/src/components/ui/select.tsx)) | Native select con chevron hardcoded. Sin search, sin grouping visual rico. Una pieza pro de Radix/cmdk transformaría onboarding + creación torneo. | high |
| Date picker | Hoy se usa `<Input type="date">` raw ([app/tournaments/new/page.tsx](apps/web/src/app/app/tournaments/new/page.tsx)) — un calendar premium aporta mucho. | high |
| `<Toast>` notifications | No existe sistema todavía. Cuando se reporte match o se complete invite, sería ideal toast vs el flash de error/success actuales. | medium |
| Tabla de ranking en `/tournaments/[slug]/live` ([live/page.tsx](apps/web/src/app/tournaments/[slug]/live/page.tsx)) | Tabla inline custom. Una table component pro con sorting, highlight, animated rank changes mejoraría broadcast feel. | medium |
| Avatar con fallback de upload | Hoy es 100% procedural. Si el user sube foto real, soportarlo con `<AvatarImage>` + fallback. | low |

**No** candidatos (descartar):
- `<Button>`, `<Card>`, `<Badge>`, `<StatCard>`, `<EmptyState>`, `<Avatar>`, `<Countdown>` — ya son buenos, riesgo de regresión > upside.

---

## 🎯 Heurísticas Nielsen — scoring breve

| # | Heurística | Score /4 | Issue clave |
|---|------------|----------|-------------|
| 1 | Visibility of System Status | 3 | Falta loading spinner inline en formularios (Button no tiene `loading` variant) |
| 2 | Match System / Real World | 4 | Lenguaje de pádel correcto, categorías 1ra-5ta + Queens en COL |
| 3 | User Control & Freedom | 3 | Cancelar inscripción soportado. Falta confirmar acciones destructivas (delete team) |
| 4 | Consistency & Standards | 2 | **Issues T1, S1, C2, C5, P3 todos lastran este** |
| 5 | Error Prevention | 3 | Validación inline en server actions OK. Falta confirm modal en bracket regenerate |
| 6 | Recognition Rather Than Recall | 3 | CategoryBadge ayuda. Algunos tournament cards muestran format sin tier — confunde |
| 7 | Flexibility & Efficiency | 2 | Sin keyboard shortcuts. Sin command palette globalmente (existe pero no descubrible) |
| 8 | Aesthetic & Minimalist | 4 | Excelente. Dark deportivo, tipografía broadcast, no clutter |
| 9 | Error Recovery | 3 | `translateDbError` es excelente. Empty states sin error variant |
| 10 | Help & Documentation | 2 | Sin tooltips. Sin help icon. EmptyState con bullets ayuda |
| **Total** | | **29/40** | **Sólido, espacio para subir a 34+** |

---

## RESUMEN PARA SESIÓN 2 (sistema global)

Orden de ejecución sugerido:

1. **Tipografía** — adoptar `text-display-xl`/`text-display`, quitar `.toUpperCase()` JSX, estandarizar tracking. (T1, T2, T3, T5, T6)
2. **Colors** — estandarizar `crown` semántico, separar `live` vs `destructive`, sincronizar `warning` web/mobile, fix select chevron. (C2, C4, C5)
3. **Spacing** — rhythm consistente entre 5 pantallas, max-w consistente, padding cards. (S1, S2, S3, S4)
4. **Borders & Radius** — sincronizar TS↔CSS, tokens `border-subtle/strong`, decidir shadow card. (B1, B3, B5, C3)
5. **A11Y crítico** — quitar `*:focus-visible {outline:none}`, agregar focus rings a cards-as-link. (A11Y1, A11Y2, A11Y3, A11Y6)
6. **Polish global** — hover state unificado, `hover:scale-[1.02]` en buttons primary, marquee speed/reduced-motion. (P1, P8, P12)

Sesión 3 ataca pantallas individuales (T4 stat-line, P4 player hero, P9 teams avatars, P3 empty states).
Sesión 4 ataca componentes premium (Select, DatePicker, Toast, Ranking table).
Sesión 5 ataca microinteracciones específicas + empty states finales.

---

**Estado de la sesión:** auditoría completada, cero código modificado. Listo para tu decisión sobre cuáles de los Top 10 atacar primero en Sesión 2.
