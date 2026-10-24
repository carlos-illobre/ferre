# Más: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/`, `../../mas.css` y `../../mas.js`). Todas
muestran el mismo caso: Carlos Illobre (Administrador y Gerente, ve las cinco opciones), con el
celular en espejo, 5 anomalías para revisar (Ana Gómez dejó 2 ventas sin mandar por $68.000 y
faltó stock de 3 productos), 6 procesos vigentes y 1 en borrador, 4 avisos abiertos y Sistema con
los valores de arranque (sesión 1 min, celular 1 min, vínculo 30 días).

**Qué hay en Más.** Sigo el marco de la v2 (decisión 148): Cómo va el negocio, Usuarios y Quién
hizo qué están en la parte **Negocio**, así que Más reúne **Anomalías, Procesos, Mejoras y
errores, Configuración y Sistema** (nuevo, specs/020), y en el celular **Salir**. Cada opción
dice qué permiso pide: Anomalías «Ver las anomalías» (o «Administrar usuarios», decisión 101),
Procesos «Ver procesos» o «Dibujar procesos», Sistema «Administrar el sistema»; Mejoras y errores
y Configuración son para todos. Lo que el rol no deja no aparece (nada deshabilitado).

**Sistema lleva a su pantalla** (`data-ir="sistema"`, que arma otra sesión). Las audaces además
dejan cambiar un tramo sin ir, que es lo mismo que guarda Sistema (se guarda al tocar).

## Computadora

| | Idea en una frase | Ideas |
|---|---|---|
| **1 · Grilla** (evolución) | Lo que pide la especificación: Más es una grilla de tarjetas que se recorre con las flechas como se ve (← → ↑ ↓, Enter abre, ← desde la primera vuelve al menú). Cada tarjeta, con el mismo molde: ícono, nombre, una línea que explica, dos datos vivos (para revisar, vigentes, abiertas, los tres tiempos) y al pie el permiso que pide. La sexta tarjeta muestra qué ve cada rol en Más. | 1, 2, 3, 4, 5 |
| **2 · Lo pendiente** (reinvención) | Más no es un índice sino una bandeja: a la izquierda la lista corta de opciones (↑ ↓ y Enter), arriba cuatro números y a la derecha «Te espera», lo que pide atención en todas las opciones juntas, con su botón para resolverlo («Revisar», «Contar», «Marcar resuelto», «Seguir»). La acción principal es «Avisar de un error o una idea» (Alt A), que se abre encima. | 1, 2, 6, 7, 8 |
| **3 · Ir a…** (audaz) | Más deja de ser un lugar: Ctrl K abre, encima de lo que estés haciendo (acá Vender), una paleta que lista las opciones con su número y su Alt, y además deja **hacer** sin ir: avisar de un error con la captura de lo que tenías abierto, prender las animaciones, cambiar el tramo de la sesión. Se escribe para filtrar; la columna derecha muestra lo que hay en la opción marcada. | 2, 9, 10, 11, 12 |

**Qué rompe la audaz:** saca «Más» del menú de la izquierda y pone en su lugar el campo «Ir a…
Ctrl K» (con la pastilla ámbar de las anomalías); no cambia de pantalla, Esc vuelve a lo que
estabas. Propone Alt 6 a Alt 0 para las cinco opciones. La barra «Ir a…» la decisión 122 la dejó
para más adelante.

## Celular

| | Idea en una frase | Ideas |
|---|---|---|
| **1 · Lista** (evolución) | Como Ajustes de iPhone: arriba quién sos y tus roles («Ves todo»), y las opciones agrupadas («Del negocio», «Ajustes») con el molde de ux.md: ícono, nombre, una línea que explica, la cantidad si hay y la flecha. «Salir» en su bloque al final, en rojo suave. | 1, 3, 13 |
| **2 · Mosaico** (reinvención) | Lo urgente primero: una tarjeta ámbar grande con las anomalías para revisar (el número y quién), después baldosas de a dos con el número vivo de cada opción (6 vigentes, 4 abiertos, 1 min de sesión) y la llave de las animaciones a mano; abajo, una baldosa pino «Avisar de un error» que recuerda que se puede sacudir el celular. | 2, 6, 14, 15 |
| **3 · Hoja encima** (audaz) | Tocar «Más» no cambia de pantalla: sube una hoja sobre lo que hacías (Vender sigue atrás, oscurecido). Arriba buscar (con micrófono), una fila de cinco atajos redondos con su insignia, y debajo lo que se hace sin ir: avisar de un error **con la miniatura de la pantalla de atrás**, las animaciones y el tramo de la sesión. Salir, al lado del nombre. | 9, 10, 11, 16, 17 |

