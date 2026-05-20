# PadelKing & PadelQueens

> La liga amateur del pádel colombiano. Comunidades, torneos americanos / express / ligas / eliminación, rankings por categoría y entre comunidades. Inspiración Kings League, identidad propia.

**Estado**: beta privada · Bogotá · Mayo 2026.

## Universo de marca

- **PadelKing** — circuito masculino + mixto. Acento dorado real (`#FFC53D`). Categorías 1ra–5ta + Mixto.
- **PadelQueens** — contraparte femenina. Acento magenta premium (`#EC4899`). Queens 1–5.
- **PadelKing TV** — streaming de torneos premium (roadmap v1.0).
- **PadelKing Pro** — features premium para equipos competitivos (roadmap v1.5).

Paridad estructural desde día 1: PadelQueens no es afterthought.

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Web | Next.js 15 (App Router, RSC) + Tailwind CSS v4 + shadcn/ui + TypeScript |
| Mobile | Expo SDK 53 + Expo Router + NativeWind v4 + TypeScript |
| Backend | Supabase (Postgres 17, Auth, Storage, Realtime), RLS en cada tabla |
| Pagos | Wompi (roadmap v0.2) |

## Estructura

```
padelking/
├── apps/
│   ├── web/                          # Landing + dashboard + torneos
│   └── mobile/                       # iOS + Android (Expo)
├── packages/
│   ├── domain/                       # Tipos + lógica (ranking, americano, ELO, puntos)
│   ├── supabase/                     # Cliente + tipos generados
│   ├── ui/                           # Design tokens cross-platform
│   └── tsconfig/                     # tsconfigs base
├── supabase/
│   └── migrations/                   # SQL migrations
├── docs/
│   └── adr/                          # Architecture Decision Records
├── ARCHITECTURE.md
├── CONVENTIONS.md
└── README.md
```

## Quick start

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar env vars
cp .env.example .env.local
# Editar .env.local con credenciales Supabase

# 3. Web dev
pnpm --filter web dev               # http://localhost:3000

# 4. Mobile dev (otra terminal)
pnpm --filter mobile dev            # Expo Go o simulador

# 5. Migraciones Supabase (cuando tocas el schema)
$env:SUPABASE_ACCESS_TOKEN="sbp_..."
npx supabase db push
npx supabase gen types typescript --linked > packages/supabase/src/database.types.ts

# 6. Typecheck del monorepo
pnpm typecheck
```

## Modelo del dominio

5 niveles jerárquicos:

```
Nacional (Colombia)
  └── Cities                          (7 sembradas: Bogotá, Medellín, Cali…)
        └── Communities               (organizan torneos, agrupan equipos)
              ├── Clubs aliados       (M:N — sedes físicas)
              ├── Teams               (entidad estable de 2 jugadores)
              └── Tournaments         (creados por club aliado)
```

**Reglas clave**:
- Un team = 2 jugadores activos. Historial preservado en `team_members` con `left_at`.
- Un team pertenece a 1 comunidad principal, pero puede inscribirse en torneos de otras.
- 11 categorías: 1ra–5ta, Mixto, Queens 1–5. Queens y King son universos separados (no cross-inscripción).
- Cambio de categoría: auto-sugerencia por puntos + aprobación del organizador.

## Ranking dual

- **ELO** continuo, actualizado match-by-match (`packages/domain/src/ranking/elo.ts`).
- **Puntos absolutos** por torneo (ATP-style: 1er=1000, 2do=600…) con decaimiento de 12 meses (`packages/domain/src/ranking/points.ts`).
- **Ranking de comunidad** = suma top-5 equipos (vista `community_ranking_live`).
- **Ranking interno** = orden de tus teams dentro de tu comunidad.
- 4 períodos: mensual, trimestral, semestral, anual.

Ver [ADR-0002](docs/adr/0002-ranking-hibrido.md) para el razonamiento del sistema.

## MVP — Fase 1 (Foundation)

- [x] Monorepo + tooling + typecheck verde
- [x] Supabase con schema completo + RLS + 11 categorías sembradas + 7 ciudades
- [x] Tipos generados desde schema remoto
- [x] Lógica de ranking híbrido (ELO + puntos + decaimiento + agregación comunidad)
- [x] Generador de bracket americano (round-robin de parejas)
- [x] Landing pública profesional (PadelKing + PadelQueens dual brand)
- [ ] Auth (signup/login con email + Google)
- [ ] Onboarding: crear team + invitar pareja
- [ ] Unirse a comunidad
- [ ] Dashboard de organizador
- [ ] Crear torneo (4 formatos)
- [ ] Inscripción + bracket en vivo
- [ ] Vista de ranking pública por categoría/período/scope

## Roadmap

- **v0.2** — Wompi integration, split payments organizador 92% / PadelKing 8%
- **v0.3** — Notifications push (Expo) + email (Resend) + auto-stories de podio
- **v0.4** — Sponsors marketplace + exposure tracking
- **v1.0** — PadelKing TV (streaming via Mux)
- **v1.5** — PadelKing Pro freemium + Data API para marcas

## Convenciones

Ver [CONVENTIONS.md](CONVENTIONS.md) para naming, estructura, estilos, errores, commits, tests.

## Licencia

UNLICENSED — privado.
