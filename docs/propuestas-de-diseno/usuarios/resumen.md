# Negocio → Usuarios: seis maquetas para Carlos

Las capturas están lado a lado en `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` y usa `../../../_comun/` y `../../_extra/` (íconos que se suman, piezas
de la pantalla y el código QR). Las seis muestran a las mismas siete personas para comparar igual con igual:
Carlos (vos) y Graciela, que administran; Martín (Recepción y Comprador), que está usando la compu del
depósito; Lucía y Nahuel (Vendedor); Sofía, que todavía no entró; y Diego, inactivo. En total hay 9 sesiones
y 5 celulares con huella, y una sesión que no se usa hace 41 días (la notebook de Graciela).

**Una diferencia con la especificación:** `ux.md` pone Usuarios en Más, con tres pestañas propias. El marco
común lo pone en **Negocio**, como pestaña al lado de Resumen y Quién hizo qué, y seguí el marco. Así, «Roles»
deja de ser una pestaña y vive adentro de Usuarios: un botón en la 1, la planilla misma en la 2, «Las llaves»
en la 3. Esto hay que confirmarlo con Carlos.

## Computadora

| | La idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Tabla y ficha** (evolución) | Arriba, cuatro números (activos, sesiones, huellas y lo que no se usa hace 30 días); debajo, una persona por renglón con sus roles y su acceso, y a la derecha la ficha fija de la persona elegida: roles con lo que puede en palabras, sesiones y celular con Cerrar o Quitar, y Desactivar. | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| **2 · La planilla de llaves** (reinvención) | Personas en las filas y roles en las columnas: un clic en una casilla da o quita el rol y se deshace con Ctrl Z. Autorizar a alguien es escribir una fila más. Al elegir una columna, a la derecha aparecen los permisos de ese rol como fichas que se prenden, cada uno con su explicación. | 4, 11, 12, 13, 14, 15, 16, 17 |
| **3 · La puerta** (audaz) | El marco cambia: el lateral queda plegado y no hay pestañas. Hay tres columnas. «En la puerta» muestra a quien quiso entrar sin estar autorizado y se lo deja pasar con un rol y Enter, o se lo suma con un QR. «Abierto ahora» muestra las sesiones por cuándo se usaron y qué está haciendo cada uno. «Las llaves» son los roles, y para dar uno se arrastra a la persona encima. | 5, 18, 19, 20, 21, 22, 23, 24 |

## Celular

| | La idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Tarjetas** (evolución) | Lo aprobado el 17/10 (botón naranja para autorizar, buscador con Filtros, tarjetas plegadas), con la pestaña de acceso agrupada **por aparato**: el Samsung muestra su sesión y su huella en un solo renglón. | 3, 6, 25, 26 |
| **2 · La hoja de la persona** (reinvención) | Al tocar a alguien sube una hoja con sus roles como llaves que se prenden y apagan de un toque, sin «Cambiar roles» ni Guardar. Una línea dice cuánto puede hacer y debajo están los aparatos donde entró: una sesión se cierra deslizándola. | 2, 7, 8, 27, 28, 29 |
| **3 · Mostrale el código** (audaz) | Ocupa toda la pantalla y no tiene menú. Para sumar a alguien no se tipea su correo: se le muestra un QR a la persona, ella entra con su Google en su celular y en el tuyo aparece su nombre. Le elegís el rol con un botón grande y lo autorizás con tu huella. | 18, 19, 30, 31, 32 |

**Qué rompe cada audaz.** En la computadora, saca las pestañas y pliega el lateral, y cambia la lista de
personas por tres columnas de trabajo. En el celular, saca el marco entero y el formulario de alta: el
correo se toma de la cuenta de Google de quien escanea.

## Cuál me gusta más

**Computadora: la 1, con la casilla de la 2 y «En la puerta» de la 3.** La 1 se lee de un vistazo y
responde a la pregunta de todos los días: quién es, qué puede y dónde tiene la sesión abierta. Pero cambiar
un rol tendría que ser un clic, como en la planilla, sin pasar por «Cambiar». Y que quien intentó entrar
aparezca solo para dejarlo pasar es lo que más tiempo ahorra de todo el catálogo. Hoy esa persona tiene que
llamar al administrador y dictarle su correo.

