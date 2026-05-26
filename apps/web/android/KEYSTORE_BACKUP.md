# Android Release Keystore — Backup & Recovery

> **CRÍTICO**: si se pierde este keystore o su password, **no podemos
> actualizar la app en Google Play Store NUNCA MÁS** (los updates deben
> estar firmados con el MISMO keystore con el que se subió la versión
> inicial). Tampoco se puede regenerar — Google no proporciona recovery
> sin Play App Signing enrollment.

## Parámetros del keystore

| Campo | Valor |
|---|---|
| Archivo | `padelking-release.keystore` |
| Ubicación operativa | `apps/web/android/app/padelking-release.keystore` (gitignored) |
| Alias | `padelking` |
| Algoritmo | RSA 2048-bit |
| Algoritmo firma | SHA384withRSA |
| Validity | 25000 días (vence ~2094) |
| Distinguished Name | `CN=PadelKing, O=PadelKing, L=Bogotá, ST=Cundinamarca, C=CO` |
| Generado | 2026-05-25 |

## Locations de backup (3 copias mínimo)

1. **SSD portátil offline** — cifrado con BitLocker. Volumen autenticado solo con password conocida por el owner del proyecto. Custodio: Juan Vergara.
2. **Password manager** — `.keystore` como attachment + password como secure note.
3. **(Pendiente)** — copia adicional offsite (ej. drive cifrado en bóveda física o cloud encriptado independiente). Mientras la app esté en beta no es bloqueante, pero antes de salir a producción ABIERTA conviene tener una 3ra copia.

## Configuración del build

El archivo `apps/web/android/app/keystore.properties` (gitignored) contiene los paths/passwords que `build.gradle` usa para firmar:

```properties
storeFile=padelking-release.keystore
storePassword=<password>
keyAlias=padelking
keyPassword=<password>
```

Para usuarios nuevos del repo:

1. Recibir el `.keystore` por canal seguro (no email, no Slack/WhatsApp).
2. Copiar a `apps/web/android/app/padelking-release.keystore`.
3. Copiar `keystore.properties.example` → `keystore.properties`.
4. Editar `keystore.properties` con la password real.
5. Verificar: `./gradlew bundleRelease` debe completar y producir `app-release.aab` firmado.

## Verificar firma de un `.aab` o `.apk`

```powershell
$env:JAVA_HOME = "F:\Android Studio\jbr"
& "$env:JAVA_HOME\bin\jarsigner.exe" -verify -verbose:summary -certs `
  "apps\web\android\app\build\outputs\bundle\release\app-release.aab"
```

La firma DEBE mostrar:
- `X.509, CN=PadelKing, O=PadelKing, L=Bogotá, ST=Cundinamarca, C=CO`
- `SHA384withRSA, 2048-bit key`

La advertencia "Invalid certificate chain" es esperada (self-signed); NO indica problema.

## Si el keystore se compromete

1. **Inmediatamente revocar la app en Play Console** y subir una versión nueva firmada con un keystore distinto.
2. **NO posible si Play App Signing no estaba enrolled** — en ese caso hay que publicar como nueva app con appId distinto.
3. Notificar a usuarios sobre la nueva app.

## Play App Signing (recomendado activarlo en primera subida)

Google ofrece un servicio que custodia el "app signing key" en su lado y nosotros mantenemos un "upload key" separado. Si el upload key se pierde, Google nos deja resetearlo. **Activar al subir la primera versión a Play Console**. Una vez activado, el upload key es el que firma los `.aab` que subimos, y el `padelking-release.keystore` actual se convierte en ese upload key.

## Operaciones rotativas

- **No** rotar el keystore — sería el equivalente a perderlo.
- **Sí** rotar la password del keystore cada 12-24 meses (o si se sospecha compromiso). Para hacerlo:
  ```powershell
  & "F:\Android Studio\jbr\bin\keytool.exe" -storepasswd `
    -keystore "apps\web\android\app\padelking-release.keystore"
  ```
  Después actualizar `keystore.properties` y la entrada en password manager.
