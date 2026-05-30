# Store Listing — Play Store + App Store

Información lista para pegar en las fichas de Play Console y App Store Connect cuando se vaya a publicar. Versionado en repo para que cualquier persona del equipo encuentre lo mismo y no se reescriba en frío.

---

## 1. Identidad común

| Campo | Valor |
|---|---|
| Nombre app (display) | PadelKing |
| Nombre legal del developer | PadelKing |
| Bundle / Application ID | `co.padelking.app` |
| Categoría | Sports (Deportes) |
| Sub-categoría iOS | Sports |
| Idioma principal | Español (Colombia) — `es-CO` |
| Sitio web | https://padelking.co |
| Email de soporte | hola@padelking.co |
| Política de privacidad | https://padelking.co/privacy |
| Términos | https://padelking.co/terms |
| Edad objetivo | 13+ |

---

## 2. Descripción corta (Play Store — 80 chars)

> La liga amateur del pádel colombiano. Torneos, comunidades y ranking nacional.

(79 chars, dentro del límite.)

## 3. Subtítulo (App Store — 30 chars)

> La liga del pádel colombiano

(28 chars.)

## 4. Promo text (App Store — 170 chars, editable sin re-review)

> Apúntate al americano del finde, súmale puntos a tu ranking y desafía a tu parche. Pádel amateur con la seriedad de la Kings League y la energía de un parche real.

## 5. Descripción larga (Play Store — 4000 chars)

```
PadelKing es la liga amateur del pádel colombiano. Una app pensada para
jugadores reales: los que se inscriben al americano del finde, suben al
ranking, arman parche y persiguen el siguiente torneo.

QUÉ PUEDES HACER

· Inscribirte a torneos de tu ciudad en segundos — sin formularios eternos.
· Jugar americano random (parejas rotativas) o americano fijo. Soporte para
  más formatos en camino.
· Reportar marcadores desde la cancha. La otra pareja confirma o disputa, y
  el organizador resuelve si hay desacuerdo.
· Ver el bracket en vivo, ronda por ronda, mientras se juega.
· Subir en el RANKING NACIONAL — los puntos vienen de torneos reales y
  pesan según el tier (competitivo > social).
· Unirte a COMUNIDADES (parches) y organizar torneos internos con tu grupo.
· Crear EQUIPO con tu compañero/a fijo, llevar el récord juntos.

DOS LIGAS, UN ECOSISTEMA

· PadelKing — masculino y mixto, categorías 1 a 6.
· PadelQueens — femenino, categorías A a D.

POR QUÉ NO ES OTRA APP MÁS

· Hecha en Colombia, para clubes y comunidades reales del país.
· Diseñada para que el ORGANIZADOR del torneo no sufra: cierra inscripciones,
  genera el bracket de un toque, reporta marcadores y la app calcula los puntos.
· Identidad propia. Tipografía editorial, dorado y negro. Inspiración Kings
  League, sin imitar a nadie.
· Ranking transparente: ves cómo se calculan tus puntos, no hay magia.

GRATIS DURANTE LA BETA

PadelKing está abierto sin costo para jugadores durante la beta. Cuando
salgamos de beta, jugar y aparecer en el ranking seguirá siendo gratuito;
las funciones premium serán para clubes y organizadores.

QUÉ DATOS PEDIMOS

Nombre, email y categoría son lo único obligatorio. Teléfono, fecha de
nacimiento, Instagram y posición preferida son opcionales y solo sirven
para entregarte recompensas y premios de sponsors cuando juegues torneos.
Toda la política está explicada en https://padelking.co/privacy.

CONTACTO

Email: hola@padelking.co
Instagram: @padelking
Web: https://padelking.co
```

(≈2.4k chars, espacio para crecer.)

## 6. Descripción larga (App Store — 4000 chars)

Misma descripción. Apple permite el mismo cuerpo. Asegurarse de NO usar emojis (Apple los desincentiva en descripción).

## 7. Keywords (App Store — 100 chars, separadas por coma)

```
padel,pádel,torneos,padel colombia,ranking padel,liga padel,americano padel,padelqueens,kings league
```

(98 chars, dentro del límite.)

> Tip: NO repetir palabras del título ni del subtítulo (Apple las indexa solo una vez).

---

## 8. Screenshots — guía de qué tomar

### Play Store
- **Phone screenshots**: mínimo 2, máximo 8. Recomendado 1080×1920 (portrait).
- **Feature graphic**: obligatorio, 1024×500 (sin transparencia, lo mira mucho Google).