**Celular: la 2.** En el celular, la persona se mira de a una, y una hoja con llaves que se prenden es lo
más directo: cambiar un rol pasa de cuatro toques a dos. A la 1 le sumaría la agrupación por aparato. La 3
es la mejor forma de autorizar a alguien parado al lado tuyo en el mostrador (el caso real en una
ferretería), pero cambia la regla del alta. Hay que preguntarle a Carlos.

## Cómo se mueve (una línea por interacción)

- **Elegir una persona (compu 1):** el borde del renglón pasa a pino en 120 ms y la ficha cambia de
  contenido con un fundido corto, sin moverse de lugar.
- **Tildar una casilla (compu 2):** la casilla se llena desde el centro con rebote corto, el número de
  «Puede» rueda y abajo sube una tostada con Ctrl Z que dura 4 s.
- **Escribir el correo nuevo (compu 2):** la fila naranja crece 8 px y, al apretar Enter, se vuelve una
  fila normal que baja a su lugar en el orden. Su borde queda verde 1 s.
- **Prender un permiso (compu 2):** la ficha se tiñe de pino suave, aparece la tilde (que se dibuja en 200 ms)
  y el contador del rol rueda.
- **Alguien en la puerta (compu 3):** la tarjeta entra desde arriba con rebote y la insignia salta. Al
  dejarlo entrar, la tarjeta vuela hacia «Las llaves» y su avatar aparece en la pila de su rol.
- **Arrastrar a una persona (compu 3):** el avatar se levanta con sombra 3 e inclinado 6°, el rol de
  destino se marca punteado en pino y, al soltarlo, el avatar se suma a la pila.
- **Abrir la tarjeta (celu 1):** la tarjeta crece hacia abajo (320 ms) y la flecha gira 180°.
- **Llave (celu 2):** el círculo se desliza en 200 ms y la tarjeta pasa a pino suave. Vibra 10 ms, y la
  línea «Puede 8 de 21» rueda su número.
- **Cerrar una sesión deslizando (celu 2):** el renglón sigue al dedo y aparece el rojo debajo. Al
  soltarlo se colapsa y vibra dos veces; en el otro aparato, la app vuelve sola a la entrada.
- **Llega quien escaneó (celu 3):** el QR se achica y se aclara, la tarjeta sube desde abajo con
  rebote y los pasos marcan «Entró». Con la huella, la tilde se dibuja y la persona queda en la lista.

## Autocrítica (lo que corregí antes de mostrar)

- **Compu 1:** la tabla tenía una columna «Estado» con «Activo» repetido siete veces, y no entraba. Ahora
  solo se marca lo distinto («Inactivo», «No entró aún»). Los roles pasaron a «Administrador +1» para
  que no se partan en dos renglones, y los números de arriba quedaron en una línea («6 activos de 7»).
  Llené el hueco de la ficha con «Último: registró el ingreso de Fischer».
- **Compu 2:** el panel del rol se salía por abajo. Los permisos que el rol no tiene en un grupo entero
  quedan resumidos («Vender: ninguno de 4») y los nombres de las columnas ya no se cortan con guiones.
- **Compu 3:** el código QR era un ícono y no se creía; ahora es un QR dibujado.
- **Celu 1:** el acceso repetía el mismo Samsung dos veces (sesión y huella). Ahora es un renglón por aparato.
- **Celu 2:** las explicaciones de los roles se partían en dos líneas. Las acorté y saqué la flecha que
  sobraba en el renglón de la compu.
- **Celu 3:** los pasos se partían y la mitad de abajo quedaba vacía. Agrandé el QR y los botones de
  rol, y puse abajo «Mandar enlace» y «No es de acá».
