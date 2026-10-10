# Feature Specification: Usuarios y acceso

**Feature Branch**: `007-usuarios-y-acceso`

**Created**: 2026-10-10

**Status**: Baseline

**Input**: Especificación completa de la capacidad

## Clarifications

### Session 2026-09-13

- Q: ¿Quién puede entrar al sistema y cómo? → A: Solo los usuarios autorizados, y sin contraseñas, porque son inseguras y se olvidan. Se entra con la cuenta de Google; autorizar a alguien es cargar su correo de Google (RF-70, ADR-011).
- Q: ¿Qué tiene que quedar registrado? → A: Cada acción, con el usuario que la hizo y cuándo; en particular las anulaciones, los cambios de precio y los ajustes de stock (RF-71).

### Session 2026-09-14

- Q: ¿El celular tiene que pasar por Google cada vez? → A: No. El celular se vincula una vez a la cuenta y desde entonces entra con la huella (RF-70b; ADR-011, enmienda del 2026-09-14).

### Session 2026-09-15

- Q: ¿Cuándo se ofrece vincular la huella? → A: Sola, la primera vez que alguien entra con Google desde un celular, una única vez por dispositivo, acepte o no. Nunca en la computadora (RF-70b; ADR-011, enmienda del 2026-09-15).

### Session 2026-10-09

- Q: ¿Cómo se dan los permisos? → A: Por rol: Administrador, Vendedor y Comprador, combinables en un mismo usuario. Los actores (Dueño, Empleado, Cliente, Proveedor) son las personas reales y se usan solo donde el rol no alcanza para describir el proceso (decisión 8; RF-72).
- Q: ¿Qué pasa con los roles dueño, admin y mostrador de RF-73? → A: Los tres roles nuevos los reemplazan (ADR-011, enmienda del 2026-10-09). RF-73 deja de ser una regla; ver «Functional Requirements».
- Q: ¿Qué roles recibe cada persona? → A: El Empleado de la ferretería tiene los tres. A quien se sume más adelante se le dan solo los permisos mínimos y necesarios.
- Q: ¿Se entra en la computadora leyendo un código QR con el celular? → A: No, se quita: se entra con Google o con la huella (decisión 10; RF-70).
- Q: ¿«Quién hizo qué» incluye filtrar? → A: Sí. Recorrer el registro de a 10 no alcanza: filtrar por usuario, fecha y tipo de acción es parte de RF-71 (decisión 12).

### Session 2026-10-10

- Q: ¿Cuántos actores hay? → A: Cuatro: Dueño, Empleado, Cliente y Proveedor (decisión 14).
- Q: ¿Qué rol puede cargar listas de precios, elegir márgenes, contar stock, unir duplicados, ver costos, ver las ventas del día y anular ventas? → A: Por ahora, el Administrador (decisión 15). Ese mismo día Carlos lo amplió: ver la respuesta siguiente.
- Q: ¿Qué puede hacer cada rol? → A: En esta primera versión todos los usuarios son Administrador y el Administrador puede hacer todo. Está decidido que van a existir distintos roles, pero los otros (Vendedor, Comprador) no se usan por ahora y qué puede cada uno se define más adelante, cuando se analicen los roles en profundidad (decisión 18, que reemplaza el reparto de la decisión 15; RF-72).

## User Scenarios & Testing *(mandatory)*

En las historias se nombra el rol (Administrador, Vendedor, Comprador), no la persona.
«Cualquier usuario» quiere decir alguien autorizado y activo.

**En esta primera versión todos los usuarios son Administrador y el Administrador puede
hacer todo** (decisión 18 del 2026-10-10). Los roles Vendedor y Comprador van a existir,
pero no se usan todavía y sus permisos no están definidos. Por eso:

- Donde una historia de cualquier capacidad nombra al Vendedor o al Comprador, dice quién
  hace ese trabajo en el local; en esta versión lo hace un usuario Administrador.