**Qué rompe la audaz:** Más deja de ser una pantalla del menú de abajo; se cierra tocando afuera,
bajando la hoja o tocando Más otra vez, y queda la pantalla de antes. «Volver a Más» (decisión
64) pierde sentido: volver cierra la hoja.

## Cuál me gusta más

**Computadora: la 1, con «Te espera» de la 2 como idea para después.** Es lo que la
especificación ya pide (la grilla que se recorre con las flechas), y suma lo que más vale: cada
tarjeta dice cuánto hay adentro y qué permiso pide, así Carlos ve de un vistazo si hay algo que
mirar sin entrar a cada una. La 3 es la más rápida para quien usa el teclado, pero cambia el
marco y la decisión 122 la dejó para más adelante.

**Celular: la 1.** Más se usa poco y se lee rápido como lista; es la que respeta al pie de la
letra el molde de ux.md («ícono, nombre, una línea que explica y la flecha», «Salir en su propio
bloque al final») y la que menos sorprende. De la 2 tomaría la insignia ámbar a la derecha de
Anomalías, que ya tiene; de la 3, «Avisar de un error» con la captura de lo de atrás, que es un
ahorro real (hoy hay que sacar la captura, ir a Más, entrar y adjuntarla).

## Cómo se mueve (una línea por interacción)

- **Entrar a una opción (celular):** la pantalla nueva entra desde la derecha (320 ms, `--curva`);
  volver la saca por la derecha (decisión 78). En la computadora, fundido corto.
- **Recorrer la grilla con las flechas (compu 1):** el borde pino salta a la tarjeta de al lado sin
  animarse (el foco se ve en el acto); la tarjeta bajo el mouse sube su sombra a `--sombra-2`.
- **Apretar una tarjeta o un renglón:** baja a 98 % y vuelve (120 ms).
- **Elegir un rol en «Qué ve cada rol» (compu 1):** las opciones que ese rol no ve se achican a 94 %
  y se apagan (200 ms); las que ve vuelven.
- **Marcar resuelto (compu 2):** el renglón se corre 16 px a la derecha mientras se desvanece
  (200 ms) y los de abajo suben; tostada pino abajo.
- **Avisar de un error:** el diálogo sube 4 % y se aclara (200 ms); en el celular, hoja desde abajo
  (320 ms) con el fondo al 30 %. Enviar: tostada con tilde y vibración 10-40-10 ms.
- **Ir a… (compu 3):** la paleta baja 8 px y se aclara (320 ms); al escribir, las filas que no
  coinciden desaparecen en el acto y la vista de la derecha hace un fundido de 90 ms.
- **Cambiar un tramo sin ir (audaces):** el segmento blanco corre al tramo nuevo, tostada «Guardado
  para todos · 1 min» y vibración doble en el celular.
- **Hoja de Más (celu 3):** sube desde el menú de abajo (320 ms, `--curva`); el menú no se mueve.
- **Llave de animaciones:** la bolita corre con rebote corto (200 ms) y vibra 10 ms.

Con «reducir movimiento» nada se mueve.

## Autocrítica (lo que corregí de la primera captura)

- **Compu 1:** las tarjetas cortaban el pie del permiso y la de Procesos desbordaba con dos
  pastillas largas: subí el alto de la fila (286 px, entran justas dos filas en los 600 útiles) y
  acorté las pastillas. El rol del usuario partía en dos renglones en el lateral: queda
  «Administrador», como en el marco.
- **Compu 3:** el texto de ayuda del buscador era largo y se cortaba, y el pie de teclas partía en
  dos renglones: lo acorté y pasé los ejemplos a chips «Probá escribir» en la columna derecha,
  que quedaba vacía.
- **Celu 3:** «Anomalías» se cortaba con guion y los tramos «1 min» partían en dos líneas: los
  tramos van en su propio renglón, a todo el ancho, sin cortar.
- **Lo más flojo que queda:** la sexta tarjeta de la compu 1 («Qué ve cada rol») es una herramienta
  de administración metida en un menú; si no se elige, la grilla queda con un hueco. En el celular
  1 sobra aire abajo: con un permiso menos la lista es todavía más corta.

## Lo que contradice algo escrito

- **ux.md (2026-10-11) y specs/013 ponen «Cómo va el negocio» y «Usuarios» dentro de Más**; el marco
  de la v2 (decisión 148) los pasó a la parte Negocio. Seguí la v2. Si Carlos los quiere también en
  Más, entran como un grupo más con el mismo molde.
