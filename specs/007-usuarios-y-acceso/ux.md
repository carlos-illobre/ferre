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
| Volviendo de Google, en el celular | Desde que Google confirma la cuenta hasta que la sesión queda abierta, en lugar de la entrada: la marca, «Conectando tu cuenta de Google», «Google confirmó tu cuenta. Ahora Ferrebress abre tu sesión; tarda unos segundos.», el camino Google → Ferrebress → el local, con dos tramos de puntos que son los dos pasos,: «Cuenta de Google verificada» (hecho) y «Abriendo tu sesión» (en curso). Abajo, la onda verde y naranja de la entrada. Sale apenas se vuelve de la ventana de Google, sin mostrar la entrada ni un instante; si se vuelve sin cuenta (se canceló en Google), a los 6 segundos vuelve la entrada. Si el servidor no deja entrar, vuelve la entrada con el error. Maqueta aprobada por Carlos el 2026-10-17: `maquetas/celular-conectando-con-google.png` |
| Correo sin autorizar o usuario desactivado | El texto de la regla, con el correo; se puede intentar con otra cuenta |
| Celular que no está vinculado | Que ese celular no está vinculado y que entre con Google |
| La huella no se leyó o se canceló | Que no se pudo leer y que pruebe de nuevo o entre con Google |
| Demasiados intentos | El texto de la regla |
| Sin conexión | Que para entrar se necesita internet, y reintento |
| Google no responde | Que Google no responde; la huella sigue disponible donde esté vinculada |
| Sesión cerrada a distancia o vencida, o usuario desactivado | Se vuelve solo a la entrada, con «Hay que iniciar sesión». Con la aplicación abierta y conexión, en menos de 30 segundos y sin tocar nada; si estaba en otra ventana, al volver; sin conexión, al recuperarla |

## Historia 1b: entrar a la computadora con el celular (RF-76)

**Maquetas aprobadas por Carlos el 2026-10-12** (`maquetas/`), con el logotipo de siempre y
el botón de Google de verdad.

**Quién:** cualquier usuario autorizado, sin sesión en la computadora.

**Qué necesita a la vista en la computadora:** el código, sin pedirlo; los dos pasos, al lado;
que se renueva solo; «Continuar con Google» debajo, como alternativa. «Entrar con la huella»
solo si esa computadora fue vinculada.