- Los escenarios que hablan de un usuario «sin el rol Administrador», o con solo otro rol,
  no se pueden dar en esta versión: quedan para cuando se definan los permisos. En esta
  especificación están marcados «(etapa posterior)».

### User Story 1 - Entrar solo si estás autorizado (Priority: P1)

Cualquier usuario abre la app y entra con su cuenta de Google, sin contraseña. Si su correo
no fue autorizado, no entra y la app se lo dice. Una vez adentro, el dispositivo recuerda la
sesión y no vuelve a pedir nada.

**Why this priority**: sin esto no se puede usar nada más, y es lo que impide que un
extraño vea costos, márgenes y ventas.

**Independent Test**: abrir la app en un dispositivo sin sesión y ver que solo ofrece
entrar; entrar con un correo autorizado y ver el nombre; intentar con un correo
sin autorizar y ver que no entra.

**Acceptance Scenarios**:

1. **Given** un dispositivo sin sesión guardada, **When** se abre la app, **Then** lo único que se puede hacer es entrar, con Google o con la huella; no hay campo de contraseña ni forma de entrar leyendo un código QR.
2. **Given** un correo de Google autorizado y activo, **When** el usuario entra con Google y Google confirma la cuenta, **Then** se abre una sesión en ese dispositivo, la app muestra su nombre, y queda registrado el inicio de sesión con el medio «Google».
3. **Given** un correo de Google que nadie autorizó, **When** entra con Google, **Then** no se abre sesión y la app muestra el correo, dice que no está autorizado y que tiene que pedirle el alta a un Administrador.
4. **Given** un usuario desactivado, **When** entra con Google, **Then** pasa lo mismo que con un correo sin autorizar.
5. **Given** un pedido de entrada sin la confirmación de Google, o con una que Google no reconoce, **When** llega al servidor, **Then** se rechaza y no se abre sesión.
6. **Given** un dispositivo con una sesión vigente guardada, **When** se abre la app, **Then** entra directo, sin pasar por Google ni por la huella.
7. **Given** un pedido al servidor sin sesión, o con una sesión cerrada, vencida o de un usuario desactivado, **When** pide o cambia cualquier dato, **Then** el servidor lo rechaza con «Hay que iniciar sesión» y no entrega nada.
8. **Given** un dispositivo con sesión guardada y sin internet, **When** se abre o se recarga la app, **Then** abre igual y deja buscar y vender, sin volver a pedir la entrada.
9. **Given** un dispositivo que trabajó sin internet con una sesión que mientras tanto se cerró o venció, **When** vuelve la conexión y el servidor rechaza la sesión, **Then** la app vuelve sola a la entrada.
10. **Given** más intentos de entrada por minuto que el límite desde un mismo origen (10 con Google, 20 con la huella), **When** llega otro, **Then** el servidor lo rechaza con «Demasiados intentos; esperá un minuto» sin evaluarlo.

---

### User Story 2 - Autorizar a alguien y administrar usuarios (Priority: P1)

El Administrador ve quién puede entrar, autoriza a alguien cargando su nombre y su correo
de Google, y lo desactiva o lo reactiva. En esta versión toda persona autorizada entra como
Administrador; asignar y quitar otros roles es de una etapa posterior. El sistema nunca
queda sin un Administrador activo.

**Why this priority**: autorizar un correo es la única forma de que alguien más entre,
y desactivarlo es la baja de un empleado.

**Independent Test**: como Administrador, autorizar un correo, entrar con él,
desactivarlo y reactivarlo; comprobar que cada paso queda
en «quién hizo qué» y que el único Administrador no se puede dar de baja.

**Acceptance Scenarios**:

1. **Given** un Administrador con sesión, **When** abre la administración de usuarios, **Then** ve a todos los usuarios, activos y desactivados, cada uno con su nombre, su correo y si está activo.
2. **Given** un Administrador, **When** carga un nombre y un correo de Google y lo autoriza, **Then** el usuario aparece en la lista como Administrador, puede entrar con ese correo y hacer todo, y queda registrado quién lo autorizó.
3. **Given** un alta sin nombre o con un correo mal escrito, **When** el Administrador la confirma, **Then** no se crea nada y el error dice qué corregir.
4. **Given** un correo que ya está cargado, **When** se lo intenta autorizar de nuevo, **Then** no se duplica y el Administrador ve que ese correo ya existe. Mayúsculas y minúsculas no distinguen un correo de otro.
5. (etapa posterior) **Given** un usuario con el rol Vendedor, **When** el Administrador le agrega Comprador, **Then** el usuario tiene los dos roles, puede hacer lo de ambos y el cambio queda registrado con quién lo hizo.
6. (etapa posterior) **Given** un usuario con los roles Vendedor y Comprador, **When** el Administrador le quita Comprador, **Then** conserva Vendedor y deja de poder hacer lo que era solo del Comprador desde su próxima operación, sin tener que volver a entrar.
7. (etapa posterior) **Given** un usuario con un solo rol, **When** el Administrador intenta quitárselo, **Then** no se guarda: un usuario activo tiene al menos un rol; para que no pueda hacer nada se lo desactiva.
8. **Given** un usuario con sesiones abiertas, **When** el Administrador lo desactiva, **Then** se le cierran todas las sesiones, no puede volver a entrar ni con Google ni con la huella, y sigue en la lista como desactivado.
9. **Given** un usuario desactivado, **When** el Administrador lo reactiva, **Then** vuelve a poder entrar.
10. **Given** un Administrador, **When** intenta desactivarse o quitarse el rol Administrador a sí mismo, **Then** no se guarda y la app le dice que eso lo tiene que hacer otro Administrador.
11. **Given** un único Administrador activo en el sistema, **When** alguien intenta desactivarlo o quitarle el rol Administrador por cualquier camino, **Then** no se guarda: el sistema nunca queda sin un Administrador activo.
12. (etapa posterior) **Given** un usuario sin el rol Administrador, **When** intenta ver la lista de usuarios, autorizar a alguien o cambiar roles, desde la app o pidiéndoselo directo al servidor, **Then** la app no se lo ofrece y el servidor lo rechaza sin cambiar nada.

---

### User Story 3 - Todos son Administrador y pueden todo (Priority: P1)

En esta primera versión hay un solo rol en uso: Administrador. Todo usuario autorizado lo
tiene y puede hacer todo lo que el sistema ofrece. Lo único que el servidor exige es una
sesión vigente de un usuario activo. Los permisos por rol llegan en una etapa posterior.

**Why this priority**: son pocos usuarios, todos de confianza; repartir permisos antes de
analizar los roles en profundidad complicaría el mostrador sin proteger nada.

**Independent Test**: autorizar un usuario nuevo, entrar con él y recorrer todas las
operaciones del sistema, en el celular y en la computadora.

**Acceptance Scenarios**:

1. **Given** un usuario autorizado y activo, **When** usa la app, **Then** es Administrador y se le ofrecen todas las operaciones: vender, ver y anular ventas, registrar compras, contar y corregir stock, cargar listas, elegir márgenes, unir duplicados, ver costos, ver cómo va el negocio y administrar usuarios, sesiones y «quién hizo qué».
2. **Given** un usuario autorizado y activo, **When** le pide cualquier operación directo al servidor, **Then** el servidor la acepta: no la rechaza por rol.
3. **Given** cualquier usuario, **When** mira la app, **Then** ve su nombre.
4. **Given** alguien sin sesión, o un usuario desactivado, **When** le pide cualquier operación al servidor, **Then** el servidor la rechaza (historia 1).
5. (etapa posterior) **Given** roles con permisos distintos ya definidos, **When** un usuario usa la app, **Then** se le ofrece solo lo que sus roles permiten y el servidor rechaza lo demás, diciendo qué rol se necesita y sin cerrarle la sesión.

