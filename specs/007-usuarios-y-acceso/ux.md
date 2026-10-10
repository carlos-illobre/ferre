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
- **Rol, no persona.** Los textos dicen Administrador, Vendedor y Comprador; nunca «dueño»
  ni «empleado».
- **Roles.** En esta versión todos los usuarios son Administrador y pueden hacer todo. Cuando
  haya permisos por rol, lo que un usuario no pueda hacer no se le va a ofrecer: no se
  muestra deshabilitado ni con candado.
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
| Roles | «Administrador», «Vendedor», «Comprador», siempre con esos nombres |

## Historia 1: entrar

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

## Historia 2: administrar usuarios

**Quién:** Administrador (en esta versión, todo usuario).

**Qué tiene que poder hacer:** ver quién puede entrar; autorizar un correo; desactivar y
reactivar.

**Qué necesita a la vista:**

- Por cada usuario: nombre, correo y si está activo. Los desactivados se distinguen de los
  activos sin leer la letra chica.
- Cuál de los usuarios es él mismo.
- Para autorizar, en este orden: nombre y correo de Google. Ningún otro dato.

**Reglas:**

- En esta versión no se elige rol: toda persona autorizada entra como Administrador y puede
  hacer todo. Elegir, agregar y quitar roles llega cuando se definan los permisos de cada
  rol; el diseño no tiene que reservarle lugar.
- Lo que la regla impide se explica en el lugar: desactivarse a uno mismo («lo tiene que
  hacer otro Administrador») y dejar el sistema sin ningún Administrador activo.
- Desactivar avisa, después de hacerlo, que a ese usuario se le cerraron las sesiones.
- Un correo repetido se avisa en el campo del correo, y lo escrito no se pierde.
- Si se conserva alguna protección entre Administradores (pregunta P4 de la spec), lo que
  no se puede tocar se explica en la fila.

**Estados:**

| Estado | Qué se ve |
|---|---|
| Vacío | No existe: siempre figura al menos el propio Administrador. La invitación a autorizar a alguien está siempre a la vista |
| Cargando | Que la lista se está trayendo |
| Éxito al autorizar | El usuario nuevo en la lista, y el alta lista para cargar otro |
| Éxito al desactivar o reactivar | La fila con el valor nuevo |
| Error de datos | Junto al campo: nombre vacío, correo mal escrito, correo que ya existe |
| Error de regla | Junto a la fila, con el motivo |
| Error del servidor | Que no se pudo guardar, con la fila como estaba y reintento |
| Sin conexión | Que administrar usuarios necesita internet |

## Historia 3: todos pueden todo

**Quién:** cualquier usuario.

**Regla:** en esta versión todos los usuarios son Administrador y a todos se les ofrecen
todas las operaciones. La interfaz no oculta, no deshabilita ni restringe nada por rol, y
no hace falta mostrar el rol junto al nombre. Qué ve cada rol se escribe acá cuando se
definan los permisos (etapa posterior).

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

**Quién:** Administrador para ver y cerrar las de todos; cualquier usuario para salir de la
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

**Quién:** Administrador.

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
