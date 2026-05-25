# Capacitor — wrapper nativo Android/iOS de PadelKing

Capacitor envuelve la web app desplegada en Vercel (`padelking.co`) y la publica como app nativa en Play Store + App Store. Un codebase, 3 canales (web + Android + iOS).

## Estado actual (2026-05-25)

- ✅ Capacitor 8.3.4 instalado + configurado (`co.padelking.app`, `padelking.co`)
- ✅ Plugins runtime: `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/keyboard`, `@capacitor/app`
- ✅ Devtool: `@capacitor/assets` (genera íconos + splash en todos los tamaños)
- ✅ Web App Manifest + íconos PWA (apps/web/public/manifest.json + apps/web/public/icons/)
- ✅ Android project scaffold (apps/web/android/) con plugins registrados
- ✅ Assets nativos Android generados (mipmap-* + drawable-* para portrait/landscape/day/night)
- ⏳ Decisiones store-ready (versión, signing, listing): pendientes
- ⏳ iOS: pendiente (vamos vía EAS Build remoto, sin Mac propio inicialmente)

## Source assets (regenerables)

| Archivo | Tamaño | Para qué |
|---|---|---|
| `apps/web/assets/icon-only.png` | 1024×1024 | Source de todos los íconos. Copia del isotipo final-system/01. |
| `apps/web/assets/splash.png` | 2732×2732 | Source del splash (isotipo centrado al 30% sobre `#0a0a0a`). |
| `apps/web/assets/splash-dark.png` | 2732×2732 | Variant dark (igual al claro por ahora). |

Si cambia el isotipo: regenerar con:
```bash
cd apps/web
node scripts/generate-splash.mjs              # splash.png + splash-dark.png
node scripts/generate-pwa-icons.mjs           # public/icons/* + public/apple-touch-icon.png + favicons
npx capacitor-assets generate --android \
  --iconBackgroundColor '#0a0a0a' --iconBackgroundColorDark '#0a0a0a' \
  --splashBackgroundColor '#0a0a0a' --splashBackgroundColorDark '#0a0a0a'
```

## Workflows habituales

```bash
cd apps/web

# Después de instalar plugins nuevos o cambiar capacitor.config.ts
pnpm cap:sync

# Abrir Android Studio para buildear/correr
pnpm cap:open:android

# Correr en device/emulator
pnpm cap:run:android
```

## Modo wrapper

`capacitor.config.ts` apunta a `server.url: 'https://padelking.co'`. La app nativa **carga remotamente** el sitio — no hay bundle de la web app en el APK.

**Pros:**
- Deploys instantáneos: subes a Vercel y todos los users ven el update inmediato.
- APK super liviano (<5 MB).
- Cero divergencia entre web y mobile.

**Contras:**
- Sin internet, la app no funciona. No usamos service worker offline porque puede servir cache stale al WebView nativo después de deploys de Vercel.
- iOS App Store es estricto con "thin wrappers" — pueden rechazar. Mitigación: features nativos (splash, status bar, share sheet, deep links) que justifiquen la app.

## App ID y dominio

| Campo | Valor |
|---|---|
| `appId` (bundle ID) | `co.padelking.app` |
| `appName` | `PadelKing` |
| `server.url` | `https://padelking.co` |
| Dominio | `padelking.co` (Namecheap, DNS a Vercel) |
| Theme color | `#0a0a0a` (consistente con `--background` de Tailwind) |

## Publicar a Play Store

1. Crear cuenta de developer en Play Console ($25 USD una vez, persona natural OK).
2. En Android Studio: `Build > Generate Signed Bundle / APK` → AAB (Android App Bundle).
   - Generar keystore PRIMERA VEZ. **Backup en 1Password — si se pierde, no podés actualizar la app nunca más.**
3. Subir el `.aab` a Play Console como nuevo release interno.
4. Llenar ficha (descripción, screenshots, política de privacidad).
5. Esperar revisión (~3-7 días la primera vez).

## Publicar a App Store

1. Apple Developer ($99 USD/año).
2. **Builds iOS sin Mac propio** — orden de preferencia:
   - **Codemagic plan gratuito** (500 min/mes en macOS M2). Setup 2-3 hs, después builds gratis. Configurar via UI: agregar repo de GitHub + workflow `.yaml` con `ios-capacitor` template.
   - **GitHub Actions con macOS runner** (~200 min/mes gratis en plan Free) como fallback si se agotan los minutos de Codemagic.
   - **NO usar EAS Build** ($29/mes) — innecesario hasta validar que el volumen de builds justifica el costo.
3. App Store Connect → upload via Transporter / Application Loader o directo desde Codemagic CI.
4. Revisión Apple ~1-3 días.

## Permisos y plugins futuros

Cuando agreguemos features nativas:

```bash
# Compartir story a Instagram/WhatsApp con share sheet nativo
pnpm --filter web add @capacitor/share

# Abrir links externos (Wompi, Instagram callback) sin salir de la app
pnpm --filter web add @capacitor/browser

# Push notifications (v0.3)
pnpm --filter web add @capacitor/push-notifications

pnpm cap:sync
```