---

### User Story 4 - Entrar con la huella del celular (Priority: P2)

Cualquier usuario vincula su celular a su cuenta una vez y desde entonces entra con la
huella, sin Google. La app se lo ofrece sola la primera vez que entra con Google desde un
celular; también puede vincularlo y quitarlo cuando quiera.

**Why this priority**: es más rápido que Google en el mostrador, pero con Google alcanza
para entrar; por eso va después.

**Independent Test**: en un celular con huella, entrar con Google, aceptar la oferta, salir,
entrar con la huella, quitar el celular y comprobar que la huella ya no entra.

**Acceptance Scenarios**:

1. **Given** un celular con lector de huella en el que alguien entra con Google por primera vez, **When** termina de entrar, **Then** la app le ofrece «¿Entrar con la huella?», con una opción para aceptar y otra para dejarlo para después.
2. **Given** la oferta a la vista, **When** el usuario acepta y el celular lee la huella, **Then** el celular queda vinculado a su cuenta, la app lo confirma y el celular aparece en la lista de sus celulares vinculados.
3. **Given** un celular al que ya se le ofreció, haya aceptado o no, **When** se vuelve a entrar con Google en él, **Then** no se ofrece de nuevo.
4. **Given** la oferta a la vista, **When** el usuario acepta y el celular no llega a leer la huella, **Then** la app avisa que se puede vincular después, dice dónde, y esa vez no cuenta como ofrecida.
5. **Given** una computadora en la que alguien entra con Google, tenga o no lector de huella, **When** termina de entrar, **Then** la oferta no aparece.
6. **Given** un celular sin lector de huella, o una entrada que no fue con Google, **When** se abre la app, **Then** la oferta no aparece.
7. **Given** cualquier usuario con sesión en un celular con lector de huella, **When** elige vincular ese celular y le pone un nombre, **Then** el celular queda en su lista con ese nombre y la fecha, y queda registrado quién lo vinculó.
8. **Given** un celular vinculado y sin sesión, **When** el usuario elige «Entrar con la huella» y apoya el dedo, **Then** entra sin Google, sin elegir cuenta ni escribir nada, con la misma sesión que da Google, y queda registrado el inicio de sesión con el medio «huella».
9. **Given** un celular vinculado, **When** su usuario lo quita de su lista y después intenta entrar con la huella desde él, **Then** no entra y la app le dice que ese celular no está vinculado y que entre con Google.
10. **Given** varios usuarios con celulares vinculados, **When** cada uno abre su lista, **Then** ve solo los suyos, con el nombre, cuándo se vinculó y cuándo se usó por última vez.
11. **Given** un celular vinculado de un usuario que lo perdió, **When** un Administrador lo quita, **Then** ese celular deja de entrar con la huella y queda registrado quién lo quitó; quien no es Administrador no puede quitar el celular de otro.
12. **Given** un celular vinculado a un usuario desactivado, **When** intenta entrar con la huella, **Then** no entra.
13. **Given** un pedido de vinculación o de entrada con la huella, **When** se repite uno ya usado, llega pasado su plazo de 5 minutos, viene de otro usuario o trae una firma que no verifica, **Then** el servidor lo rechaza y no vincula ni abre sesión.
14. **Given** un celular vinculado, **When** se mira lo que el sistema guarda de él, **Then** no hay nada que permita reproducir la huella ni entrar desde otro aparato: la huella y la clave privada nunca salen del celular.

---

### User Story 5 - Ver las sesiones abiertas y cerrarlas (Priority: P2)

El Administrador ve en qué dispositivos hay sesiones abiertas y cierra cualquiera a
distancia. Cualquier usuario sale de la suya.

**Why this priority**: es la respuesta a un celular perdido o a una computadora que quedó
abierta; no se necesita en el día a día.

**Independent Test**: con un Administrador con sesión en dos dispositivos, cerrar la del
otro y ver que desaparece y que ese dispositivo vuelve a la entrada; cerrar la propia y
ver la entrada.

