# Respuesta a Apple — Guideline 2.1 Information Needed

Rechazo del 2026-08-27 sobre el envio `c8d0b50b-04a0-41a1-bc2f-a7282cd44398`
(version 1.2). No es un rechazo de contenido ni de 4.2: es el cuestionario
estandar que Apple manda a apps nuevas. Pide siete cosas.

El punto 1 (video en dispositivo fisico) es lo unico que no se puede producir
desde aca. Los puntos 2 a 7 estan resueltos abajo y ya viven en el campo
**Notes** de App Review Information, que es donde Apple pidio explicitamente
que quedaran para futuros envios.

---

## Texto cargado en App Review Information → Notes

```
PadelKing is a free tournament and ranking platform for amateur padel players.

DEVICES AND OS TESTED
iPhone (physical device) running the latest public iOS release, plus iPad.
The exact model and iOS version used for the attached recording are stated in
the Resolution Center reply.

WHAT THE APP DOES AND WHO IT IS FOR
Amateur padel in Colombia is organised over WhatsApp groups and paper brackets:
there is no shared record of results, no verified ranking and no way to find an
open tournament nearby. PadelKing fixes that. Organisers publish tournaments
(americano, express, league, single elimination); players register as a pair or
as a standing team; both sides confirm each match score; and an ELO rating plus
an ATP-style points table are recomputed automatically at player, team,
community and city level.

Target audience: amateur and semi-amateur padel players, community organisers
and clubs. All content is in Spanish. Two parallel competitive universes with
identical features: PadelKing (open and mixed categories) and PadelQueens
(women's categories).

HOW TO ACCESS THE MAIN FEATURES
No login is required to browse. The app opens directly on the public tournament
list; tournaments, brackets, standings and rankings are all readable while
signed out.

Demo account for participant-only features:
  Email: demo@padelking.co
  Password: PadelKingDemo2026
This account is already registered in two tournaments.

Suggested walkthrough:
1. Launch: public tournament list, no login wall.
2. Tap any tournament: schedule, categories, registration, live standings.
3. Ranking tab: player, team and community rankings (public).
4. Sign in with the demo account to reach "Mi actividad": registrations,
   matches awaiting confirmation, teams.
5. Tournament chat (participants only). Under any message from another user
   there is a control to Report the message or Block the author. Blocking hides
   every message from that user immediately and is enforced server-side.
6. Account deletion: Profile > "Zona peligrosa" > "Eliminar mi cuenta", then
   type ELIMINAR to confirm. The account and its personal data are deleted
   permanently. Please create a throwaway account to test this rather than the
   demo account, so the credentials above keep working for review.

Registration accepts email and password, Sign in with Apple, or Google. No
phone number, government ID or payment method is ever requested.

EXTERNAL SERVICES USED
- Supabase: authentication, PostgreSQL database and realtime updates. This is
  the only backend.
- Vercel: web hosting.
- Sign in with Apple and Google Sign-In: optional authentication providers.
- The iOS app is built with Capacitor, a native container that renders the
  PadelKing application.
There are no payment processors, advertising SDKs, analytics SDKs, AI services
or third-party data providers. The app is free, with no in-app purchases and no
subscriptions.

REGIONAL DIFFERENCES
None. Behaviour is identical in every region and no content is geo-restricted.
The interface is in Spanish and current tournaments are created by organisers
in Colombia, but any user in any region can register, browse and participate.

REGULATED INDUSTRY OR PROTECTED MATERIAL
Not applicable. PadelKing is not in a regulated industry. It offers no
gambling, betting or wagering, handles no prize money, and contains no
protected third-party material. The name, crown logo and visual identity are
owned by the developer.

DEVICE PERMISSIONS
The app requests none. There are no camera, photo library, location, contacts,
microphone or App Tracking Transparency prompts anywhere in the app.

USER-GENERATED CONTENT
Tournament chat, team names, community names and guest player names. Every
message from another user can be reported or its author blocked, per Guideline
1.2. Reports are queued for moderation; blocked users are filtered out by a
database policy, so the block applies to server rendering and to realtime
updates alike.
```

