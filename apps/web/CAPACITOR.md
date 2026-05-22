# Capacitor — wrapper nativo Android/iOS de PadelKing

Capacitor envuelve la web app desplegada en Vercel y la sube a Play Store + App Store sin reescribir nada. Un solo codebase, 3 canales (web + Android + iOS).

## Setup primera vez

Requisito: tener **Android Studio** instalado con un emulador o un dispositivo Android.

```bash
cd apps/web

# Una sola vez: scaffolds /android folder
pnpm cap:add:android

# Sync (cada vez que cambias capacitor.config.ts o instalas plugins nuevos)
pnpm cap:sync

# Abre Android Studio para buildear/correr en emulador
pnpm cap:open:android

# O directamente correr en device/emulator
pnpm cap:run:android
```

## Modo de operación

`capacitor.config.ts` apunta a `server.url` (la URL de Vercel en producción). Esto significa que la app nativa **carga remotamente** el sitio — no hay bundle de la web app en el APK. Pros y contras:

**Pros:**
- Deploys instantáneos: subes a Vercel y todos los users ven el update inmediato.
- APK super liviano (<5 MB).
- Cero divergencia entre web y mobile.

**Contras:**
- Sin internet, la app no funciona. Workaround: agregar Service Worker en la web (PWA) para offline básico.
- iOS App Store es estricto con "thin wrappers" — pueden rechazar. Workaround: ofrecer features nativos exclusivos (push, biometrics, share sheet) que justifiquen la app.

## Cambiar la URL de producción

Cuando salgas a stores con dominio final (`padelking.co` o similar), edita `apps/web/capacitor.config.ts`:

```ts
server: { url: 'https://padelking.co' }
```

Y re-sync: `pnpm cap:sync`. Luego rebuild el APK desde Android Studio.

## Publicar a Play Store

1. Crear cuenta de developer en Play Console ($25 USD una vez, persona natural OK).
2. En Android Studio: `Build > Generate Signed Bundle / APK` → AAB (Android App Bundle).
3. Subir el `.aab` a Play Console como nuevo release interno.
4. Llenar ficha (descripción, screenshots de la web mostrada en el wrapper, política de privacidad).
5. Esperar revisión (~3-7 días la primera vez).

## Publicar a App Store

**Esperar hasta primer sponsor o 100 MAU** — Apple Developer es $99 USD/año y la revisión es más estricta. Cuando tengas ROI:

```bash
pnpm add -D @capacitor/ios -F web
pnpm cap:add:ios   # requiere macOS + Xcode
```

## Permisos y plugins futuros

Cuando agreguemos push notifications, share, camera (para subir fotos de perfil del jugador), etc., se instalan plugins:

```bash
pnpm add @capacitor/push-notifications @capacitor/share @capacitor/camera -F web
pnpm cap:sync
```

Cada plugin requiere configurar permisos en `android/app/src/main/AndroidManifest.xml` (que se autogenera al hacer `cap add android`).

## Gitignore

El folder `apps/web/android/` que crea `cap add android` no debe commitearse completo. Se autogeneran build artifacts pesados. El `.gitignore` de apps/web/ ya cubre estos paths (`.next/`, `node_modules/`); cuando agregues android, también ignorar:

- `android/.gradle/`
- `android/app/build/`
- `android/build/`
- `android/.idea/`
- `android/local.properties`

Sí commiteable: `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`, `android/app/src/main/res/` (íconos, splash).
