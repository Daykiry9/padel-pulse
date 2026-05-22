# mobile-expo (archivado)

App nativa con Expo SDK 53 + NativeWind. **Pausada en 2026-05-22**.

## Por qué se pausó

1. El branding quedó en "Padel Pulse" (versión vieja del proyecto) y desincronizado del schema actual (post v3/v4 con Sumas y personal-first).
2. Para el path "gratis a stores" elegimos **Capacitor** como wrapper de la web app, no Expo nativo. Un solo codebase (`apps/web`) shipping a 3 canales (web + iOS + Android).
3. Como solo developer, mantener dos codebases divergentes es deuda técnica que no pagamos.

## Cuándo retomarla

- Si Capacitor no da el feel nativo suficiente en 6 meses (gestos, performance, push native).
- Si conseguimos un mobile developer dedicado.

## Para retomar

```bash
mv _archived/mobile-expo apps/mobile
pnpm install
# Rebrand: buscar/reemplazar "Padel Pulse" → "PadelKing" en apps/mobile/
# Sync schema: pnpm --filter @padelking/supabase gen:types
# Validar tipos compilan: cd apps/mobile && pnpm typecheck
```

El código sigue siendo válido como punto de partida — solo necesita rebrand + resync.
