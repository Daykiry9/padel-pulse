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

## Estado del cupo de Google (2026-08-28)

Google exige tres cosas para habilitar el botón "Solicitar acceso a producción":

1. Publicar una versión de prueba cerrada — **hecho** (`alpha`, release `final test`, 6 ago)
2. 12 testers que hayan aceptado — **hecho el 28 de agosto**
3. Correr la prueba **14 días** con esos 12 sosteniéndose — **pendiente**

El criterio 3 no cuenta desde que publicaste la versión: cuenta días continuos
con 12 o más testers aceptados. El umbral se cruzó el 28 de agosto, así que la
fecha objetivo es alrededor del **11 de septiembre de 2026**.

### El canal ya no usa lista de correos

`alpha` está configurado con **Grupo de Google**, no con lista privada:

    testers-community@googlegroups.com

Es el grupo del servicio de intercambio "Testers Community" (instalas apps de
otros para ganar créditos, gastas créditos para que instalen la tuya). Eso es lo
que llevó el contador de 11 a 12+; los 13 correos de conocidos por sí solos no
alcanzaban.

Consecuencia operativa: **la membresía es volátil**. En los servicios de
intercambio el tester instala, reclama su crédito y se sale. Si el conteo cae a
11 un solo día, el criterio 3 se rompe y el reloj de 14 días vuelve a cero.

- No cerrar la campaña en Testers Community antes del 11 de septiembre.
- Mantener colchón: apuntar a 18-20 aceptados, no a 12 exactos.
- Revisar el panel cada 2-3 días. Si el criterio 2 se destacha, hay que saberlo
  ese día, no dos semanas después.

### Riesgo del testeo recíproco

La solicitud de acceso a producción trae un cuestionario sobre qué se aprendió
de la prueba cerrada y cómo interactuaron los testers. Google cruza esas
respuestas con las métricas reales de engagement. Hay reportes públicos de
cuentas suspendidas cuando detectan testers que instalan y desinstalan sin uso
genuino.

Mitigación: usar estas dos semanas para conseguir uso real de los conocidos que
sí juegan pádel (Tole, Enano, los que se sumen). El cuestionario necesita
respuestas verdaderas sobre bugs encontrados y comportamiento de usuarios, y eso
un grupo de intercambio no lo produce.

---

## iOS

Ya no depende de testers. La versión 1.2 se envió a revisión del App Store el
2026-08-28 con publicación **manual**, así que al aprobarse no sale sola.

TestFlight externo nunca apareció para esta app (solo "PRUEBAS INTERNAS"), pero
dejó de ser bloqueante: iOS permite enviar a revisión con cero testers. Para
iPhone, mientras tanto, sigue sirviendo la PWA de `padelking.co`.
