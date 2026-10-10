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

## User Scenarios & Testing *(mandatory)*

En las historias se nombra el rol (Administrador, Vendedor, Comprador), no la persona.
«Cualquier usuario» quiere decir alguien autorizado y activo, con el rol que sea.

### User Story 1 - Entrar solo si estás autorizado (Priority: P1)

Cualquier usuario abre la app y entra con su cuenta de Google, sin contraseña. Si su correo
no fue autorizado, no entra y la app se lo dice. Una vez adentro, el dispositivo recuerda la
sesión y no vuelve a pedir nada.

**Why this priority**: sin esto no se puede usar nada más, y es lo que impide que un
extraño vea costos, márgenes y ventas.

**Independent Test**: abrir la app en un dispositivo sin sesión y ver que solo ofrece
entrar; entrar con un correo autorizado y ver el nombre y los roles; intentar con un correo
sin autorizar y ver que no entra.

**Acceptance Scenarios**:

1. **Given** un dispositivo sin sesión guardada, **When** se abre la app, **Then** lo único que se puede hacer es entrar, con Google o con la huella; no hay campo de contraseña ni forma de entrar leyendo un código QR.
2. **Given** un correo de Google autorizado y activo, **When** el usuario entra con Google y Google confirma la cuenta, **Then** se abre una sesión en ese dispositivo, la app muestra su nombre y sus roles, y queda registrado el inicio de sesión con el medio «Google».
3. **Given** un correo de Google que nadie autorizó, **When** entra con Google, **Then** no se abre sesión y la app muestra el correo, dice que no está autorizado y que tiene que pedirle el alta a un Administrador.
4. **Given** un usuario desactivado, **When** entra con Google, **Then** pasa lo mismo que con un correo sin autorizar.
5. **Given** un pedido de entrada sin la confirmación de Google, o con una que Google no reconoce, **When** llega al servidor, **Then** se rechaza y no se abre sesión.
6. **Given** un dispositivo con una sesión vigente guardada, **When** se abre la app, **Then** entra directo, sin pasar por Google ni por la huella.
7. **Given** un pedido al servidor sin sesión, o con una sesión cerrada, vencida o de un usuario desactivado, **When** pide o cambia cualquier dato, **Then** el servidor lo rechaza con «Hay que iniciar sesión» y no entrega nada.
8. **Given** un dispositivo con sesión guardada y sin internet, **When** se abre o se recarga la app, **Then** abre igual y deja buscar y vender, sin volver a pedir la entrada.
9. **Given** un dispositivo que trabajó sin internet con una sesión que mientras tanto se cerró o venció, **When** vuelve la conexión y el servidor rechaza la sesión, **Then** la app vuelve sola a la entrada.
10. **Given** más intentos de entrada por minuto que el límite desde un mismo origen (10 con Google, 20 con la huella), **When** llega otro, **Then** el servidor lo rechaza con «Demasiados intentos; esperá un minuto» sin evaluarlo.

---

### User Story 2 - Autorizar a alguien y administrar usuarios y roles (Priority: P1)

El Administrador ve quién puede entrar, autoriza a alguien cargando su nombre y su correo
de Google con uno o más roles, le agrega o le quita roles, y lo desactiva o lo reactiva.
El sistema nunca queda sin un Administrador activo.

**Why this priority**: autorizar un correo es la única forma de que alguien más entre,
darle roles es lo que decide qué puede hacer, y desactivarlo es la baja de un empleado.

**Independent Test**: como Administrador, autorizar un correo con el rol Vendedor,
agregarle Comprador, quitárselo, desactivarlo y reactivarlo; comprobar que cada paso queda
en «quién hizo qué» y que el único Administrador no se puede dar de baja.

**Acceptance Scenarios**:

1. **Given** un Administrador con sesión, **When** abre la administración de usuarios, **Then** ve a todos los usuarios, activos y desactivados, cada uno con su nombre, su correo, sus roles y si está activo.
2. **Given** un Administrador, **When** carga un nombre, un correo de Google y al menos un rol y lo autoriza, **Then** el usuario aparece en la lista, puede entrar con ese correo y queda registrado quién lo autorizó.
3. **Given** un alta sin nombre, con un correo mal escrito o sin ningún rol, **When** el Administrador la confirma, **Then** no se crea nada y el error dice qué corregir.
4. **Given** un correo que ya está cargado, **When** se lo intenta autorizar de nuevo, **Then** no se duplica y el Administrador ve que ese correo ya existe. Mayúsculas y minúsculas no distinguen un correo de otro.
5. **Given** un usuario con el rol Vendedor, **When** el Administrador le agrega Comprador, **Then** el usuario tiene los dos roles, puede hacer lo de ambos y el cambio queda registrado con quién lo hizo.
6. **Given** un usuario con los roles Vendedor y Comprador, **When** el Administrador le quita Comprador, **Then** conserva Vendedor y deja de poder hacer lo que era solo del Comprador desde su próxima operación, sin tener que volver a entrar.
7. **Given** un usuario con un solo rol, **When** el Administrador intenta quitárselo, **Then** no se guarda: un usuario activo tiene al menos un rol; para que no pueda hacer nada se lo desactiva.
8. **Given** un usuario con sesiones abiertas, **When** el Administrador lo desactiva, **Then** se le cierran todas las sesiones, no puede volver a entrar ni con Google ni con la huella, y sigue en la lista como desactivado.
9. **Given** un usuario desactivado, **When** el Administrador lo reactiva, **Then** vuelve a poder entrar con los roles que tenía.
10. **Given** un Administrador, **When** intenta desactivarse o quitarse el rol Administrador a sí mismo, **Then** no se guarda y la app le dice que eso lo tiene que hacer otro Administrador.
11. **Given** un único Administrador activo en el sistema, **When** alguien intenta desactivarlo o quitarle el rol Administrador por cualquier camino, **Then** no se guarda: el sistema nunca queda sin un Administrador activo.
12. **Given** un usuario sin el rol Administrador, **When** intenta ver la lista de usuarios, autorizar a alguien o cambiar roles, desde la app o pidiéndoselo directo al servidor, **Then** la app no se lo ofrece y el servidor lo rechaza sin cambiar nada.

---

### User Story 3 - Cada rol puede lo suyo y nada más (Priority: P1)

Cada operación del sistema exige un rol. Lo que el usuario no puede hacer no se le ofrece,
y el servidor lo rechaza aunque se lo pidan sin pasar por la app. Quien tiene varios roles
puede lo de todos ellos. Qué rol exige cada operación está en la «Matriz de permisos».

**Why this priority**: es la regla que permite sumar a una persona nueva dándole solo los
permisos mínimos y necesarios.

**Independent Test**: con un usuario solo Vendedor, uno solo Comprador y uno con los tres
roles, recorrer cada operación de la matriz desde las dos interfaces y pidiéndosela directo
al servidor, y comparar con la matriz.

**Acceptance Scenarios**:

1. **Given** un usuario con solo el rol Vendedor, **When** usa la app, **Then** puede vender y registrar ventas, y no se le ofrece registrar compras ni administrar usuarios, sesiones o «quién hizo qué».
2. **Given** un usuario con solo el rol Vendedor, **When** le pide directo al servidor registrar una compra, autorizar un usuario o ver «quién hizo qué», **Then** el servidor rechaza las tres y nada cambia.
3. **Given** un usuario con solo el rol Comprador, **When** usa la app, **Then** puede recibir mercadería y registrarla, y no se le ofrece vender ni administrar.
4. **Given** un usuario con solo el rol Comprador, **When** le pide directo al servidor registrar una venta o autorizar un usuario, **Then** el servidor rechaza las dos y nada cambia.
5. **Given** un usuario con los roles Vendedor y Comprador, **When** usa la app, **Then** puede vender y registrar compras, y no administrar.
6. **Given** un usuario con el rol Administrador, **When** usa la app, **Then** puede crear usuarios, asignar roles, cerrar sesiones, ver quién hizo qué y ver cómo va el negocio.
7. **Given** una operación rechazada por no tener el rol, **When** el usuario la ve rechazada, **Then** el mensaje dice qué rol se necesita, y el rechazo no le cierra la sesión.
8. **Given** cualquier usuario, **When** mira la app, **Then** ve su nombre y los roles que tiene.

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
7. **Given** un usuario sin el rol Administrador, **When** intenta ver las sesiones abiertas o cerrar la de otro, desde la app o pidiéndoselo directo al servidor, **Then** la app no se lo ofrece y el servidor lo rechaza.
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
11. **Given** un usuario sin el rol Administrador, **When** intenta ver el registro, desde la app o pidiéndoselo directo al servidor, **Then** la app no se lo ofrece y el servidor lo rechaza.
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
- **Cambio de roles con la sesión abierta.** Un cambio de roles vale desde la próxima operación del usuario, sin cerrarle la sesión.
- **Operación en cola de alguien que perdió el permiso.** [NEEDS CLARIFICATION: P8, ver «Preguntas abiertas»]
- **Computadora con lector de huella.** [NEEDS CLARIFICATION: P7, ver «Preguntas abiertas»]
- **Salir sin conexión.** [NEEDS CLARIFICATION: P9, ver «Preguntas abiertas»]
- **El celular como lector de códigos de la computadora** (RF-08) usa un código QR, pero no es una forma de entrar: los dos dispositivos ya tienen sesión. Pertenece a la capacidad de catálogo.

## Requirements *(mandatory)*

### Actores y roles

Roles y actores son cosas distintas. El **rol** es lo que da permisos dentro del sistema.
El **actor** es la persona real, y se lo nombra solo donde el rol no alcanza para describir
el proceso.

| Rol | Qué puede hacer |
|---|---|
| Administrador | Todo lo de administrar: crear usuarios, asignar roles, cerrar sesiones, ver quién hizo qué, ver cómo va el negocio |
| Vendedor | Vender y registrar las ventas |
| Comprador | Recibir la mercadería y registrarla |

Son tres, se combinan y un usuario tiene uno o más. No hay otros roles ni niveles dentro de
un rol.

| Actor | Quién es | Usa el sistema |
|---|---|---|
| Dueño | Administra la ferretería a distancia y decide precios, márgenes y prioridades | Sí, con el rol Administrador |
| Empleado | Atiende el local | Sí, con los roles que se le asignen; el Empleado de la ferretería tiene los tres |
| Cliente | Quien compra; unos 20 son importantes, con cuenta corriente | No, no tiene rol |
| Proveedor | Unos 50; mandan listas de precios | No, no tiene rol |
| [NEEDS CLARIFICATION: P6] | | |

### Matriz de permisos

«Sí» y «No» dicen lo que el rol permite **por sí solo**; un usuario con varios roles puede
lo que permite cualquiera de ellos. Entrar, salir de la propia sesión y vincular o quitar
los celulares propios lo puede cualquier usuario, sin importar el rol.

| Operación | Administrador | Vendedor | Comprador |
|---|---|---|---|
| Vender y registrar ventas | [NEEDS CLARIFICATION: P1] | Sí | No |
| Anular una venta | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Ver las ventas del día | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Registrar compras (recibir mercadería) | [NEEDS CLARIFICATION: P1] | No | Sí |
| Contar stock | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Corregir stock | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Cargar listas de precios | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Elegir márgenes | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Unir duplicados | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Ver costos | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Dar de alta y modificar proveedores | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] | [NEEDS CLARIFICATION: P2] |
| Administrar usuarios y roles | Sí | No | No |
| Ver las sesiones abiertas y cerrar las de otros | Sí | No | No |
| Quitar el celular vinculado de otro usuario | Sí | No | No |
| Ver quién hizo qué | Sí | No | No |
| Ver cómo va el negocio | Sí | [NEEDS CLARIFICATION: P3] | [NEEDS CLARIFICATION: P3] |