- **specs/020 llama a Sistema «una pestaña nueva de Más, junto a Usuarios y Roles»**; Más no tiene
  pestañas (ux.md, decisión 72): acá es una opción más de la lista.
- **Compu 2 y compu 3 cambian el marco** (la acción naranja en Más, el campo «Ir a…»); celu 3 deja a
  Más sin pantalla, y con eso «Volver a Más» del celular (decisión 64) no tiene a dónde volver.
- **Las otras pantallas** todavía abren desde su menú un «Más» propio (menú chico u hoja) sin
  Sistema; si se elige una de estas, «Más» del marco tendría que llevar acá (`data-ir="mas"`).

## Catálogo de ideas

| # | Idea | Qué problema resuelve | Variantes | De dónde viene | Toques que ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Cada opción con su número vivo (para revisar, vigentes, abiertos, los tiempos) | Saber si hay algo que mirar sin entrar a cada una | compu 1, compu 2, celu 1, celu 2 | Ajustes de iPhone (las insignias), Shopify (la portada) | 1 por opción que no hacía falta abrir | Sí (solo Anomalías tenía la cantidad) |
| 2 | Lo urgente arriba: Anomalías en ámbar con su cantidad | Que lo que frena se vea primero | compu 1, compu 2, compu 3, celu 2 | Linear (bandeja), Square (alertas) | — | En parte (la pastilla ámbar ya está en el menú) |
| 3 | Al pie de cada opción, el permiso que pide | Que quien arma roles sepa qué abre cada permiso | compu 1 | Consolas de administración (Stripe, Google) | — | Sí |
| 4 | «Qué ve cada rol en Más»: elegir un rol y ver qué opciones le aparecen | Probar un rol sin pedirle a alguien que entre | compu 1 | «Ver como» de Facebook | Varios (entrar con otro usuario) | Sí |
| 5 | Mini barras de las anomalías anotadas por día | Ver si hoy hubo más que de costumbre | compu 1 | Stripe (sparklines) | — | Sí |
| 6 | «Te espera»: lo pendiente de todas las opciones en una sola lista, con su botón | No ir opción por opción buscando qué hay | compu 2, celu 2 | Linear (Inbox), GitHub (notificaciones) | 1–2 por pendiente | Sí |
| 7 | Resolver desde la bandeja («Marcar resuelto» un aviso) | Cerrar lo chico sin entrar | compu 2 | Linear, Gmail | 2 | Sí |
| 8 | «Avisar de un error o una idea» como acción principal de Más (Alt A), en un diálogo | Avisar sin buscar la pantalla | compu 2, celu 2 | Slack («Enviar comentarios») | 1–2 | Sí |
| 9 | Más como paleta / hoja encima de lo que hacías, sin cambiar de pantalla | No perder lo que se estaba haciendo para ir a algo de una vez | compu 3, celu 3 | Linear y Raycast (Ctrl K), hoja de compartir de iPhone | 1 (volver) | Sí |
| 10 | Avisar de un error con la captura de la pantalla de atrás, sola | Hoy hay que sacar la captura y adjuntarla | compu 3, celu 3 | Slack y Linear (reportar con captura) | 3–4 | Sí |
| 11 | Hacer sin ir: llaves y tramos (animaciones, sesión) dentro de Más | Cambiar un ajuste puntual sin abrir su pantalla | compu 3, celu 3 | Centro de control de iPhone | 2 | Sí |
| 12 | Buscar dentro de Más por palabra («sesión», «vínculo», «error») | Llegar a un ajuste sin saber en qué opción está | compu 3, celu 3 | Ajustes de iPhone (buscar), macOS Spotlight | 1–2 | Sí |
| 13 | Tarjeta «quién sos» arriba, con tus roles y cuántas opciones ves | Entender por qué alguien ve menos que otro | celu 1, celu 3 | Ajustes de iPhone (Apple ID arriba) | — | Sí |
| 14 | Baldosas de a dos con el número grande | Leer Más de un vistazo con el pulgar | celu 2 | Centro de control de iPhone, Wallet | — | Sí |
| 15 | Sacudir el celular para avisar de un error, desde cualquier pantalla | Avisar en el momento en que pasa | celu 2 | Apps de prueba (TestFlight), Google Maps | 3 | Sí |
| 16 | Fila de atajos redondos con insignia | Las cinco opciones bajo el pulgar en una línea | celu 3 | Hoja de compartir de iPhone | — | Sí |
| 17 | Buscar con la voz dentro de Más | Con guantes o con las manos ocupadas | celu 3 | Siri, Google | 1–2 | Sí |