**Acceptance Scenarios**:

1. **Given** un Administrador con sesión, **When** abre las sesiones abiertas, **Then** ve las de todos los usuarios, de la usada más recientemente a la más vieja, cada una con el usuario, el dispositivo y el último uso; las cerradas y las vencidas no figuran.
2. **Given** la lista de sesiones, **When** el Administrador la mira, **Then** la suya en ese dispositivo está señalada como la propia y la acción de cerrarla se distingue a la vista de la de cerrar las demás.
3. **Given** un Administrador y una sesión de otro dispositivo, **When** la cierra, **Then** desaparece de la lista, la suya sigue abierta y queda registrado quién la cerró.
4. **Given** un dispositivo cuya sesión se cerró a distancia, **When** hace su próximo pedido al servidor, **Then** el servidor lo rechaza, el dispositivo descarta la sesión guardada y vuelve solo a la entrada.
5. **Given** un Administrador en la lista de sesiones, **When** cierra la suya, **Then** vuelve a la entrada y abrir la app de nuevo no entra sin autenticarse.
6. **Given** cualquier usuario con sesión, **When** elige «Salir», **Then** vuelve a la entrada, esa sesión deja de valer en el servidor y queda registrado el cierre.
7. (etapa posterior) **Given** un usuario sin el rol Administrador, **When** intenta ver las sesiones abiertas o cerrar la de otro, desde la app o pidiéndoselo directo al servidor, **Then** la app no se lo ofrece y el servidor lo rechaza.
8. **Given** una sesión abierta, **When** pasan 90 días sin que se use, **Then** vence y hay que volver a entrar; cada uso la extiende otros 90 días.

---

### User Story 6 - Saber quién hizo qué (Priority: P3)

El Administrador consulta el registro de acciones: cuándo, quién, qué y el detalle. Lo
recorre de a 10 por página y lo filtra por usuario, por fecha y por tipo de acción para
responder «qué hizo tal usuario tal día» sin pasar páginas.

**Why this priority**: sirve para revisar después; no frena el mostrador.

**Independent Test**: con 24 acciones registradas de dos usuarios en dos días, abrir «Quién
hizo qué», ver 3 páginas, filtrar por un usuario y un día y ver solo las suyas de ese día.

**Acceptance Scenarios**:

1. **Given** cualquier acción que cambia un dato (una venta, una anulación, un cambio de precio o de margen, un ajuste de stock, una compra, una lista aplicada, un alta de usuario, un cambio de roles, un cierre de sesión), **When** se hace, **Then** queda registrada con el usuario que la hizo, la fecha y la hora, el tipo de acción y su detalle.
2. **Given** las entradas al sistema, **When** alguien entra, **Then** queda registrado quién, desde qué dispositivo y con qué medio (Google o huella).
3. **Given** un Administrador y 24 acciones registradas, **When** abre «Quién hizo qué», **Then** ve las 10 más recientes, de la más nueva a la más vieja, cada una con cuándo, quién, qué y el detalle, y lee que está en la página 1 de 3 y que hay 24 acciones.
4. **Given** el registro abierto, **When** el Administrador avanza y retrocede, **Then** cambia de página; en la primera no se puede retroceder y en la última no se puede avanzar.
5. **Given** el registro abierto, **When** el Administrador elige un usuario, **Then** ve solo las acciones de ese usuario, y el total y la cantidad de páginas corresponden a ese filtro.
6. **Given** el registro abierto, **When** el Administrador elige una fecha o un rango de fechas, **Then** ve solo las acciones de esos días.
7. **Given** el registro abierto, **When** el Administrador elige un tipo de acción, **Then** ve solo las acciones de ese tipo.
8. **Given** un usuario, un día y un tipo elegidos a la vez, **When** el Administrador mira el resultado, **Then** ve solo las acciones que cumplen los tres, de a 10 por página, y al cambiar un filtro vuelve a la página 1.
9. **Given** filtros que no coinciden con ninguna acción, **When** el Administrador mira el resultado, **Then** lee que no hay acciones con esos filtros y puede quitarlos de un paso.
10. **Given** una acción que no hizo ningún usuario (el alta del primer Administrador), **When** figura en el registro, **Then** dice que la hizo el sistema.
11. (etapa posterior) **Given** un usuario sin el rol Administrador, **When** intenta ver el registro, desde la app o pidiéndoselo directo al servidor, **Then** la app no se lo ofrece y el servidor lo rechaza.
12. **Given** una acción ya registrada, **When** pasa el tiempo o se desactiva al usuario que la hizo, **Then** sigue en el registro tal como se anotó: el registro solo recibe acciones nuevas.