**Cómo se ve la entrada de la computadora (decisión 93, maqueta aprobada por Carlos el
2026-10-16: `maquetas/entrar-compu-con-celular.html`):** copia una imagen de referencia de
Carlos. Tres zonas: el verde de la marca a la izquierda; en el medio una foto desenfocada de
estantes y una mesa, con bordes curvos, y un celular apoyado que muestra la pantalla de Vender con
una venta en curso y el menú de abajo (una captura real, que se vuelve a sacar si esa pantalla
cambia); y a la derecha, sobre fondo claro, la tarjeta para entrar, con un pie «Tus datos están
protegidos». En una ventana angosta primero se van el celular y la foto, y después la marca: la
tarjeta queda siempre. Solo en la computadora: la entrada del celular sigue como está.
El 2026-10-16 Carlos volvió a pasar la referencia (`maquetas/entrar-compu-referencia.webp`) y su
kit de capas (`maquetas/entrar-compu-kit-de-capas.webp`) para que se parezca más, con dos
diferencias: el celular muestra la venta y no hay «¿Necesitás ayuda?». De ahí: el celular tiene
marco metálico, espesor y muesca, apoyado en la mesa; el botón de Google ocupa el ancho de la
tarjeta; cada una de las tres cosas que hace corta en el mismo lugar que la referencia; y el verde
tiene un degradé suave con arcos. Después Carlos pasó las capas sueltas
(`maquetas/capas/`): el fondo, la foto del local y el celular salen de ellas; el texto y la
tarjeta siguen siendo de la aplicación (las capas los traen como imagen, con letras deformadas).
El celular es el que pasó Carlos con la venta ya puesta (`maquetas/capas/celular-con-venta.png`),
sin su fondo: se ve más nítido que el de la capa. Si cambia la pantalla de Vender, se vuelve a
armar con la captura nueva sobre el celular de la capa, o con otro celular que pase Carlos.
La separación de los textos de la izquierda (logotipo, antetítulo, título, bajada y las tres cosas
que hace) y el tamaño de sus íconos se midieron sobre un recorte de la referencia que pasó Carlos
el 2026-10-16: quedan a 2 o 3 píxeles de ella en una pantalla de 1536 × 1024.
En un monitor más ancho que 16:9 (un ultra ancho de 2560 × 1080, por ejemplo) la escena no se
estira, porque la foto se deformaba y quedaba un hueco en el medio: queda centrada, del ancho de un
16:9, con las puntas redondeadas y un margen arriba y abajo, y a los dos costados va un verde casi negro, liso (elegido por
Carlos el 2026-10-16). Hasta 16:9 se ve igual que antes. El verde no es liso: es la imagen que
pasó Carlos ese día (`maquetas/capas/fondo-verde-con-logo.png`), sin su logo, estirada sobre la
zona verde: tres tonos en curva en las esquinas (arriba junto a la curva y abajo a la izquierda) y
el centro más oscuro. La foto y el lado claro no cambian.
En la columna de la izquierda, debajo de las tres cosas que hace, va el botón «Ver tutorial», con
el naranja de los botones principales, ancho y con un ícono de reproducir; reemplaza a la frase
manuscrita. Carlos lo eligió el 2026-10-16 entre tres lugares (arriba del celular, debajo, o este). Abre el manual de uso en la misma pestaña (`specs/012-manual-de-uso/`).
La tarjeta para entrar es más ancha, para que los pasos no queden apretados; si el celular la
alcanza, pasa por encima de su borde sin tapar el código.
Debajo de la tarjeta, centrados respecto de ella, tres sellos con ícono y texto en dos renglones:
«Seguro y confiable» (escudo), «Siempre actualizado» (nube) y «Desde cualquier dispositivo»
(computadora y celular). El aviso de quién puede entrar lleva un escudo en vez del signo de
atención. Carlos lo eligió el 2026-10-17 de una referencia suya, sin el resto de sus detalles
(frases manuscritas, «¿Necesitás ayuda?», duración del tutorial): maqueta
`maquetas/entrar-compu-sellos.png`. En una ventana angosta, cuando se va la marca, se van también los sellos.
El celular va abajo, apoyado en la mesa de la foto. El 2026-10-17 Carlos probó subirlo (centrado
en el alto, y después a mitad de camino) y lo volvió a poner abajo: así parece apoyado.

**Qué necesita a la vista en el celular:**

- En la entrada del celular, un botón «Escanear el código de la computadora» que abre la cámara
  sin salir de la aplicación (decisión 62). Leerlo con la cámara del teléfono sigue valiendo.
- Sin sesión: la entrada de siempre, con un aviso de que al entrar ahí la computadora entra
  también, y el botón de la huella primero, que lo dice: «Entrar acá y en la computadora».
- Con la sesión ya abierta: un solo botón, «Entrar en la computadora», y «Ahora no».
- Después: el celular sigue a su pantalla de siempre y dice unos segundos, en la línea de arriba,
  «Listo: la computadora entró como …». No hay pantalla de «Listo» ni botón para abrir el lector:
  el lector se abre cuando la computadora lo pide (pedido de Carlos del 2026-10-15; maqueta
  `maquetas/entrar-con-el-celular-sin-pantalla-de-listo.html`). Si la computadora no entró, una
  pantalla dice por qué, con «Seguir en el celular».

**Reglas:** no hay pantalla de confirmación aparte; un código vencido o ya usado dice que hay
que leer el que la computadora muestra ahora; sin conexión, la computadora no muestra código
y dice que entrar necesita internet.

## Historia 1c: el celular y la computadora en espejo (RF-77)

**Quién:** cualquier usuario con su celular y su computadora emparejados.

