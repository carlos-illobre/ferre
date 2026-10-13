# Requerimientos de interfaz: Usuarios y acceso

Qué tiene que poder hacer cada rol en cada recorrido de [spec.md](spec.md) y con qué
reglas. No fija un diseño: cualquier disposición que cumpla esto y la constitución
(principios II, III y IX) vale.

## Reglas para todos los recorridos

- **En el celular y en la computadora.** Todo lo de este documento se hace completo en los
  dos, salvo donde dice lo contrario; si son dos interfaces o una que se adapta lo decide el
  diseño (constitución, principio III). Lo único que cambia por regla entre una y otra
  es la huella: se ofrece sola en el celular y nunca en la computadora.
- **Teclado.** En la computadora, cada recorrido se completa entero con el teclado.
- **Sin confirmaciones.** Nada de esta capacidad pide confirmar antes de actuar: desactivar
  un usuario, quitar un rol, quitar un celular y cerrar una sesión se pueden deshacer o
  repetir (reactivar, volver a dar el rol, volver a vincular, volver a entrar).
- **Errores en el lugar.** Cada error aparece junto a lo que lo causó, en castellano, y
  dice qué hacer. Nunca un código ni un texto técnico.
- **Rol, no persona.** Los textos nombran roles y permisos; nunca «dueño» ni «empleado».
- **Lo que no se puede usar no se ofrece.** Cada parte del menú, pestaña y botón aparece solo
  si alguno de los roles de la persona lo permite: no se muestra deshabilitado ni con candado.
  Los atajos de teclado se numeran sobre lo que se ve. Vale igual en el celular y en la
  computadora.
- **Identidad siempre a la vista.** Con sesión abierta, desde cualquier parte de la app se
  ve el nombre del usuario, y se llega a «Salir» en un paso.
- **Lo que tarda muestra su avance.** Entrar, vincular y cada guardado indican que están en
  curso y no dejan repetir la acción mientras tanto.
- **Sin conexión.** Entrar, vincular la huella, administrar usuarios, ver sesiones y ver
  «quién hizo qué» necesitan conexión. Sin ella, la app lo dice en ese lugar, conserva lo
  que el usuario haya escrito y permite reintentar; no muestra datos viejos como si fueran
  actuales.

## Textos que son regla

| Dónde | Texto |
|---|---|
| Entrada, acción de la huella | «Entrar con la huella» |
| Oferta de huella | «¿Entrar con la huella?» |
| Vincular a mano | «Vincular este celular con mi huella» |
| Correo sin autorizar | Nombra el correo con el que se intentó, dice que no está autorizado y que hay que pedirle el alta a un Administrador |
| Demasiados intentos | «Demasiados intentos; esperá un minuto» |
| Sesión que dejó de valer | «Hay que iniciar sesión» |
| Registro de acciones | «Quién hizo qué» |
| Salir de la sesión | «Salir» |
| Roles | Con el nombre que les puso el negocio. Los de arranque: «Vendedor», «Comprador», «Recepción», «Administrador» y «Gerente» |

## Historia 1: entrar

**Entrada del celular (decisión 55, 2026-10-12):** sigue la disposición de la referencia que
pasó Carlos: marca al centro, las formas de entrar como tarjetas (Google primero, después la
huella), la línea de «sin contraseñas», tres cosas que hace la aplicación y un pie con la
onda de la marca, sin texto. Colores de la paleta y el logotipo de siempre. El botón de la
huella es naranja, como en la computadora.

**El botón de Google (decisión 69):** es el original que dibuja Google, azul y con las puntas
redondeadas, en el celular y en la computadora. No lleva estilos propios ni nada encima: que el
azul no sea de la paleta marca que es de un servicio externo.

**Escanear desde la entrada (decisiones 62 y 65):** debajo de las formas de entrar, el celular
tiene «Escanear el código de la computadora», que abre la cámara dentro de la aplicación. Leído
el código, si ese celular ya tiene la huella vinculada, la huella se pide enseguida: con ella
entra el celular, entra la computadora y quedan vinculados. Si la huella no se lee, lo dice y
queda el botón para probar de nuevo. Si el código no es de Ferrebress, lo dice.

**Quién:** cualquier persona que abre la app sin sesión.