---

### Edge Cases

- **Primer Administrador.** El primero se da de alta fuera de la app, por quien opera el servidor (ADR-011); a partir de ahí, todos se autorizan desde la app. Esa alta figura en el registro a nombre del sistema.
- **Dos Administradores que se dan de baja a la vez.** Si dos Administradores intentan desactivarse o quitarse el rol uno al otro al mismo tiempo, a lo sumo uno de los dos cambios se guarda: siempre queda un Administrador activo.
- **Usuario desactivado con celular vinculado.** La vinculación no lo deja entrar mientras esté desactivado. Si se lo reactiva, sus celulares vinculados vuelven a servir sin vincularlos de nuevo.
- **Google no responde.** No se puede entrar con Google en un dispositivo nuevo; los dispositivos con sesión abierta siguen trabajando y los celulares vinculados entran con la huella.
- **Pedido de huella interrumpido.** Un pedido de vinculación o de entrada con la huella vale 5 minutos y un solo uso; si se interrumpe, el usuario empieza de nuevo y no queda nada a medias.
- **Cambio de dirección de la app.** La vinculación de la huella queda atada a la dirección web de la app: si cambia, cada celular se vincula de nuevo (ADR-011).
- **Sin conexión.** La sesión guardada se da por válida mientras no haya servidor que diga lo contrario. Los cambios de usuarios, roles y sesiones necesitan conexión: sin ella no se ofrecen, y la app lo dice.
- **Operación en cola de alguien a quien desactivaron.** [NEEDS CLARIFICATION: P8, ver «Preguntas abiertas»]
- **Computadora con lector de huella.** [NEEDS CLARIFICATION: P7, ver «Preguntas abiertas»]
- **Salir sin conexión.** [NEEDS CLARIFICATION: P9, ver «Preguntas abiertas»]
- **El celular como lector de códigos de la computadora** (RF-08) usa un código QR, pero no es una forma de entrar: los dos dispositivos ya tienen sesión. Pertenece a la capacidad de catálogo.

## Requirements *(mandatory)*

### Actores y roles

Roles y actores son cosas distintas. El **rol** es lo que da permisos dentro del sistema.
El **actor** es la persona real, y se lo nombra solo donde el rol no alcanza para describir
el proceso.

| Rol | En esta versión | Qué puede hacer |
|---|---|---|
| Administrador | El único en uso: lo tiene todo usuario | Todo |
| Vendedor | No se usa todavía | Se define más adelante. La idea de partida: vender y registrar las ventas |
| Comprador | No se usa todavía | Se define más adelante. La idea de partida: recibir la mercadería y registrarla |

Está decidido que el sistema va a tener distintos roles y que los permisos se van a dar por
rol. Cuáles van a ser, si se combinan en un mismo usuario y qué puede cada uno se define
más adelante, cuando se analicen en profundidad (decisión 18 del 2026-10-10).

| Actor | Quién es | Usa el sistema |
|---|---|---|
| Dueño | Administra la ferretería a distancia y decide precios, márgenes y prioridades | Sí, como Administrador |
| Empleado | Atiende el local | Sí, como Administrador |
| Cliente | Quien compra; unos 20 son importantes, con cuenta corriente | No, no tiene rol |
| Proveedor | Unos 50; mandan listas de precios | No, no tiene rol |