### App Store
- **iPhone 6.7" (Pro Max)**: 1290×2796 — obligatorio mínimo 1, recomendado 4-5.
- **iPhone 6.5"**: 1284×2778 — opcional, Apple los deriva del 6.7" si no los subes.
- **iPad** (si planeás iPad): 2048×2732 — opcional, podés deshabilitar iPad en la app.

### Las 6 pantallas a capturar (mismo orden para ambas stores)

1. **Dashboard `/app`** — con torneo destacado + ranking del user. Captar la jerarquía visual del hero ("nombre gigante" + stat-line).
2. **Detalle torneo público `/tournaments/[slug]`** — categoría, inscritos, botón "Inscribirme como jugador".
3. **Torneo en vivo `/tournaments/[slug]/live`** — bracket con marcadores reales, alguno en `pending_confirmation`.
4. **Ranking nacional `/rankings`** — top 20 con avatares y puntos.
5. **Perfil propio `/app/profile`** — ELO, categoría, ciudad, link a perfil público.
6. **Comunidad `/app/communities/[slug]`** — miembros + torneos internos.

### Cómo capturarlas
```
# Emulador Android (Pixel 7 Pro recomendado, 1080x2400)
# 1. Levantar la app
pnpm -F web exec cap run android

# 2. Tomar screenshot (PNG en clipboard o archivo)
adb exec-out screencap -p > screenshots/01-dashboard.png
```

Para iPhone se hace lo mismo con el simulador (Codemagic genera una build, después se corre en simulador local de un Mac prestado o se usan los screenshots Android reescalados — Apple acepta ese workaround si la UI es la misma).

---

## 9. Data Safety form (Play Store) — borrador de respuestas

Google pregunta tabla campo-por-campo. Borrador:

| Tipo de dato | Recolectado | Compartido con 3ros | Encriptado en tránsito | Borrable por usuario | Propósito |
|---|---|---|---|---|---|
| Email | Sí | No | Sí | Sí | Account management, comms |
| Nombre | Sí | No | Sí | Sí | Account management |
| Teléfono | Sí (opcional) | No | Sí | Sí | Notifications, prize delivery |
| Fecha de nacimiento | Sí (opcional) | No | Sí | Sí | Personalization |
| Instagram handle | Sí (opcional) | No | Sí | Sí | Social, tournament tagging |
| Ciudad | Sí (opcional) | No | Sí | Sí | App functionality (matchmaking) |
| Resultados deportivos (matches, ELO) | Sí | No | Sí | Sí | App functionality |
| Crash logs | No (por ahora) | — | — | — | — |
| Advertising ID | No | — | — | — | — |
| Precise location | No | — | — | — | — |

**Security practices declaradas:**
- Data is encrypted in transit ✅ (HTTPS por Vercel + Supabase)
- Users can request data deletion ✅ (botón en /app/profile)
- Independent security review ❌ (todavía no)
- Following Families Policy ❌ (no orientado a niños)

---

## 10. Privacy Nutrition Labels (App Store) — borrador de respuestas

Apple pregunta por *categorías* de datos. Borrador:

**Data Linked to You** (linkeado a la identidad del user):
- Contact Info: Email Address, Phone Number, Name
- User Content: Other User Content (opcional: Instagram handle)
- Identifiers: User ID (Supabase UUID)
- Usage Data: Product Interaction (resultados de matches, registros a torneos)

**Data Not Linked to You**: ninguno por ahora.

**Data Used to Track You**: ninguno (no usamos advertising IDs ni cross-app tracking).

---

## 11. Demo account para review de Apple

App Review necesita credenciales que funcionen sin tener que registrarse:

```
Email: demo@padelking.co
Password: <crear y guardar en password manager — anotar acá el día del submit>
```

Crear esta cuenta con un torneo de prueba activo + 2 comunidades para que el reviewer vea features funcionando.

> ⚠️ Si la cuenta cae con la limpieza de DB, hay que recrearla antes del submit.

---

## 12. Versionado de la app

| Plataforma | Campo | Valor inicial |
|---|---|---|
| Android | `versionCode` | 1 |
| Android | `versionName` | 1.0 |
| iOS | `CFBundleShortVersionString` | 1.0 |
| iOS | `CFBundleVersion` (build) | autoincremental vía Codemagic |

