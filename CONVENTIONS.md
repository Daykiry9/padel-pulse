# Convenciones — PadelKing

Reglas mínimas para que el codebase no se ensucie con un solo dev y siga limpio cuando entren más.

## Lenguaje
- **Código en inglés** (identifiers, comentarios técnicos, commits). **Copy de producto en español** (UI, copy de marketing, mensajes de error visibles al usuario).
- TypeScript estricto (`strict: true`, `noUncheckedIndexedAccess: true`). Nunca `any` — usar `unknown` y narrow.

## Naming
- **Componentes React**: `PascalCase` — `TournamentCard.tsx`
- **Hooks**: `useCamelCase` — `useTournament.ts`
- **Utilities**: `camelCase` — `formatDate.ts`
- **Archivos no-React**: `kebab-case` para módulos, `PascalCase` solo si exporta un componente o clase como default.
- **DB**: `snake_case` para tablas y columnas (`tournament_registrations`, `player_one_id`).
- **Enums**: `snake_case` valores (`queens_1`), `camelCase` para nombres TS exportados (`isQueensCategory`).

## Estructura de carpetas

```
padelking/
├── apps/
│   ├── web/                          # Next.js 15 App Router
│   │   └── src/
│   │       ├── app/                  # routes (RSC por defecto)
│   │       ├── components/
│   │       │   ├── ui/               # primitives shadcn (Button, Card, Badge…)
│   │       │   ├── marketing/        # secciones de la landing
│   │       │   ├── tournament/       # feature tournament
│   │       │   ├── team/             # feature team
│   │       │   └── ranking/          # feature ranking
│   │       ├── lib/                  # helpers no-React (cn, formatters)
│   │       ├── hooks/                # hooks compartidos
│   │       └── server/               # server actions / queries (RSC)
│   └── mobile/                       # Expo Router
│       ├── app/                      # rutas
│       └── src/                      # lib, components, hooks
├── packages/
│   ├── domain/                       # tipos + lógica pura (ranking, americano)
│   ├── supabase/                     # clientes + tipos generados
│   ├── ui/                           # design tokens + helpers cross-platform
│   └── tsconfig/                     # tsconfigs base
└── supabase/migrations/              # SQL migrations numeradas
```

## Imports
- Orden: **externos → internos** (`@padelking/*`) **→ relativos** (`@/`). Línea en blanco entre grupos.
- Ejemplo:
  ```ts
  import { useState } from 'react';
  import Link from 'next/link';

  import { type TeamCategory, KING_CATEGORIES } from '@padelking/domain';

  import { Button } from '@/components/ui/button';
  import { cn } from '@/lib/utils';
  ```

## Componentes
- **Server Components por defecto** (Next.js App Router). Solo agregar `'use client'` cuando se necesite estado, efectos o handlers de browser.
- **Props con interface** (no type alias) cuando se exportan. Type alias para props internos.
- **Sin default export** en componentes nuevos — usar named export. Excepción: pages de Next.js (lo exige el framework).

## Estilos
- Tailwind v4 con tokens CSS (`bg-background`, `text-foreground`, `text-crown`, `text-queens`, `bg-muted`, `border-border`). **Nunca hardcodear hex** en JSX — siempre usar tokens.
- Mobile: NativeWind con la paleta sincronizada vía `packages/ui/tokens.ts`.
- Spacing en múltiplos de 4. Radios: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`.

## Estado / data
- **Server**: `await supabase.from(...).select(...)` directo en RSC o Server Actions.
- **Cliente**: TanStack Query para mutaciones y subscripciones realtime. Zustand solo para estado UI verdaderamente cross-component (filtros globales, modales).

## Errores
- En boundaries (server actions, API routes): nunca lanzar al cliente, devolver `{ ok: false, error: 'mensaje en español' }`.
- En lógica interna pura: lanzar `Error` con mensaje técnico. Domain functions pueden tirar — la capa que las consume catchea.

## Migraciones DB
- **Nunca modificar una migración aplicada**. Si ya corrió, crear nueva.
- Nombre: `YYYYMMDDHHMMSS_descripcion_breve.sql` (UTC).
- Toda tabla nueva debe traer su `enable row level security` + policies en la misma migración.

## Commits — conventional
- Formato: `tipo(scope): mensaje en español`.
- Tipos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `build`, `ci`.
- Scopes habituales: `web`, `mobile`, `domain`, `supabase`, `ui`, `landing`.
- Cuerpo del commit en español. Líneas ≤ 72 caracteres.

Ejemplos:
- `feat(web): inscripcion de equipos a torneo con stub de pagos`
- `fix(domain): ranking por categoria ignoraba Queens`
- `chore(supabase): regen types tras migracion 0003`

## Tests
- Cobertura selectiva: **siempre** en lógica de cálculo de ranking (`packages/domain/src/ranking/*`), generador americano, y flow de pagos cuando exista.
- Vitest cuando se agregue. Por ahora tests manuales en `*.test.ts` con sufijo claro.

## Loading & empty states
- Toda lista visible debe contemplar: `loading`, `empty`, `error`. No mostrar `[]` desnudo.
- Loading: skeleton si tarda >200ms. Spinner solo para acciones de botón.
- Empty: copy en primera persona "Aún no tienes torneos. Inscribe tu equipo." + CTA primario.

## Performance
- Imágenes: siempre `next/image` o `<CdnImage>`. Width/height obligatorios.
- Listas largas: virtualizar (>50 items) con `react-virtuoso`.
- RSC: nunca importar lib pesada cliente desde el árbol server (validate con `next/dynamic`).

## Branding & dual brand
- Variables CSS: `--crown` (PadelKing dorado) y `--queens` (magenta). Agregar `.theme-queens` en cualquier subtree para hacer swap automático.
- Componentes dual-brand: nunca renderizar el mismo CTA con dos colores en la misma vista. Define el brand del scope antes de renderizar.