**Qué necesita a la vista, en los dos:** con quién trabaja («Conectado con…»); si el otro
no está abierto («trabajás solo acá»); si están separados («Desconectados: cada uno por su lado»); y
un solo botón (decisión 73): «Vincular» si no hay vínculo, «Desconectar» si trabajan juntos y
«Reconectar» si están separados. «Desvincular» está solo en Más → Configuración, en los dos, y
pregunta antes (decisiones 74 y 99).
En la computadora el estado y el botón van en el menú lateral; el botón lleva a la izquierda el
mismo ícono que en el celular (dos flechas que se alejan para «Desconectar», dos que se acercan
para «Reconectar»).
En el celular no hay leyenda del vínculo (decisión 76): el estado lo dice el color del botón, que
lleva borde. Verde: están trabajando juntos. Gris: están desconectados o la computadora no está
abierta. El botón va a la derecha del encabezado de cada pantalla, chico, con el ícono a la
izquierda y la leyenda a su derecha (decisiones 70 y 76). Lo que termina en la computadora se
avisa un momento en la línea de arriba, la del estado de la conexión. «Vincular» abre la cámara dentro de la aplicación para leer el código de la
computadora (decisión 63). En Más, mientras no esté vinculado, el primer renglón es «Vincular con
la computadora».

**El bloque «Vínculo entre celular y computadora»,** en Más → Configuración (decisiones 74 y 99):
a quien está vinculado le dice con qué dispositivo y le ofrece «Desvincular». Quien no está
vinculado no ve el bloque. **Cuántos días dura el vínculo** vale para todo el negocio: está solo
al final de Más → Usuarios, en un recuadro «Vínculo entre celular y computadora: dura 30 días», para
quien tiene «Administrar usuarios», que lo cambia ahí (decisión 100); Configuración no lo muestra.
Sin celular emparejado, la computadora muestra en el menú «Vincular el celular», siempre.

**Reglas:**

- Se espeja la parte en la que están y la venta en curso. No lo que hay abierto encima (una
  ficha, una hoja, la cámara) ni lo escrito en la búsqueda.
- Desconectar y reconectar se hacen con un toque. Desvincular pregunta antes, en los dos.
- Al conectarse los dos (se abre o se recarga cualquiera, o se acaban de vincular), la pantalla
  en la que quedan es la de la computadora: el celular va a ella, nunca al revés. Después, cada
  cambio de pantalla hecho en cualquiera de los dos mueve al otro (decisión 71).
- El trabajo a medio hacer (una venta, un ingreso, un pedido) lo retoma el que llega, del que
  ya lo tenía.
- Una pantalla que es solo del celular (la cámara para una foto o un código) no se interrumpe
  porque la computadora cambie de parte, y al salir de ella el celular vuelve a donde está
  la computadora.
- No hay aviso por cada cambio que llega del otro lado: la pantalla simplemente lo muestra.

## Más → Usuarios: tres pestañas (decisiones 88 y 100)

Lo de los usuarios está en una sola opción de Más, **«Usuarios»**, con la bajada «Quién
entra y desde dónde, qué puede hacer y qué hizo». Adentro hay tres pestañas, como en
Depósito, en este orden (la cuarta, Sesiones, se sacó el 2026-10-17: decisión 100):

| Pestaña | Qué tiene | Quién la ve |
|---|---|---|
| **Usuarios** | Los usuarios autorizados y autorizar a alguien (Historia 2); en la tarjeta de cada persona, sus sesiones abiertas (Historia 5) y sus celulares con huella (Historia 4); al final, cuántos días dura el vínculo (Historia 1c) | «Administrar usuarios» |
| **Roles** | Los roles y armar uno (Historia 3b) | «Administrar roles» |
| **Quién hizo qué** | El registro de acciones (Historia 6) | «Ver quién hizo qué» |

- Cada uno ve solo las pestañas que su rol le permite, y la opción entra en la primera que
  ve. Quien no ve ninguna no tiene «Usuarios» en Más.