Bumps:
- **versionCode** (Android): debe subir +1 en CADA upload a Play Console.
- **versionName** (Android) y **shortVersion** (iOS): semver visible al usuario. Bumpamos solo en releases reales (1.0 → 1.1 → 1.1.1).

---

## 13. Generar el AAB release (Android)

Bloqueador conocido: requiere `JAVA_HOME` apuntando a la JDK que viene con Android Studio.

```powershell
# 1. Abrir Android Studio una vez (inicializa JAVA_HOME y bundleed JDK).
# 2. En PowerShell o desde Android Studio Terminal:
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd F:\Desktop\Dev\padelScore\apps\web\android
.\gradlew bundleRelease

# Output:
# apps/web/android/app/build/outputs/bundle/release/app-release.aab
```

El AAB queda **firmado** con `padelking-release.keystore` (gitignored, backup en password manager + SSD).

Verificar firma antes de subir:
```powershell
jarsigner -verify -verbose -certs app-release.aab
```

---

## 14. Generar el IPA release (iOS) — vía Codemagic

Una vez que Gabriel pague Apple Developer ($99/año) y el bundle ID `co.padelking.app` esté registrado en Apple Developer:

1. **Conectar Codemagic** al repo (free plan: 500 min/mes en M2).
2. **Crear App Store Connect API Key** en https://appstoreconnect.apple.com/access/integrations/api → guardar el `.p8` y el Key ID + Issuer ID.
3. **En Codemagic**: Settings → Integrations → App Store Connect → pegar credenciales. Nombrar la integration "PadelKing ASC".
4. **Crear environment variable group** "app_store_credentials":
   - `APP_STORE_APPLE_ID` = el numeric ID que App Store Connect te da después de crear la app.
5. **Trigger primer build**: pushar un tag `git tag ios-v1.0.0 && git push --tags` o disparar manual desde el UI.
6. Codemagic ejecuta `codemagic.yaml` → workflow `ios-testflight` → IPA firmado → upload a TestFlight.

Logs a vigilar en el primer run:
- `app-store-connect fetch-signing-files` (genera cert + provisioning profile si no existen).
- `xcode-project build-ipa` (debería terminar en `App.ipa`).
- Publishing → TestFlight: revisar que el build aparezca en App Store Connect → TestFlight tab a los ~10 min.

---

## 15. Checklist pre-submit (los rejection traps comunes)

### Play Store
- [ ] AAB firmado con `padelking-release.keystore` (NO con debug)
- [ ] `versionCode` mayor que la versión actual en producción (si hay)
- [ ] Target SDK ≥ 34 ✅ (ya está en 36)
- [ ] Min SDK ≤ 24 ✅
- [ ] Política de privacidad accesible sin login ✅ (`/privacy` es public)
- [ ] Data Safety form completo
- [ ] Content rating cuestionario respondido
- [ ] Screenshots subidas (mín 2)
- [ ] Feature graphic 1024×500 subida
- [ ] Icon 512×512 subido (lo tenemos en `assets/icon.png`)
- [ ] Cuenta de developer verificada (Google manda email a confirmar identidad)

### App Store
- [ ] Build subido vía TestFlight y testeado ANTES de submit
- [ ] **Sign in with Apple funciona** ✅ código listo, validar en TestFlight
- [ ] **Account deletion in-app funciona** ✅ `/app/profile` → "Eliminar mi cuenta"
- [ ] Privacy policy URL en App Store Connect
- [ ] Privacy Nutrition Labels completas
- [ ] Screenshots iPhone 6.7" subidos (mín 1)
- [ ] Demo account creado y testeado
- [ ] Demo account credentials pegados en App Review Notes
- [ ] App Review Notes: explicar que es wrapper de padelking.co y listar features nativos (splash, status bar, Sign in with Apple, in-app account deletion) para mitigar rechazo por "thin wrapper" (Guideline 4.2).

---

## 16. Tiempos esperados (best case)

| Hito | Duración |
|---|---|
| Crear cuentas + verificación developer (Play) | 1-2 días |
| Crear cuenta Apple Dev (Gabriel) | mismo día - 48h |
| Configurar Codemagic + primer IPA en TestFlight | medio día |
| Llenar listings (Play + ASC) | 4 horas con material listo |
| Review Play Store (1ra vez) | 3-7 días |
| Review App Store (1ra vez) | 1-3 días (más probable rechazo + 2do ciclo) |
| **Total Play Store live** | ~1 semana desde hoy |
| **Total App Store live** | ~2 semanas desde hoy (asumiendo 1 ciclo de rechazo) |