Las operaciones de requerimientos que no figuran acá (presupuestos, pedidos, cierre de caja,
cuentas corrientes) fijan su rol en la especificación de su capacidad y se agregan a esta
matriz.

### Preguntas abiertas

- **P1** (RF-72) [NEEDS CLARIFICATION: ¿el rol Administrador, por sí solo, deja también vender y registrar compras, o solo administrar? Dicho de otro modo: ¿un usuario que es solo Administrador puede cobrar una venta, o para eso necesita además el rol Vendedor?]
- **P2** (RF-72) [NEEDS CLARIFICATION: ¿qué rol o roles pueden hacer cada una de estas operaciones?: anular una venta, ver las ventas del día, contar stock, corregir stock, cargar listas de precios, elegir márgenes, unir duplicados, ver costos, y dar de alta o modificar proveedores. Propuesta sin confirmar: listas, conteo y pedidos para el Comprador.]
- **P3** (RF-72) [NEEDS CLARIFICATION: «ver cómo va el negocio» es del Administrador. ¿Es solo de él? En particular: ¿el Comprador ve los gastos de la semana cuando registra un ingreso (RF-65), y el Vendedor ve el total vendido en el día?]
- **P4** (RF-72, RF-73) [NEEDS CLARIFICATION: ¿un Administrador puede desactivar o quitarle el rol a cualquier otro Administrador, incluido el Dueño? RF-73 protegía al dueño de los demás administradores «para delegar la administración diaria sin ceder el control de quién manda»; con tres roles sin niveles esa protección desaparece, salvo que se decida conservarla.]
- **P5** (RF-72, RF-73) [NEEDS CLARIFICATION: ¿un Administrador puede darse o quitarse a sí mismo los roles Vendedor y Comprador? Está escrito que nadie se desactiva ni se quita el rol Administrador a sí mismo; RF-73 decía además que nadie se cambia el rol a sí mismo, cuando el rol era uno solo.]
- **P6** (actores) [NEEDS CLARIFICATION: se habló de cinco actores y se nombraron cuatro (Dueño, Empleado, Cliente, Proveedor). ¿Cuál es el quinto, o son cuatro?]
- **P7** (RF-70b) [NEEDS CLARIFICATION: en una computadora que tiene lector de huella, ¿se puede vincular a mano y entrar con la huella, o la huella es solo para el celular y la computadora entra siempre con Google? Lo decidido es que en la computadora nunca se ofrece sola.]
- **P8** (RF-72) [NEEDS CLARIFICATION: una venta cobrada sin conexión por alguien a quien, antes de que el dispositivo reconecte, se le quitó el rol Vendedor o se lo desactivó: ¿se registra igual al reconectar, porque nada del mostrador se pierde, o se rechaza?]
- **P9** (RF-74) [NEEDS CLARIFICATION: si el dispositivo no tiene internet, ¿«Salir» lo lleva igual a la entrada y la sesión se cierra en el servidor cuando reconecte, o no se puede salir sin conexión?]

### Functional Requirements