- Lo que cada persona decide para sí misma está en Más → Configuración, no acá: sus celulares
  con huella y su vínculo entre celular y computadora (decisiones 99 y 100). Nada figura en los dos lugares.
- En el celular la tercera pestaña dice «Actividad», porque el nombre largo no entra; cada
  pestaña lleva su ícono arriba del nombre. En la computadora dice «Quién hizo qué».
- Las pestañas no llevan atajo Alt (los números ya son del menú y de Depósito): en la
  computadora se recorren con las flechas, como el resto de Más.
- Cada pestaña tiene su propia dirección, para volver a ella al recargar y para el espejo
  entre el celular y la computadora.
- En el celular, arriba de las pestañas está «Volver a Más»; en la computadora no, se vuelve con «Más» del menú (decisión 90).

Maquetas aprobadas por Carlos el 2026-10-14: `maquetas/mas-con-usuarios.html` y
`maquetas/usuarios-pestanas.html`.

**La pestaña Usuarios en el celular** (Carlos, 2026-10-17; maqueta aprobada
`maquetas/celular-usuarios.png`, sobre su modelo `maquetas/celular-usuarios-referencia-de-carlos.png`):

1. La bajada: «Gestioná quién puede entrar y con qué roles. Se entra con Google.»
2. «Autorizar otro correo de Google» («Invitá a más personas de tu negocio.»), en un
   recuadro punteado con un «+» naranja. La cabecera «Usuarios autorizados» con cuántos son,
   que estaba arriba, se sacó: ocupaba lugar y no hacía falta (Carlos, 2026-10-17).
3. Debajo, el buscador y la lista «Rol» (ver «Buscar y filtrar por rol»).
4. Una tarjeta por persona: sus iniciales en un círculo de color, el nombre con «Activo» o
   «Inactivo» y el correo entero debajo; «Roles asignados», cada rol en una pastilla con su
   ícono (el Administrador resaltado); y abajo, «Cambiar roles» y a su derecha «Desactivar»
   (naranja) o «Reactivar» (verde). Nada de la tarjeta usa el color del fondo de la pantalla,
   para que se destaque (Carlos, 2026-10-17): «Cambiar roles» va en verde lleno con letra
   blanca; «Desactivar» y «Reactivar», en blanco con borde y letra naranja o verde; y cada
   pastilla de rol, en blanco con un borde marcado.

**Buscar y filtrar por rol** (Carlos, 2026-10-17; maquetas aprobadas
`maquetas/celular-usuarios-filtro.png` y `maquetas/compu-usuarios-filtro.png`). En el celular va
debajo de «Autorizar otro correo de Google»; en la computadora, arriba de la tabla, porque ahí el
alta está al final. En una misma fila:

- **Un buscador «Correo o nombre»**, con la lupa a la izquierda y una cruz para borrarlo cuando
  tiene algo. Encuentra a quien tenga lo escrito en cualquier parte del correo o del nombre, sin
  importar mayúsculas ni tildes («lucia» encuentra a «Lucía»). Mientras se escribe, debajo
  aparecen hasta cinco sugerencias, del ancho de la fila: el correo con lo escrito resaltado y el
  nombre. Elegir una (tocándola, o con las flechas y Enter en la computadora) deja el correo en
  el buscador y cierra las sugerencias; Escape las cierra sin elegir.
- **Una lista desplegable «Rol»**, que empieza en «Todos» y tiene los roles que existen. Con un
  rol elegido quedan solo quienes lo tienen; en el celular, la lista se marca en verde.
- Los dos se combinan. Con cualquiera de los dos puesto, una línea dice cuántos quedan:
  «2 de 4 usuarios con el rol Recepción», o «1 de 4 usuarios» si solo se buscó. Si no queda
  nadie: «Nadie coincide con la búsqueda.»
- Buscar no cambia nada guardado; al salir de la pantalla, el filtro se pierde.

## Historia 2: administrar usuarios

**Quién:** quien tiene el permiso «Administrar usuarios».

**Qué tiene que poder hacer:** ver quién puede entrar; autorizar un correo; darle y quitarle
roles a cada persona; desactivar y reactivar.

