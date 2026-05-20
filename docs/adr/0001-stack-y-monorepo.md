# ADR-0001 — Stack técnico y monorepo

- **Fecha**: 2026-05-20
- **Estado**: aceptado

## Contexto

PadelKing necesita web + mobile desde el día 1 (App Store, Play Store y web hosteada). Un solo dev arrancando, presupuesto bajo, ambición de escalar a 10k+ usuarios sin reescribir. El super-prompt del proyecto sugiere Next.js + React Native (Expo) + Supabase y pide validar la decisión.

## Decisión

**Monorepo Turborepo + pnpm workspaces** con dos apps y cuatro packages compartidos:

```
apps/web      → Next.js 15 (App Router, RSC, Tailwind v4, shadcn/ui)
apps/mobile   → Expo SDK 53 (Expo Router, NativeWind v4)
packages/domain    → tipos + lógica pura (ranking, americano)
packages/supabase  → clientes browser/server/service + tipos DB generados
packages/ui        → design tokens compartidos
packages/tsconfig  → tsconfigs base
```

Backend: **Supabase Cloud** (Postgres + Auth + Storage + Realtime). RLS habilitado en cada tabla.

## Alternativas consideradas

| Opción | Por qué se descartó |
|---|---|
| **PWA-first (sin React Native)** | Notificaciones push y publicación en App Store / Play Store son requisito desde el inicio del super-prompt. La PWA sería una concesión grande para UX móvil nativa. |
| **Next.js + Capacitor** | Empaqueta Next.js como nativo pero la UX móvil queda mediocre (animaciones, gestures, performance). En padel, el dashboard del organizador en vivo necesita 60fps. |
| **Solo Expo + React Native Web** | Web de Next.js gana ampliamente en SEO/landing/SSR. La landing es crítica para conseguir comunidades fundadoras. |
| **Firebase** | NoSQL complica rankings con queries complejas (top-N por comunidad con filtros temporales). Multi-tenant con RLS es más natural en Postgres. |
| **Backend propio (Node + Prisma + Neon)** | Suma 4-6 semanas al MVP que Supabase nos da gratis (Auth, Storage, Realtime, gen types). Si Supabase no escala lo migramos en v2. |

## Consecuencias

**Positivas**
- Tipos compartidos web ↔ mobile vía `@padelking/domain` y `@padelking/supabase`.
- Una sola fuente de truth para la lógica de ranking (probada en TS, ejecutada en TS).
- Supabase nos ahorra Auth + Storage + Realtime + emails de OTP.
- Deploy web en Vercel y mobile en EAS, ambos con CI built-in.

**Negativas**
- Expo + Next.js en monorepo requiere metro.config + babel.config con plugins NativeWind — friccion inicial al setup.
- Supabase tiene vendor lock-in. Mitigación: la lógica de dominio vive en `packages/domain` sin tocar Supabase, y los clientes están encapsulados en `packages/supabase`.
- React 19 + Next 15 + RSC obliga a entender el modelo server/client. Mitigación: convenciones explícitas en `CONVENTIONS.md`.

## Revisitar si

- Supabase pricing se vuelve prohibitivo (>$500/mes) o latencia desde Colombia es mala — evaluar Neon + auth propio.
- React Native se vuelve un blocker para una feature crítica — evaluar Tauri Mobile o nativo puro.
- Mobile crece tanto que requiere su propio repo — split en ese momento, no antes.