- **RF-70**: Solo entran usuarios autorizados y activos, con su cuenta de Google o con la huella del celular. No hay contraseñas ni entrada por código QR. Se autoriza a alguien cargando su nombre y su correo de Google desde la app; quien no está autorizado ve que no lo está y a quién pedirle el alta. Todo pedido al servidor exige una sesión vigente. La sesión queda en el dispositivo, dura 90 días que se renuevan con el uso, y sigue sirviendo sin conexión hasta que el servidor diga lo contrario. Los intentos de entrada tienen un límite por minuto y por origen (ADR-011).
- **RF-70b**: Un usuario vincula su celular a su cuenta para entrar con la huella, sin Google. La app lo ofrece sola la primera vez que se entra con Google desde un celular con lector de huella, una sola vez por dispositivo, y nunca en la computadora. Cada usuario ve sus celulares vinculados, vincula uno a mano y lo quita; un Administrador quita el de cualquiera. Del celular se guarda solo lo necesario para verificarlo: la huella nunca sale del aparato (ADR-011, enmiendas del 2026-09-14 y del 2026-09-15).
- **RF-71**: Quién hizo qué. Cada acción queda registrada con el usuario que la hizo, cuándo, el tipo de acción y su detalle, y el registro solo recibe acciones nuevas. El Administrador lo consulta de la acción más reciente a la más vieja, de a 10 por página y con el total, y lo filtra por usuario, por fecha y por tipo de acción, combinando los filtros.
- **RF-72**: Los permisos se dan por rol, con tres roles: Administrador, Vendedor y Comprador, combinables. Cada usuario tiene uno o más. Cada pantalla y cada operación exige el rol que le corresponde según la matriz de permisos, tanto en la app como en el servidor. Los roles se asignan y se quitan desde la administración de usuarios y cada cambio queda en «quién hizo qué». El sistema nunca queda sin un Administrador activo. Nadie se desactiva ni se quita el rol Administrador a sí mismo. Desactivar a un usuario le cierra todas las sesiones.
- **RF-73**: Reemplazado por RF-72 (decisión 8 del 2026-10-09; ADR-011, enmienda del 2026-10-09). Los roles dueño, admin y mostrador, de a uno por usuario, dejan de ser una regla. Equivalencia para pasar de unos a otros: dueño y admin reciben Administrador, Vendedor y Comprador; mostrador recibe Vendedor y Comprador. De RF-73 siguen valiendo, dentro de RF-72, las reglas que no dependen de esos nombres: nadie se desactiva a sí mismo y desactivar a un usuario le cierra las sesiones. Si se conserva la protección del dueño frente a otros administradores es la pregunta P4.
- **RF-74**: El Administrador ve las sesiones abiertas, con el usuario, el dispositivo y el último uso, y cierra cualquiera a distancia; la sesión cerrada deja de servir en el próximo pedido de ese dispositivo. Cualquier usuario sale de la suya. Cerrar la propia, por la lista o saliendo, vuelve a la entrada.

### Key Entities *(include if feature involves data)*

- **Usuario**: quién puede entrar. Correo de Google (único), nombre, uno o más roles y si está activo. No se borra: se desactiva.
- **Rol**: Administrador, Vendedor o Comprador. Un usuario tiene uno o más; una operación exige uno o más.
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
- **SC-005**: Para cada operación de la matriz de permisos y cada combinación de roles, lo que el servidor acepta o rechaza coincide con la matriz, y la app no ofrece nada que el servidor vaya a rechazar por rol.
- **SC-006**: En ningún momento el sistema tiene cero Administradores activos.
- **SC-007**: El Administrador responde «qué hizo tal usuario tal día» eligiendo un usuario y una fecha, sin recorrer páginas.
- **SC-008**: El registro de acciones nunca muestra más de 10 por página y siempre dice cuántas hay en total con los filtros puestos.
- **SC-009**: Toda acción que cambia un dato tiene su usuario en el registro; las únicas sin usuario son las del sistema.

## Assumptions

- Dueño y Empleado tienen cuenta de Google. Google tiene que estar disponible para la primera entrada de cada dispositivo; los que ya entraron y los celulares vinculados no dependen de él.
- La sesión vive en el dispositivo: quien tenga el dispositivo desbloqueado opera como ese usuario. La respuesta es cerrar la sesión a distancia (RF-74).
- Los permisos se controlan en cada operación, por eso un cambio de roles o una desactivación vale de inmediato.
- Son tres usuarios (RNF-52): las listas de usuarios, sesiones y celulares vinculados entran enteras a la vista y no necesitan paginado ni búsqueda. El registro de acciones crece todos los días y por eso se pagina.
- Cuentan como «computadora» y «celular» las dos interfaces de ADR-014.
- Permisos más finos que los tres roles quedan fuera de esta etapa (docs/decisiones-de-negocio.md).
