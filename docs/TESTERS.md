# Cómo repartir la app a los testers

Mensaje listo para copiar y pegar, y el detalle de por qué cada link es como es.

---

## Mensaje para mandar (WhatsApp)

```
Parce, gracias por ayudarme con PadelKing 🎾

📱 Si tienes ANDROID:
1. Abre este link y dale "Convertirme en tester":
   https://play.google.com/apps/testing/co.padelking.app
2. Después descarga la app aquí:
   https://play.google.com/store/apps/details?id=co.padelking.app

Importante: entra al primer link con la MISMA cuenta de Google
del correo que me pasaste, si no no te va a dejar.

🍎 Si tienes iPHONE:
Abre https://padelking.co en Safari, toca el botón de Compartir
y luego "Añadir a pantalla de inicio". Te queda el ícono igual
que una app.

Con crear cuenta y entrar una vez ya me ayudas un montón. Si algo
se ve raro, mándame pantallazo.
```

---

## Por qué en ese orden

**El link de la ficha de Play no funciona solo.** A quien no haya aceptado
antes, `play.google.com/store/apps/details?id=co.padelking.app` le dice que la
app no existe: es una prueba cerrada, la ficha solo se vuelve visible después
de aceptar. Por eso el link de opt-in va primero y el de descarga después.

**El opt-in exige la cuenta de Google del correo en la lista.** Si alguien lo
abre con otra cuenta de Google (la del trabajo, por ejemplo) no lo va a dejar
unirse, y no es obvio por qué falla.

**Un iPhone no puede instalar la versión de Android.** No es un detalle de
configuración: la prueba cerrada se entrega por la Play Store, que solo existe
en Android. Un tester con iPhone puede aparecer como invitado pero sus
instalaciones y sesiones se quedan en 0 para siempre, y no suma para el
requisito de los 12 de Google.

**La PWA cubre iPhone sin esperar nada.** `padelking.co` es instalable
(ver `apps/web/public/sw.js` y `src/components/pwa-install.tsx`). No pasa por
ninguna tienda, así que no hay revisión ni demora. Es lo que sirve hoy.

---

## Estado del cupo de Google (2026-08-07)

Google exige, para pedir acceso a producción:

1. Publicar una versión de prueba cerrada — hecho
2. **12 testers que hayan aceptado** — el contador va en 0
3. Correr la prueba **14 días** con esos 12 sosteniéndose

En la lista `First version int` hay **13 correos**, pero eso no es lo mismo que
12 testers. De esos 13:

- 3 son cuentas propias de Juan (`daikydev`, `juan.vergara@influur`, `juanesvgarcia`)
- 3 son iPhone confirmados (Danny, Nath, Vanesa) → no pueden instalar
- 2 son Android confirmados (Tole, Enano)
- 5 sin identificar

En el mejor caso quedan 10 que puedan instalar. **Falta reclutar 3 a 5 más.**
Apuntar a 17-18 correos en la lista para que sobrevivan 12 Android.

No hace falta encuestar a nadie sobre su teléfono: manda el mensaje a todos y
el contador de instalaciones de la consola hace el censo solo.

---

## Pendiente: link público de TestFlight

Para iOS lo ideal es un link público de TestFlight (cualquiera se une sin que lo
agregues, hasta 10.000). Requiere crear un grupo externo en App Store Connect,
lo que dispara una revisión beta de Apple (rápida, no es la del App Store).

El build 1.2 ya está procesado y la información de pruebas está completa, así
que solo falta crear el grupo. Cuando exista, se reemplaza el bloque de iPhone
del mensaje por ese link.