**Qué tiene que poder hacer:** entrar con Google; en un dispositivo que puede, entrar con
la huella. Nada más: sin sesión no se ve ningún dato del negocio.

**Qué necesita a la vista, en este orden:**

1. Qué app es (la marca).
2. La forma más rápida de entrar que ese dispositivo tenga: «Entrar con la huella» primero,
   si el dispositivo tiene lector de huella.
3. Entrar con Google.

**Reglas:**

- No hay campo de usuario ni de contraseña, ni entrada por código QR.
- «Entrar con la huella» solo aparece donde el dispositivo puede leerla. En el celular
  siempre que tenga lector; en la computadora depende de la pregunta P7 de la spec.
- El resultado de cada forma de entrar se muestra junto a esa forma.
- Al entrar bien no hay pantalla intermedia ni mensaje de bienvenida: se llega directo a
  trabajar.
- Con una sesión vigente guardada, la entrada no se muestra.

**Estados:**

| Estado | Qué se ve |
|---|---|
| Inicial | Las formas de entrar disponibles en ese dispositivo |
| Cargando | Que se está entrando; no se puede lanzar otro intento |
| Correo sin autorizar o usuario desactivado | El texto de la regla, con el correo; se puede intentar con otra cuenta |
| Celular que no está vinculado | Que ese celular no está vinculado y que entre con Google |
| La huella no se leyó o se canceló | Que no se pudo leer y que pruebe de nuevo o entre con Google |
| Demasiados intentos | El texto de la regla |
| Sin conexión | Que para entrar se necesita internet, y reintento |
| Google no responde | Que Google no responde; la huella sigue disponible donde esté vinculada |
| Sesión cerrada a distancia o vencida | Se vuelve solo a la entrada, con «Hay que iniciar sesión» |

## Historia 1b: entrar a la computadora con el celular (RF-76)

**Maquetas aprobadas por Carlos el 2026-10-12** (`maquetas/`), con el logotipo de siempre y
el botón de Google de verdad.

**Quién:** cualquier usuario autorizado, sin sesión en la computadora.

**Qué necesita a la vista en la computadora:** el código, sin pedirlo; los dos pasos, al lado;
que se renueva solo; «Continuar con Google» debajo, como alternativa. «Entrar con la huella»
solo si esa computadora fue vinculada.

**Qué necesita a la vista en el celular:**

- En la entrada del celular, un botón «Escanear el código de la computadora» que abre la cámara
  sin salir de la aplicación (decisión 62). Leerlo con la cámara del teléfono sigue valiendo.
- Sin sesión: la entrada de siempre, con un aviso de que al entrar ahí la computadora entra
  también, y el botón de la huella primero, que lo dice: «Entrar acá y en la computadora».
- Con la sesión ya abierta: un solo botón, «Entrar en la computadora», y «Ahora no».
- Después: que la computadora ya entró, con qué usuario, y cómo seguir en el celular.

**Reglas:** no hay pantalla de confirmación aparte; un código vencido o ya usado dice que hay
que leer el que la computadora muestra ahora; sin conexión, la computadora no muestra código
y dice que entrar necesita internet.

## Historia 1c: el celular y la computadora en espejo (RF-77)

**Quién:** cualquier usuario con su celular y su computadora emparejados.

**Qué necesita a la vista, en los dos:** con quién trabaja («Trabajando juntos con…»); si el otro
no está abierto («trabajás solo acá»); si están separados («Separados: cada uno por su lado»); y
un solo botón (decisión 73): «Vincular» si no hay vínculo, «Separar» si trabajan juntos y
«Juntar» si están separados. «Desvincular» está solo en Más, en los dos, y pregunta antes.
En la computadora el estado y el botón van en el menú lateral.
En el celular, el estado va en una franja arriba, sin botones; el botón va a la derecha del
encabezado de cada pantalla, chico, con el ícono y la leyenda debajo, como los del menú de abajo
(decisión 70): «Vincular» abre la cámara dentro de la aplicación para leer el código de la
computadora (decisión 63). En Más, el primer renglón es «Vincular con la computadora» o, ya
vinculado, «Desvincular de la computadora».

