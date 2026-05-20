# Arquitectura — PadelKing

> Vista alto-nivel del sistema. Cambia con el código — actualizar aquí cada vez que la arquitectura se mueva.

## Vista de pájaro

```
┌──────────────────┐   ┌──────────────────┐
│   apps/web       │   │   apps/mobile    │
│   Next.js 15     │   │   Expo SDK 53    │
│   App Router     │   │   Expo Router    │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         └──────┬───────────────┘
                │
       packages compartidos:
       • domain (tipos + lógica pura)
       • supabase (clientes + tipos DB)
       • ui (design tokens)
                │
                ▼
       ┌──────────────────────┐
       │  Supabase Cloud       │
       │  • Postgres 17        │
       │  • Auth (email + OAuth│
       │  • Storage            │
       │  • Realtime           │
       │  • RLS en cada tabla  │
       └──────────────────────┘
```

## Jerarquía del dominio (5 niveles)

```
Nacional (Colombia)
  └── Cities
        └── Communities
              ├── Allied Clubs (M:N via club_communities)
              ├── Teams (1 community principal, pueden jugar en otras)
              └── Tournaments (creados por club aliado)

Team (entidad estable, 2 jugadores activos)
  ├── pertenece a 1 Community principal
  ├── tiene 1 Category (1ra–5ta + mixto + queens_1–5)
  ├── compite en Tournaments via Tournament_Registrations (snapshot)
  ├── acumula Team_Points por torneo finalizado
  └── tiene ELO rating (continuo, match-by-match)

Profile (persona)
  ├── puede ser miembro activo de máx 1 Team
  ├── historial preservado en team_members con left_at
  └── puede ser owner de Community o Club
```

## Modelo de ranking dual

Dos sistemas conviven:

**1. ELO (continuo, match-by-match)** — `packages/domain/src/ranking/elo.ts`
- Cada match actualiza el rating de los teams involucrados.
- Útil para el rating "técnico" del team, para emparejar en torneos y para sugerir cambios de categoría.

**2. Puntos absolutos por torneo (acumulado por período)** — `packages/domain/src/ranking/points.ts`
- Tabla ATP-style: 1er=1000, 2do=600, 3er=400…
- Multiplicador por formato (americano=1.0, league=1.5, elimination=1.2, express=0.6).
- Escala con `totalTeams / 16`.
- Decaimiento lineal en 12 meses (puntos viejos pesan menos).
- Estos puntos se persisten en `team_points` y se leen vía vista `team_ranking_live`.

**3. Ranking de comunidad = suma top-5 equipos** — `packages/domain/src/ranking/community.ts` y vista `community_ranking_live`
- Para que las comunidades chicas con élite no las domine una con 100 jugadores promedio.

## Categorías

11 categorías hardcoded como `team_category` enum + tabla metadata `categories`:
- **King**: `primera`, `segunda`, `tercera`, `cuarta`, `quinta`, `mixto`
- **Queens**: `queens_1` a `queens_5` (universo paralelo, no cross-inscripción con King)

**Cambio de categoría**: auto-sugerencia por umbrales de puntos + aprobación manual del organizador (no implementado todavía; planeado para Fase 2).

## Schema clave

```
profiles          1─┐         ┌─1 cities
                   ├──N         │
                   │            │
                   ▼            ▼
              communities ◄──── (city_id)
              ▲   │
              │   ├──N community_members
              │   │
              │   N
              clubs ◄──── (city_id)
              │
              ├──M:N club_communities
              │
              └─── tournaments ◄── (city_id, category)
                       │
                       ├── tournament_registrations (snapshot)
                       │       │
                       │       └─ teams (estables) ◄── team_members
                       │
                       ├── matches (FK a registrations)
                       │
                       ├── tournament_sponsors → sponsors
                       │
                       └── team_points (al finalizar)

notifications  →  profiles
```

## Roles y autorización (RLS)

| Rol | Cómo se define | Qué puede hacer |
|---|---|---|
| **Profile (player)** | Cualquier `auth.users` | Crear team, unirse a comunidad, inscribirse a torneo, actualizar score de SUS matches |
| **Community admin** | `community_members.role in ('owner','admin')` | Gestionar miembros, aliar clubes, sugerir cambios de categoría |
| **Community owner** | `communities.owner_id = profile.id` | Lo anterior + borrar comunidad, designar admins |
| **Club owner** | `clubs.owner_id = profile.id` | Crear torneos en su club, asignar sponsors, gestionar matches |
| **Super admin** | Service role key (bypass RLS) | Verificar clubes, moderar disputas, gestión global |

Toda tabla tiene RLS activado y policies explícitas. Ver migración para SQL exacto.

## Stack técnico

| Capa | Tecnología | Por qué |
|---|---|---|
| Monorepo | Turborepo + pnpm | Tipos compartidos web/mobile, paralelización de tasks |
| Web | Next.js 15 (App Router, RSC) | SSR/SSG, SEO crítico para la landing, server actions reducen API boilerplate |
| Web styling | Tailwind CSS v4 + shadcn/ui | Standard de facto, dark-first natural |
| Mobile | Expo SDK 53 + Expo Router | OTA updates, deploy a App Store y Play Store sin macOS local |
| Mobile styling | NativeWind v4 | Reusa el lenguaje Tailwind cross-platform |
| Backend | Supabase | Postgres real + auth + storage + realtime en un solo provider, RLS evita escribir API CRUD |
| Auth | Supabase Auth | Email + OAuth (Google planeado), sesiones HTTP-only via @supabase/ssr |
| Pagos | Wompi (planeado v0.2) | Pasarela líder en Colombia, soporta PSE/Nequi/Bancolombia/tarjetas |
| Email | Resend (planeado) | DX moderna, react-email templates |
| Deploy web | Vercel | Native de Next.js, preview por PR |
| Deploy mobile | Expo EAS | Builds nativos + OTA updates |
| Analytics | PostHog (planeado) | Self-hostable, product analytics + feature flags |

## Patrones de datos

### Server Components + Server Actions
Para queries: `await supabase.from(...).select(...)` directamente en RSC.
Para mutaciones: server actions con `'use server'`. El cliente solo invoca.

### Cliente Supabase
Hay 3 clientes según contexto:
- `createBrowserClient` (browser, sesión via cookies HTTP-only)
- `createServerClient` (RSC + server actions, lee cookies)
- `createServiceClient` (edge functions / scripts admin, bypass RLS — **nunca exponer al browser**)

### Realtime
- Bracket en vivo del torneo: subscribirse a `matches` filtrado por `tournament_id`.
- Notifications: subscribirse a `notifications` filtrado por `profile_id`.

## Decisiones registradas
Ver carpeta `docs/adr/` para Architecture Decision Records.

## Roadmap arquitectónico

- **v0.2**: Wompi integration con split payments (organizador 92%, PadelKing 8%).
- **v0.3**: Notifications push (Expo Notifications + email via Resend).
- **v1.0**: PadelKing TV — streaming de torneos premium via Mux. Tabla `tournament_streams`.
- **v1.5**: Data API para sponsors (suscripción a segmentos por categoría/ciudad/edad).