**Qué necesita a la vista:**

- Por cada usuario: nombre, correo, sus roles y si está activo. Los desactivados se distinguen de los
  activos sin leer la letra chica.
- Cuál de los usuarios es él mismo.
- Para autorizar, en este orden: nombre, correo de Google y los roles, una casilla por rol.
  En la computadora el formulario usa todo el ancho (pedido de Carlos del 2026-10-13): nombre,
  correo y el botón «Autorizar» en una misma línea, y debajo los roles repartidos en columnas,
  uno al lado del otro, cada uno con su explicación. No queda una columna angosta de roles con
  la mitad de la pantalla vacía.
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

**Quién:** quien tiene el permiso «Administrar roles». Se llega desde Más → Usuarios, pestaña Roles.

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
vinculados; vincular el que tiene en la mano; quitar uno. Quien tiene «Administrar usuarios»,
además, quitar el de otro usuario.

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

**Mis celulares vinculados (celular y computadora),** en Más → Configuración (decisión 99):

- Por cada uno: el nombre que le puso, cuándo se vinculó y cuándo se usó por última vez.
- Cuál es el dispositivo que tiene en la mano, si está en la lista.
- «Vincular este celular con mi huella» aparece solo en un dispositivo que puede leer la
  huella y que no está ya vinculado. Pide un nombre, con uno propuesto que se puede dejar
  como está; el nombre se pide dentro de la app.
- Quitar uno es un paso, y dice después que ese celular ya no entra con la huella.
- Todo usuario llega a su lista desde el celular y desde la computadora.

**Celulares de otros («Administrar usuarios»),** en la tarjeta de cada persona, en Más →
Usuarios, junto con sus sesiones (decisión 100): cada celular con la misma información y
«Quitar». En la tarjeta propia no figuran, porque están en Configuración. Es la respuesta a un
celular perdido, junto con cerrar sus sesiones.

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

**Quién:** quien tiene «Administrar usuarios» para ver y cerrar las de todos, en la tarjeta de
cada persona en Más → Usuarios; cualquier usuario para salir de la suya, con «Salir».

**Dónde (decisión 100):** en la tarjeta de cada persona, debajo de sus roles, una línea plegada
dice cuánto tiene, por ejemplo «2 sesiones abiertas · 1 celular con huella ›». Al tocarla se
despliegan sus sesiones (dispositivo, navegador y último uso, con «Cerrar») y sus celulares con
huella (nombre y último uso, con «Quitar»). Sin nada, la línea no está. En la computadora, la
fila de la tabla tiene una columna «Acceso» con la misma línea, que despliega lo mismo debajo
de la fila.

**Qué necesita a la vista el Administrador:**

- Por cada sesión abierta: de quién es, en qué dispositivo y cuándo se usó por última vez.
  Ordenadas de la usada más recientemente a la más vieja.
- La suya en ese dispositivo no figura: se cierra con «Salir», que no se repite en la lista
  (decisión 99). Sus sesiones en otros dispositivos sí figuran.

**Reglas:**

- Cerrar una sesión de otro la quita de la lista en el momento y deja al Administrador
  donde estaba.
- «Salir» lleva a la entrada.
- «Salir» está al alcance de cualquier usuario desde cualquier parte, en un paso.
- El dispositivo al que le cerraron la sesión vuelve solo a la entrada, con «Hay que iniciar
  sesión»: con la aplicación abierta y conexión, en menos de 30 segundos, sin que nadie toque
  nada; si estaba en otra ventana, apenas vuelve; sin conexión, al recuperarla. Lo mismo pasa
  al desactivar a alguien (decisión 97).
- «Salir» sin conexión: [NEEDS CLARIFICATION: P9 de la spec: si el dispositivo no tiene internet, ¿«Salir» lo lleva igual a la entrada y la sesión se cierra en el servidor cuando reconecte, o no se puede salir sin conexión?]

**Estados:**

| Estado | Qué se ve |
|---|---|
| Vacío | Que no hay otras sesiones abiertas |
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