**Cuánto dura el vínculo:** en Más → Usuarios y sesiones, quien tiene «Administrar sesiones» ve
«El vínculo entre celular y computadora dura N días» y lo cambia ahí.
Sin celular emparejado, la computadora muestra en el menú «Vincular el celular», siempre.

**Reglas:**

- Se espeja la parte en la que están y la venta en curso. No lo que hay abierto encima (una
  ficha, una hoja, la cámara) ni lo escrito en la búsqueda.
- Separar y juntar se hacen con un toque. Desvincular pregunta antes, en los dos.
- Al conectarse los dos (se abre o se recarga cualquiera, o se acaban de vincular), la pantalla
  en la que quedan es la de la computadora: el celular va a ella, nunca al revés. Después, cada
  cambio de pantalla hecho en cualquiera de los dos mueve al otro (decisión 71).
- El trabajo a medio hacer (una venta, un ingreso, un pedido) lo retoma el que llega, del que
  ya lo tenía.
- Una pantalla que es solo del celular (la cámara para una foto o un código) no se interrumpe
  porque la computadora cambie de parte, y al salir de ella el celular vuelve a donde está
  la computadora.
- No hay aviso por cada cambio que llega del otro lado: la pantalla simplemente lo muestra.

## Historia 2: administrar usuarios

**Quién:** quien tiene el permiso «Administrar usuarios».

**Qué tiene que poder hacer:** ver quién puede entrar; autorizar un correo; darle y quitarle
roles a cada persona; desactivar y reactivar.

**Qué necesita a la vista:**

- Por cada usuario: nombre, correo, sus roles y si está activo. Los desactivados se distinguen de los
  activos sin leer la letra chica.
- Cuál de los usuarios es él mismo.
- Para autorizar, en este orden: nombre, correo de Google y los roles, una casilla por rol.
  Se pueden tildar varias. Ningún otro dato.

**Reglas:**

- Los roles de una persona se cambian en su fila: se ven los que tiene y, al pedir
  cambiarlos, una casilla por cada rol que existe. Guardar reemplaza la lista.
- Un usuario activo tiene al menos un rol. Guardar sin ninguno no se puede, y el aviso dice
  qué hacer: para que no pueda nada, se lo desactiva.
- Lo que la regla impide se explica en el lugar: desactivarse a uno mismo, quitarse a uno
  mismo los permisos de administrar, y dejar el sistema sin nadie activo que pueda
  administrar usuarios y roles.
- Desactivar avisa, después de hacerlo, que a ese usuario se le cerraron las sesiones.
- Un correo repetido se avisa en el campo del correo, y lo escrito no se pierde.

**Estados:**

| Estado | Qué se ve |
|---|---|
| Vacío | No existe: siempre figura al menos quien administra. La invitación a autorizar a alguien está siempre a la vista |
| Cargando | Que la lista se está trayendo |
| Éxito al autorizar | El usuario nuevo en la lista, y el alta lista para cargar otro |
| Éxito al desactivar o reactivar | La fila con el valor nuevo |
| Error de datos | Junto al campo: nombre vacío, correo mal escrito, correo que ya existe |
| Error de regla | Junto a la fila, con el motivo |
| Error del servidor | Que no se pudo guardar, con la fila como estaba y reintento |
| Sin conexión | Que administrar usuarios necesita internet |

## Historia 3: cada uno ve lo que puede

**Quién:** cualquier usuario.

**Qué necesita a la vista:** solo lo que sus roles le permiten usar.

**Reglas:**

- El menú muestra las partes en las que la persona puede hacer algo. Dentro de cada parte,
  las pestañas y los botones siguen la misma regla: quien no puede fijar márgenes ve el
  margen pero no los botones para cambiarlo; quien solo ve las compras ve la lista sin el
  formulario de ingreso; quien no corrige stock ve el inventario sin «Corregir».
- **Costos:** lo que cobra cada proveedor, la columna o el renglón «Costo», los proveedores
  de un producto con sus importes, la lista del proveedor para bajar y la explicación de
  cómo se llega a un precio se muestran solo con «Ver costos». Sin ese permiso se ven el
  precio de venta y el margen, sin explicación.
- **Anular ventas:** se anula solo desde la pestaña «Anular» de Vender (decisión 72): las
  ventas de hoy con «Anular ventas del día», y las de un día anterior solo con «Anular ventas
  de cualquier día», que es quien ve el selector de día.