- **Lo más flojo que queda:** son iniciales y no fotos, porque Usuarios no tiene productos. Con una foto
  de cada persona (la de su cuenta de Google) las tres variantes subirían de nivel. En la compu 2, con
  más de 10 personas, la planilla necesita desplazarse y la fila nueva tendría que quedar fija abajo.
  Además, ninguna variante muestra todavía los estados de error en el lugar («no te podés desactivar
  vos», correo repetido).

## Catálogo de ideas

«Toques» es lo que ahorra en las dos tareas más frecuentes. **Autorizar a alguien:** hoy en el celular
son unos 8 toques (abrir el alta, nombre, correo, tildar un rol, confirmar) más tipear el correo.
**Cambiarle un rol a alguien:** hoy son unos 4 toques (abrir la tarjeta, Roles, Cambiar roles, tildar,
guardar).

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Cuatro números arriba: activos de N, sesiones, celulares con huella y sin usar hace 30 días | Saber de un vistazo si hay algo raro en el acceso | C1 | Stripe (resumen del equipo) | — | **Sí** |
| 2 | La sesión que no se usa hace más de 30 días, marcada en ámbar | Una sesión vieja abierta es un riesgo que hoy no se ve | C1, C3, celu 2 | Google (actividad de la cuenta) | — | **Sí** |
| 3 | Punto verde en el avatar de quien está usando la app ahora | Saber si cerrarle la sesión le corta el trabajo | C1, C3, celu 1, celu 2 | Slack | — | **Sí** |
| 4 | El renglón muestra solo lo distinto («Inactivo», «No entró aún»), no «Activo» siete veces | Lo raro salta a la vista | C1, C2 | Linear | — | No (lo pide «se distinguen sin leer») |
| 5 | «Todavía no entró» para quien está autorizado y nunca entró | Saber si a la persona le llegó el alta o se equivocó de correo | C1, C2, C3 | Google Workspace (invitación pendiente) | — | **Sí** |
| 6 | Ficha fija a la derecha (compu) o tarjeta abierta (celu) con roles, acceso y Desactivar juntos | Todo de una persona en un lugar | C1, celu 1 | Linear (panel de detalle) | 1 | No |
| 7 | Lo que puede en palabras («Recibe mercadería… No vende.») o «Puede 8 de 21» | Los roles son nombres y no se sabe qué deja hacer cada uno | C1, C2, celu 2 | 1Password (acceso del miembro) | — | **Sí** |
| 8 | «Qué hizo hoy» y la última acción en la ficha, que llevan a Quién hizo qué ya filtrado | Pasar de la persona a su registro sin filtrar a mano | C1, celu 2 | GitHub (actividad del miembro) | 3 | **Sí** |
| 9 | «Vos» en tu propio renglón | Lo pide la spec («cuál es él mismo») | C1, C2, celu 1 | — | — | No |
| 10 | Atajos: Alt N para autorizar, Alt R para roles, R para cambiar los roles, / para buscar | Todo con el teclado | C1, C2 | Linear | — | No |
| 11 | Planilla personas × roles con una casilla por cruce, y un clic guarda | Ver quién tiene qué de un vistazo y cambiarlo sin abrir nada | C2 | Google Drive (compartir), Excel | 3 por cambio | No (cambia el «Cambiar roles») |
| 12 | Deshacer con Ctrl Z en una tostada, en lugar de confirmar | Sin confirmación (regla del ux.md), pero con red | C2 | Gmail (deshacer) | 1 | No |
| 13 | Autorizar es escribir una fila más: correo, casillas y Enter | El alta sin formulario aparte | C2 | Airtable (fila nueva) | 2–3 | No |
| 14 | El correo se autocompleta con quien ya intentó entrar | No dictar el correo letra por letra | C2 | Slack (invitar) | tipear el correo | **Sí** |
| 15 | La casilla que no te podés quitar (tu Administrador) se ve trabada, con el motivo abajo | La regla se entiende antes de chocar con ella | C2 | macOS (opción bloqueada) | 1 error | No |
| 16 | La columna elegida muestra a la derecha los permisos del rol como fichas que se prenden | Armar el rol sin ir a otra pestaña | C2 | Notion (permisos) | 2 | No |
| 17 | Al elegir un permiso, su explicación y a quién afecta («lo ganan los dos enseguida») | Saber el efecto antes de tocar | C2 | Stripe (explicación del cambio) | — | No (lo pide la spec) |
| 18 | «En la puerta»: quien quiso entrar sin estar autorizado aparece con su correo, el aparato y la hora | Hoy esa persona tiene que avisar y dictar su correo | C3, celu 3 | Slack (pedidos para unirse), Google Docs (pedir acceso) | 5–8 y tipear | **Sí** (cambia RF-70) |
| 19 | Sumar a alguien con un QR que escanea con su celular y entra con su Google | Autorizar a quien está al lado sin tipear nada | C3, celu 3 | WhatsApp (dispositivos vinculados), Wi-Fi por QR | ~6 y tipear | **Sí** (cambia RF-70) |
| 20 | Sesiones ordenadas por cuándo se usaron: usando la app, hoy, hace mucho | Ver primero lo que hay que cerrar | C3 | Google (dónde iniciaste sesión) | — | No (amplía RF-74) |
| 21 | Qué está haciendo cada uno ahora («Vendiendo · 3 renglones») | Saber a quién no conviene cortarle la sesión | C3 | Figma (quién está en el archivo) | — | **Sí** |
| 22 | Roles como llaves con la pila de avatares; para dar uno, se arrastra a la persona | Dar un rol con un gesto y ver quién tiene cada uno | C3 | Trello, Linear (asignar arrastrando) | 2 | **Sí** |
| 23 | «¿Se perdió un celular?»: cerrar todo lo de una persona de un toque | El caso que justifica RF-74, en un lugar que se encuentra con apuro | C3 | Apple (Buscar mi iPhone) | 3–4 | **Sí** |
| 24 | El lateral plegado y tres columnas sin pestañas | Ver la puerta, lo abierto y las llaves a la vez | C3 | Linear (vista de tablero) | — | **Sí** (marco) |
| 25 | Acceso agrupado por aparato: la sesión y la huella del mismo celular en un renglón | El mismo Samsung no figura dos veces | celu 1, celu 2 | Google (tus dispositivos) | — | No |
| 26 | La pestaña «Acceso (N)» cuenta los aparatos, no sesiones más huellas | El número se entiende | celu 1 | — | — | No (cambia el texto de la decisión 102) |
| 27 | Hoja que sube con la persona, en lugar de abrir la tarjeta en el lugar | La lista no salta y la persona tiene todo el alto | celu 2 | Apple Maps, Contactos | 0 | No |
| 28 | Roles como llaves de prender y apagar, que guardan al tocar | Sin «Cambiar roles» ni Guardar | celu 2 | Ajustes de iPhone | 2 por cambio | No (cambia el recorrido) |
| 29 | Deslizar un aparato para cerrar su sesión | Cerrar sin buscar el botón, con una mano | celu 2 | Mail de iPhone | 0–1 | No |
| 30 | Pasos a la vista: Escaneó · Entró · Elegí qué hace | Saber en qué va el alta mientras el otro maneja su celular | celu 3 | Apple Pay (pasos) | — | **Sí** |
| 31 | Tres roles grandes (72 px) y «También: Gerente · Administrador» | Elegir con guantes y sin una lista larga | celu 3 | Square (botones grandes) | 1 | **Sí** |
| 32 | Autorizar con tu huella, sin un botón de confirmar aparte | Que el alta quede firmada por quien administra | celu 3 | Apple Pay | 1 | **Sí** |

Toques de la tarea más frecuente:

- **Autorizar a alguien que está al lado.** En el celular hoy son unos 8 toques más tipear el correo.
  Con la celu 3 son **3** (Sumar a alguien, elegir el rol, la huella) y nada que tipear. Con la compu 3 son
  **2** (rol y Enter) si la persona ya intentó entrar.
- **Cambiarle un rol a alguien.** Hoy son unos 4 toques. Con la celu 2 son **2** (tocar a la persona y la
  llave) y con la compu 2, **1** clic.