Son cuatro (decisión 14 del 2026-10-10).

### Permisos

En esta versión no hay matriz de permisos: el Administrador puede hacer todo y todos los
usuarios son Administrador. Entrar, salir de la propia sesión y vincular o quitar los
celulares propios lo puede cualquier usuario.

La matriz (qué rol exige cada operación) se escribe acá cuando se definan los roles. Hasta
entonces, ninguna especificación de capacidad restringe una operación por rol.

### Preguntas abiertas

- **P4** (RF-72, RF-73) [NEEDS CLARIFICATION: si todos son Administrador, cualquiera puede desactivar a cualquier otro, incluido el Dueño (lo único que el sistema impide es desactivarse a uno mismo y dejar el sistema sin ningún Administrador activo). Antes el dueño estaba protegido de los demás administradores. ¿Se acepta así para esta versión, o el Dueño tiene que quedar protegido?]
- **P7** (RF-70b) [NEEDS CLARIFICATION: en una computadora que tiene lector de huella, ¿se puede vincular a mano y entrar con la huella, o la huella es solo para el celular y la computadora entra siempre con Google? Lo decidido es que en la computadora nunca se ofrece sola.]
- **P8** (RF-72) [NEEDS CLARIFICATION: una venta cobrada sin conexión por alguien a quien se desactivó antes de que el dispositivo reconecte: ¿se registra igual al reconectar, porque nada del mostrador se pierde, o se rechaza?]
- **P9** (RF-74) [NEEDS CLARIFICATION: si el dispositivo no tiene internet, ¿«Salir» lo lleva igual a la entrada y la sesión se cierra en el servidor cuando reconecte, o no se puede salir sin conexión?]

### Functional Requirements

- **RF-70**: Solo entran usuarios autorizados y activos, con su cuenta de Google o con la huella del celular. No hay contraseñas ni entrada por código QR. Se autoriza a alguien cargando su nombre y su correo de Google desde la app; quien no está autorizado ve que no lo está y a quién pedirle el alta. Todo pedido al servidor exige una sesión vigente. La sesión queda en el dispositivo, dura 90 días que se renuevan con el uso, y sigue sirviendo sin conexión hasta que el servidor diga lo contrario. Los intentos de entrada tienen un límite por minuto y por origen (ADR-011).
- **RF-70b**: Un usuario vincula su celular a su cuenta para entrar con la huella, sin Google. La app lo ofrece sola la primera vez que se entra con Google desde un celular con lector de huella, una sola vez por dispositivo, y nunca en la computadora. Cada usuario ve sus celulares vinculados, vincula uno a mano y lo quita; un Administrador quita el de cualquiera. Del celular se guarda solo lo necesario para verificarlo: la huella nunca sale del aparato (ADR-011, enmiendas del 2026-09-14 y del 2026-09-15).
- **RF-71**: Quién hizo qué. Cada acción queda registrada con el usuario que la hizo, cuándo, el tipo de acción y su detalle, y el registro solo recibe acciones nuevas. El Administrador lo consulta de la acción más reciente a la más vieja, de a 10 por página y con el total, y lo filtra por usuario, por fecha y por tipo de acción, combinando los filtros.
- **RF-72**: Los permisos se dan por rol. En esta primera versión hay un solo rol en uso, Administrador: lo tiene todo usuario autorizado y puede hacer todo; el servidor solo exige una sesión vigente de un usuario activo. Van a existir otros roles (la idea de partida es Vendedor y Comprador), que todavía no se usan; cuáles son, si se combinan y qué puede cada uno se define más adelante, y recién entonces cada pantalla y cada operación exige su rol. El sistema nunca queda sin un Administrador activo. Nadie se desactiva a sí mismo. Desactivar a un usuario le cierra todas las sesiones (decisión 18 del 2026-10-10).
- **RF-73**: Reemplazado por RF-72 (decisión 8 del 2026-10-09; ADR-011, enmienda del 2026-10-09). Los roles dueño, admin y mostrador dejan de ser una regla. Equivalencia para esta versión: los tres pasan a Administrador. De RF-73 siguen valiendo, dentro de RF-72, las reglas que no dependen de esos nombres: nadie se desactiva a sí mismo y desactivar a un usuario le cierra las sesiones. Si se conserva la protección del dueño frente a otros administradores es la pregunta P4.
- **RF-74**: El Administrador ve las sesiones abiertas, con el usuario, el dispositivo y el último uso, y cierra cualquiera a distancia; la sesión cerrada deja de servir en el próximo pedido de ese dispositivo. Cualquier usuario sale de la suya. Cerrar la propia, por la lista o saliendo, vuelve a la entrada.