- Lo que puede cualquiera con sesión está siempre: buscar en el catálogo, ver el inventario,
  sacarle la foto a un producto, sus propios celulares, Mejoras y errores y Salir.
- Quien llega por una dirección a una pantalla que no le corresponde ve «No tenés permiso
  para esta pantalla» y **el nombre del permiso que hace falta**, para saber qué pedir.
- La aplicación abre en la primera pantalla que la persona puede usar.
- En Vender, el margen que se elige en un renglón queda guardado en el producto solo si la
  persona puede fijar márgenes; si no, vale para esa venta, sin aviso.
- Si el servidor rechaza una acción por permiso (porque cambiaron los roles mientras la
  pantalla estaba abierta), el aviso dice qué permiso hace falta.

## Historia 3b: armar los roles

**Quién:** quien tiene el permiso «Administrar roles». Se llega desde Más → Roles.

**Qué tiene que poder hacer:** ver los roles; crear uno; cambiarle el nombre y los permisos;
borrar el que nadie tiene.

**Qué necesita a la vista:**

- Por cada rol: su nombre, los permisos que tiene (por nombre) y cuántas personas lo tienen.
- Al crear o cambiar: el nombre y **todos los permisos del sistema como casillas, agrupados
  por parte de la aplicación** (Vender, Catálogo, Depósito, Negocio, Administración), cada
  uno con una línea que explica qué deja hacer.

**Reglas:**

- Un rol necesita nombre y al menos un permiso; lo que falta se avisa en el formulario.
- «Borrar» aparece solo en el rol que nadie tiene; en los demás, una línea dice que primero
  hay que sacárselo a quien lo tiene.
- Después de guardar, un aviso dice que el cambio ya vale para quienes tienen el rol.
- Lo que la regla impide (nombre repetido, dejar el sistema sin quien administre, quitarse
  a uno mismo los permisos de administrar) se explica en el formulario, con lo cargado intacto.
- La pantalla es la misma en el celular y en la computadora.

| Estado | Qué se ve |
|---|---|
| Cargando | Que los roles se están trayendo |
| Éxito al guardar o borrar | La lista con el cambio y un aviso que nombra el rol |
| Error de datos o de regla | En el formulario, con el motivo |
| Sin conexión | Que armar roles necesita internet |

## Historia 4: la huella

**Quién:** cualquier usuario.

**Qué tiene que poder hacer:** aceptar o dejar pasar la oferta; ver sus celulares
vinculados; vincular el que tiene en la mano; quitar uno. El Administrador, además, quitar
el de otro usuario.

**La oferta (solo en el celular):**

- Aparece sola, una vez por dispositivo, justo después de la primera entrada con Google en
  un celular con lector de huella. Nunca en la computadora.
- Pregunta «¿Entrar con la huella?» y da dos salidas de igual facilidad: aceptar y dejarlo
  para después. Ignorarla o cerrarla vale como dejarlo para después.
- No tapa ni demora el trabajo más de lo que tarda en contestarse: quien la deja pasar
  queda donde iba a quedar.
- Al aceptar, el celular pide la huella; al leerla, la app confirma en una frase que desde
  ahora se entra con la huella.
- Si la huella no se lee, dice que se puede vincular después y dónde, y la oferta vuelve a
  aparecer en la próxima entrada con Google.

**Mis celulares vinculados (celular y computadora):**

- Por cada uno: el nombre que le puso, cuándo se vinculó y cuándo se usó por última vez.
- Cuál es el dispositivo que tiene en la mano, si está en la lista.
- «Vincular este celular con mi huella» aparece solo en un dispositivo que puede leer la
  huella y que no está ya vinculado. Pide un nombre, con uno propuesto que se puede dejar
  como está; el nombre se pide dentro de la app.
- Quitar uno es un paso, y dice después que ese celular ya no entra con la huella.
- Todo usuario llega a su lista desde el celular y desde la computadora.

**Celulares de otros (Administrador):** junto a cada usuario, sus celulares vinculados con
la misma información y la posibilidad de quitarlos. Es la respuesta a un celular perdido,
junto con cerrar sus sesiones.

**Estados:**

