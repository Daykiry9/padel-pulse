# Padel Pulse

> Comunidades, torneos americanos y rankings de pádel para Colombia.

Padel Pulse es una plataforma para gestionar el ecosistema del pádel desde la comunidad: parches de amigos, equipos de clubes y jugadores se inscriben en torneos americanos, suman puntos en rankings mensuales/trimestrales/semestrales/anuales y compiten entre comunidades a nivel ciudad y país.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Web**: Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui + TypeScript
- **Mobile**: Expo SDK 53 (React Native) + NativeWind v4 + TypeScript
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions, RLS)
- **CDN/Imagenes**: Supabase Storage
- **Tipos compartidos**: `@padel-pulse/domain`, `@padel-pulse/supabase`

## Estructura

```
padel-pulse/
├── apps/
│   ├── web/                 # Landing + dashboard + torneos (Next.js)
│   └── mobile/              # App iOS/Android (Expo)
├── packages/
│   ├── domain/              # Tipos y reglas de negocio (torneos, ranking ELO)
│   ├── supabase/            # Cliente Supabase + tipos generados
│   ├── ui/                  # Design tokens y utilidades compartidas
│   ├── tsconfig/            # tsconfigs base
│   └── eslint-config/       # ESLint compartido
├── supabase/
│   ├── migrations/          # SQL migrations
│   └── seed.sql             # Datos de prueba
└── turbo.json
```

## Quick start

```bash
# 1. Instalar dependencias (raíz)
pnpm install

# 2. Copiar env vars
cp .env.example .env

# 3. Dev web
pnpm --filter web dev

# 4. Dev mobile (en otra terminal)
pnpm --filter mobile dev
```

## MVP (v0.1)

- [x] Monorepo + tooling
- [ ] Auth (email + Google) via Supabase
- [ ] Onboarding de jugador y creación de comunidad
- [ ] CRUD de comunidades con miembros y escudo
- [ ] Creación de torneo americano (por club admin)
- [ ] Inscripción de comunidades a torneo
- [ ] Generador automático de rondas americanas
- [ ] Marcador y confirmación de resultados
- [ ] Ranking de comunidades (mes/trimestre/semestre/año)
- [ ] Landing page profesional
- [ ] Despliegue web (Vercel) + mobile (EAS)

## Roadmap (v0.2+)

- Pagos con Wompi (inscripción a torneos)
- Modo espectador en vivo (Realtime bracket)
- Sponsor slots por torneo
- Insignias/Logros y gamification
- Stories auto-generadas (podio + foto)
- Sistema de retos entre comunidades
- Heatmap geográfico Colombia
- Tarjeta digital de comunidad (QR)
- Notificaciones push (Expo Notifications)

## Licencia

UNLICENSED — privado.