### Key Entities *(include if feature involves data)*

- **Usuario**: quién puede entrar. Correo de Google (único), nombre, rol y si está activo. No se borra: se desactiva.
- **Rol**: en esta versión, solo Administrador. Los demás se definen más adelante.
- **Sesión**: un dispositivo en el que un usuario está adentro. Tiene el dispositivo, el último uso, cuándo vence y si se cerró. Lo que el servidor guarda de ella no alcanza para entrar: una copia de los datos no sirve para hacerse pasar por nadie.
- **Celular vinculado**: un celular que entra con la huella. Pertenece a un usuario; tiene el nombre que le puso, cuándo se vinculó, el último uso y si se quitó. No se borra: se quita.
- **Acción registrada**: qué pasó, cuándo, quién lo hizo, desde qué dispositivo y el detalle. Solo se agregan.

El detalle del contrato del servidor está en [data-model.md](data-model.md) y
[contracts/api.md](contracts/api.md).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nadie cuyo correo no esté autorizado y activo puede ver ni cambiar un dato: el 100 % de los pedidos sin sesión vigente se rechaza.
- **SC-002**: Ningún usuario tiene que recordar una contraseña: las únicas formas de entrar son Google y la huella.
- **SC-003**: En un celular vinculado se entra con un toque más la huella, sin elegir cuenta ni escribir nada.
- **SC-004**: Una sesión cerrada a distancia deja de servir en el pedido siguiente de ese dispositivo.
- **SC-005**: Todo usuario autorizado y activo puede hacer todas las operaciones del sistema; nada se rechaza por rol.
- **SC-006**: En ningún momento el sistema tiene cero Administradores activos.
- **SC-007**: El Administrador responde «qué hizo tal usuario tal día» eligiendo un usuario y una fecha, sin recorrer páginas.
- **SC-008**: El registro de acciones nunca muestra más de 10 por página y siempre dice cuántas hay en total con los filtros puestos.
- **SC-009**: Toda acción que cambia un dato tiene su usuario en el registro; las únicas sin usuario son las del sistema.

## Assumptions

- Dueño y Empleado tienen cuenta de Google. Google tiene que estar disponible para la primera entrada de cada dispositivo; los que ya entraron y los celulares vinculados no dependen de él.
- La sesión vive en el dispositivo: quien tenga el dispositivo desbloqueado opera como ese usuario. La respuesta es cerrar la sesión a distancia (RF-74).
- La sesión se controla en cada operación, por eso una desactivación vale de inmediato.
- Son tres usuarios (RNF-52): las listas de usuarios, sesiones y celulares vinculados entran enteras a la vista y no necesitan paginado ni búsqueda. El registro de acciones crece todos los días y por eso se pagina.
- «Computadora» y «celular» son los dos lugares donde se usa el sistema (RNF-04, RNF-05); si son dos interfaces o una que se adapta lo decide el diseño.
- Los permisos por rol quedan fuera de esta etapa: se definen cuando se analicen los roles en profundidad (decisión 18).