| Estado | Qué se ve |
|---|---|
| Vacío | Que no hay ningún celular vinculado y, si el dispositivo puede, la acción para vincular este |
| Dispositivo sin lector de huella | La lista, sin la acción de vincular, y por qué no está |
| Cargando | Que se está vinculando; el pedido de huella lo muestra el propio celular |
| Éxito al vincular | El celular en la lista, con su nombre, y la frase de confirmación |
| La huella no se leyó o se canceló | Que no se vinculó y que se puede probar de nuevo |
| Pedido vencido | Que tardó demasiado y que empiece de nuevo |
| Sin conexión | Que vincular y quitar necesitan internet |

## Historia 5: sesiones

**Quién:** quien tiene «Administrar sesiones» para ver y cerrar las de todos; cualquier usuario para salir de la
suya.

**Qué necesita a la vista el Administrador:**

- Por cada sesión abierta: de quién es, en qué dispositivo y cuándo se usó por última vez.
  Ordenadas de la usada más recientemente a la más vieja.
- Cuál es la suya en ese dispositivo, señalada con texto y no solo con color.

**Reglas:**

- Cerrar la propia se distingue a la vista de cerrar las demás, porque lo saca de la app.
  La diferencia no depende solo del color.
- Cerrar una sesión de otro la quita de la lista en el momento y deja al Administrador
  donde estaba.
- Cerrar la propia, o «Salir», lleva a la entrada.
- «Salir» está al alcance de cualquier usuario desde cualquier parte, en un paso.
- El dispositivo al que le cerraron la sesión vuelve solo a la entrada en su próxima
  operación, con «Hay que iniciar sesión».
- «Salir» sin conexión: [NEEDS CLARIFICATION: P9 de la spec: si el dispositivo no tiene internet, ¿«Salir» lo lleva igual a la entrada y la sesión se cierra en el servidor cuando reconecte, o no se puede salir sin conexión?]

**Estados:**

| Estado | Qué se ve |
|---|---|
| Vacío | No existe: siempre figura al menos la propia |
| Cargando | Que la lista se está trayendo |
| Éxito | La lista sin la sesión cerrada |
| Error | Que no se pudo cerrar, con la sesión en la lista y reintento |
| Sin conexión | Que ver y cerrar sesiones necesita internet |

## Historia 6: quién hizo qué

**Quién:** quien tiene el permiso «Ver quién hizo qué».

**Qué tiene que poder hacer:** recorrer el registro de a 10; filtrarlo por usuario, por
fecha o rango de fechas y por tipo de acción, solos o combinados; quitar los filtros.

**Qué necesita a la vista, en este orden:**

1. Los filtros: usuario, fecha, tipo de acción, y cuáles están puestos.
2. Cuántas acciones hay con esos filtros y en qué página está, de cuántas.
3. Las acciones de la página, de la más reciente a la más vieja. Por cada una: cuándo
   (día y hora), quién, qué, y el detalle.
4. Avanzar y retroceder.

**Reglas:**

- Nunca más de 10 acciones por página.
- El filtro de usuario ofrece a todos los usuarios, también los desactivados, y «el
  sistema» para las acciones sin usuario.
- El filtro de tipo ofrece los tipos con palabras del mostrador («Venta anulada», «Cambio
  de margen»), no con nombres técnicos; lo mismo vale para la columna «qué».
- La fecha se elige con un día o con un desde y un hasta.
- Cambiar un filtro lleva a la página 1 y actualiza el total.
- El detalle se lee en palabras: qué se cambió, de cuánto a cuánto, sobre qué producto,
  venta o usuario. Si es largo se resume, y el detalle completo se abre desde la acción.
- En la primera página no se puede retroceder ni en la última avanzar, y se nota.
- El registro es de solo lectura: no hay nada que editar ni que borrar.
- Los filtros puestos se conservan al avanzar y retroceder.

**Estados:**

| Estado | Qué se ve |
|---|---|
| Vacío sin filtros | Que no hay acciones registradas |
| Vacío con filtros | Que no hay acciones con esos filtros, y cómo quitarlos de un paso |
| Cargando | Que se está trayendo la página; los filtros y la página anterior no desaparecen |
| Error | Que no se pudo traer, con reintento |
| Sin conexión | Que el registro necesita internet |