---

## Lo que falta: el video (punto 1)

Apple lo pide **grabado en un iPhone fisico**, empezando por el lanzamiento de
la app y recorriendo el flujo tipico. Tiene que mostrar, si o si:

- registro de cuenta, login y **eliminacion de cuenta**
- el contenido generado por usuarios con **reportar y bloquear**
- cualquier prompt de permisos (aca no hay ninguno, y eso conviene decirlo)

Como grabarlo sin tener iPhone propio:

1. Pedir prestado un iPhone (Danny, Nath o Vanesa).
2. Instalar TestFlight desde el App Store en ese telefono.
3. Iniciar sesion en TestFlight con **daikydev@gmail.com** — ya quedo invitado
   al grupo interno "Equipo interno", con el build 1.2 disponible.
4. Instalar PadelKing y grabar la pantalla (Ajustes > Centro de control >
   Grabacion de pantalla).
5. Recorrer los seis pasos del walkthrough de arriba. Para la eliminacion de
   cuenta, crear una cuenta desechable en el momento y borrarla en camara: no
   usar `demo@padelking.co`, que el revisor necesita viva.
6. Subir el video a YouTube **como "no listado"** y pegar el enlace en la
   respuesta del Resolution Center.

Duracion util: 2 a 4 minutos. No hace falta narrarlo.

---

## Mensaje para el tester que graba el video

El orden importa: el chat de torneo es solo para participantes, asi que la
cuenta recien creada NO lo ve. Por eso se entra primero con la cuenta demo
(que ya esta inscrita en dos torneos) para mostrar reportar/bloquear, y solo
despues se crea la cuenta desechable que se borra en camara.

```
Parce, necesito un favor de 5 minutos y me destrabas la app en el App Store

Apple me pide un video grabado desde un iPhone real y yo no tengo. Es solo
grabar la pantalla mientras recorres la app, sin narrar ni nada.

1. Instala TestFlight del App Store
2. Abre este link e instala PadelKing: [LINK]
3. Prende la grabacion de pantalla ANTES de abrir la app
   (deslizas desde arriba a la derecha, boton del circulo)

Y haz esto, con calma, sin saltarte pasos:

  a. Abre PadelKing. Deja que cargue la lista de torneos.
  b. Toca un torneo cualquiera y mira el detalle.
  c. Devuelvete y entra a Ranking.
  d. Inicia sesion con el usuario y clave que te paso aparte.
  e. Entra a un torneo donde ya estoy inscrito y abre el Chat.
  f. En un mensaje que NO sea tuyo, toca los tres puntitos y deja ver
     las opciones de Reportar y Bloquear. No tienes que usarlas, solo
     que se vean en pantalla.
  g. Cierra sesion.
  h. Crea una cuenta nueva con tu propio correo.
  i. Ve a Perfil > Zona peligrosa > Eliminar mi cuenta, escribe ELIMINAR
     y confirma. (Es la cuenta que acabas de crear, no pasa nada.)

4. Para la grabacion y me la mandas por aca.

Si algo se traba o se ve raro, sigue grabando igual y me dices. Gracias!
```

Aparte, por el mismo chat, se le pasan las credenciales de la cuenta demo
(`demo@padelking.co`). No van en el mismo mensaje para que no se confunda y
las use en el paso h.

### Por que ese guion y no otro

Cubre exactamente los cuatro puntos que Apple listo en el rechazo:

- registro, login y **borrado de cuenta** -> pasos d, h, i
- contenido de usuarios con **reportar y bloquear** -> pasos e, f
- prompts de permisos -> no hay ninguno, y que el video lo demuestre por
  ausencia es justamente lo que sirve
- flujo tipico desde el lanzamiento -> pasos a, b, c

Si el video llega sin el paso f o sin el i, no sirve: son los dos que Apple
nombro explicitamente y por los que rechazaria de nuevo.
