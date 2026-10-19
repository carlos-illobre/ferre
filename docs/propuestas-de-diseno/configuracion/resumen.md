# Más → Configuración: seis maquetas para Carlos

Capturas lado a lado: `comparacion-celu.png` y `comparacion-compu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/`, `../../config.css` y `../../iconos-extra.js`,
con 19 íconos Lucide que faltaban). En el celular, además de `captura.png` hay
`captura-entera.png` con la pantalla de punta a punta (se abre igual con `index.html?entera`).

Todas muestran el mismo caso: un Moto G54 recién instalado (no guarda nada, baja el catálogo
al abrir, animaciones prendidas, versión nueva cada 15 min), en espejo con la «Compu del
mostrador» hasta el 16/11 y con dos celulares con huella. Los textos que la especificación
fija como regla están tal cual en la 1 de cada dispositivo.

**Lo que no cambia en ninguna:** la computadora no muestra «Trabajar sin conexión» ni «Cómo
buscar productos» (E13): a lo sumo explica que ella siempre guarda (compu 1) o los muestra
como ajustes **del celular** (compu 2, fuera de la especificación).

## Celular

| | Idea en una frase | Ideas |
|---|---|---|
| **1 · Ajustes** (evolución) | Lo que pide la especificación, ordenado como Ajustes de iPhone: arriba cuánto guarda este celular contra el tope de 150 KB, después «Este celular» (animaciones, sin conexión), las dos formas de buscar con su ventaja y su desventaja, la versión nueva, mis celulares con huella y el vínculo. | 1, 2, 3, 4, 5, 6, 7 |
| **2 · Una sola perilla** (reinvención) | «Trabajar sin conexión» y «Cómo buscar» son la misma pregunta: ¿cuánto guarda este celular? Tres escalones (nada, el catálogo al abrir, todo), cada uno con lo que ocupa y tres señales: cuánto tarda en abrir, cómo busca y si anota sin internet. Lo demás se resume en renglones. | 1, 8, 9, 10, 11, 12 |
| **3 · Te conviene** (audaz) | La pantalla mide en vez de preguntar: cómo anda internet en el local, cuánto lugar libre hay y cuántas veces se cortó esta semana; con eso recomienda una opción con un botón, y deja probar cómo anda sin internet. | 13, 14, 15, 16, 17, 18 |

**Qué rompe la audaz:** se abre a pantalla completa, sin el menú de abajo, desde la línea
de conexión («En línea · todo enviado») además de desde Más. Usa el naranja para «Usar esto»
aunque no sea una acción del negocio. Lo personal (animaciones, versión, huellas) pasa a ser
una fila de chips al pie, que se desliza de costado.

## Computadora

| | Idea en una frase | Ideas |
|---|---|---|
| **1 · Dos columnas** (evolución) | A la izquierda, «Esta computadora» (animaciones con su vista previa en vivo, versión nueva con sus cuatro botones y el texto largo) y una nota de que la compu siempre guarda; a la derecha, «Tu cuenta» (celulares con huella y vínculo con Desconectar y Desvincular). Cada llave con su Alt. | 1, 4, 5, 6, 7, 19, 20, 21 |
| **2 · Por dispositivo** (reinvención) | Como «Dispositivos» en las cuentas de Apple: a la izquierda tus dispositivos (esta compu, Moto G54, Samsung A15); a la derecha, todo lo de ese aparato, incluido configurar el celular desde la compu a través del espejo. | 2, 3, 8, 22, 23, 24 |
| **3 · Al vuelo** (audaz) | Configuración no es una pantalla: con Ctrl , se abre una paleta encima de lo que estás haciendo (acá, Vender), se recorre con flechas, se cambia con ← → o Espacio y la vista previa muestra el efecto en vivo; Esc y seguís vendiendo. | 6, 19, 25, 26, 27 |

**Qué rompe la audaz:** saca Configuración de la lista de Más como lugar (sigue ahí como
entrada, pero abre la paleta) y no cambia de pantalla: el marco queda atrás, atenuado.

## Cuál me gusta más

**Celular: la 2, con el resumen «Guardado en este celular» de la 1.** La pregunta que la
persona se hace no es «¿habilito el guardado?» y después «¿cómo busco?», sino «¿cuánto quiero
que ocupe y qué pasa si se corta?». La perilla responde eso de un vistazo (tres filas, tres
señales de color) y cambia dos decisiones por una: un toque en vez de dos, y nunca aparece ni
desaparece un bloque según otra llave (E15–E16 quedan resueltos por construcción). La
recomendación de la 3 podría sumarse después como una pastilla «Te conviene» sobre el
escalón que corresponde.

**Computadora: la 1.** En la compu hay poco para decidir (dos llaves y lo de tu cuenta); la
1 lo muestra entero, sin navegar, con la vista previa de la animación que explica la opción
sin texto. La 2 es la más potente pero depende de configurar el celular a distancia, que hoy
no está en la especificación; la guardaría como idea (23) para cuando haya más opciones por
dispositivo.

## Cómo se mueve (una línea por interacción)

- **Apagar «Animaciones»:** la llave corre al costado con rebote corto (200 ms) y es lo último
  que se mueve: la vista previa se congela en su estado final y desde ahí nada anima.
- **Prender «Trabajar sin conexión» (celu 1) o el escalón «Todo» (celu 2):** la llave pasa a
  pino, la barra de «Guardado» se llena de 38 KB a 12 MB mientras baja, con el número rodando;
  al terminar, tilde y vibración doble. «Cómo buscar» se colapsa hacia arriba (200 ms).
- **Apagarlo con cosas sin enviar:** sube una hoja (320 ms) con el texto de regla y «3 ventas
  sin enviar se pierden» en rojo; confirmar vacía la barra hacia la izquierda.
- **Elegir una forma de buscar o un escalón:** el borde pino salta al elegido y su fondo se
  funde (200 ms); en la perilla, las rayitas del indicador se encienden de abajo hacia arriba.
- **Elegir 5 min · 15 min · 1 hora · 24 horas:** el segmento blanco se desliza al nuevo lugar
  (200 ms). Apagar la llave pliega los cuatro botones hacia arriba y aparece el texto de
  «No busca».
- **Quitar un celular con huella o Desvincular:** pregunta en una hoja; al confirmar, el
  renglón se colapsa y una tostada pino ofrece «Deshacer» 4 s. En el celular vibra 10 ms.
- **Usar esto (celu 3):** el botón se llena de izquierda a derecha mientras baja el catálogo;
  la tarjeta «Hoy» cambia a «Hoy: guarda todo · 12 MB» con fundido.
- **Probá cómo anda sin internet (celu 3):** la línea de conexión pasa a ámbar «Modo prueba ·
  sin internet» y la app se usa normal 1 minuto; al salir, vuelve con fundido.
- **Paleta (compu 3):** aparece desde 8 px arriba con fundido (200 ms) y el fondo se atenúa;
  ↑ ↓ mueve la banda pino; Esc la cierra hacia arriba y el foco vuelve a donde estaba.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: arriba había cuatro tarjetas de resumen que repetían lo que dicen las llaves de
  abajo; las saqué: en esta pantalla el resumen no agrega y le quitaba calma.
- Compu 2: el pie con «Lo que cambies acá llega al celular al instante» ocupaba tres renglones
  y había dos botones rojos; texto corto y «Quitar huella» como fantasma.
- Compu 3: el renglón del espejo y el pie de teclas se partían; ensanché la paleta y acorté.
- Celu 2: la leyenda de las señales (Abrir · Buscar · Sin internet) quedaba abajo, después de
  leer; la subí como encabezado de columnas. La vista previa de la animación se capturaba
  vacía (mitad del movimiento); ahora arranca adelantada. El indicador de nivel parecía un
  ícono de menú: le puse marco de batería.
- Celu 3: «Cortes, 7 días» se partía y había un hueco sobre «Lo demás»; ahora está la tarjeta
  «Hoy: no guarda nada · Cambiar», que además dice el estado actual (faltaba).
- Lo más flojo que queda: la celu 3 inventa medidas (calidad de internet, cortes, ventas que
  no se pudieron anotar) que la aplicación hoy no registra; y en la celu 2 los «4 s» y
  «4,2 MB» son estimados: habría que medirlos de verdad para mostrarlos. La compu 2 tiene la
  columna izquierda con aire de sobra abajo.

## Catálogo de ideas

«Toques» = lo que ahorra en la tarea más frecuente: pasar el celular a trabajar sin conexión
o cambiar la forma de buscar (hoy, en la especificación: Más → Configuración → llave, y si se
quiere cambiar la búsqueda, otro toque; 3 a 4 toques).

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | «Guardado en este celular: 38 KB de 150 KB» con barra, arriba de todo | Ver que el celular no se llena; que «no guarda nada» se note | celu 1, celu 2 (en escalones), compu 2 | Almacenamiento de iPhone | — | **Sí** (dato nuevo a la vista) |
| 2 | Las dos formas de buscar como tarjetas con ⊕ ventaja y ⊖ desventaja | Elegir sin leer párrafos | celu 1, compu 2 | Planes de Stripe, Fotos de iPhone (optimizar almacenamiento) | 0 | No |
| 3 | Llave a la derecha y una línea que dice qué cambia, en el mismo molde para todas | Leer de un vistazo, todas iguales | todas | Ajustes de iPhone | 0 | No |
| 4 | Grupos «Este celular / Esta computadora» y «Tu cuenta» | Separar lo del aparato de lo de la persona (decisión 99) | celu 1, compu 1, celu 2 («Lo tuyo») | Ajustes de iPhone, Slack | — | No |
| 5 | Versión nueva con su llave y los cuatro botones debajo, sin abrir nada | Elegir en un toque | celu 1, compu 1 | Ajustes de iPhone (bloqueo automático) | 1 | No |
| 6 | Vínculo dibujado: celular - - - «En espejo» - - - computadora, con Desconectar y Desvincular | Entender con qué está unido sin leer | celu 1, compu 1, compu 3 | Continuidad de Apple, AirDrop | — | No |
| 7 | Celulares con huella como renglones, el propio marcado «Este», con Quitar | Saber cuál es cuál antes de quitar uno | celu 1, compu 1 | Cuentas de Google (dispositivos) | — | No |
| 8 | Una sola perilla «¿Cuánto guarda este celular?»: nada, el catálogo al abrir, todo | Dos decisiones atadas pasan a ser una | celu 2 (y compu 2 si se adopta) | Calidad de copia de Google Fotos, modo ahorro de batería | 1 (y no aparecen ni desaparecen bloques) | **Sí** (junta RF-84 y RF-85 en un control) |
| 9 | Tres señales por escalón: Abrir · Buscar · Sin internet, en verde, ámbar o gris | Comparar las consecuencias sin leer | celu 2 | Comparadores de planes de telefonía | — | **Sí** |
| 10 | Lo que ocupa cada escalón (38 KB, 12 MB) a la derecha | Decidir pensando en el lugar del teléfono | celu 2 | Descargas de Spotify | — | **Sí** |
| 11 | Vista previa en vivo de la animación al lado de la llave | Entender qué apaga sin probarlo | celu 2, compu 1, compu 3 | Accesibilidad de macOS (reducir movimiento) | 2 (no hace falta ir y volver para ver) | **Sí** |
| 12 | Lo menos usado (versión, huellas, vínculo) resumido en renglones con su valor y › | Que la pantalla quepa entera y lo frecuente quede arriba | celu 2 | Ajustes de iPhone (General ›) | — | No |
| 13 | Medidas del celular: calidad de internet acá, lugar libre, cortes de la semana | Decidir con datos, no a ciegas | celu 3 | Uso de datos de Android, Speedtest | — | **Sí** |
| 14 | Gráfico «Sin internet esta semana» con los cortes en ámbar | Ver si en el local se corta y cuánto | celu 3 | Tiempo de uso de iPhone | — | **Sí** |
| 15 | «Te conviene…» con el porqué y «Usar esto» | La persona no técnica no sabe qué elegir | celu 3 | Sugerencias de almacenamiento de iPhone | 2 (un toque desde la recomendación) | **Sí** |
| 16 | «Hoy: no guarda nada · Cambiar», el estado actual en una línea | Saber cómo está sin interpretar llaves | celu 3 | Wallet (tarjeta por defecto) | — | No |
| 17 | «Probá cómo anda sin internet»: un minuto simulando el corte | Perderle el miedo a la opción antes de elegirla | celu 3 | Modo avión, vistas previas de iOS | — | **Sí** |
| 18 | Abrir Configuración tocando la línea de conexión | Llegar a la opción donde aparece el problema | celu 3 | Centro de control de iPhone | 2 (sin pasar por Más) | **Sí** (marco) |
| 19 | Atajo Alt + letra al lado de cada llave (A animaciones, B versión, O desconectar, U desvincular) | Todo con el teclado (decisión 80) | compu 1, compu 3 | Linear | 1 | No |
| 20 | Nota «Esta computadora siempre guarda» donde en el celular iría la llave | Que no se busque una opción que no existe en la compu (E13) | compu 1 | — | — | No |
| 21 | «Para sumar un celular, entrá con Google desde él» en lugar de un botón que no anda en la compu | Explicar por qué la compu no vincula huella | compu 1, compu 2 | Cuentas de Apple | — | No |
| 22 | Lista de mis dispositivos a la izquierda y el detalle de uno a la derecha | Ver todo lo propio por aparato, en un lugar | compu 2 | Dispositivos de la cuenta de Apple y Google | — | **Sí** |
| 23 | Configurar el celular desde la compu, a través del espejo | Ayudar a un empleado sin agarrarle el teléfono | compu 2 | Familia de Apple, MDM | 3 (no hace falta el celular en la mano) | **Sí** (las preferencias hoy son solo del dispositivo) |
| 24 | Encabezado del dispositivo con sus pastillas (En espejo, Huella) y lo que guarda | Estado del aparato de un vistazo | compu 2 | Buscar mi iPhone | — | No |
| 25 | Configuración como paleta con Ctrl , encima de la pantalla en curso | Cambiar algo sin perder lo que se estaba haciendo | compu 3 | Raycast, VS Code (Ctrl ,) | 2 (ir y volver de Más) | **Sí** (marco) |
| 26 | Filtrar escribiendo («anim») y cambiar con ← → o Espacio | Ir directo a la opción, sin mouse | compu 3 | Linear, macOS Spotlight | 1–2 | **Sí** |
| 27 | Aviso «Vale ya, sin recargar, y solo en esta computadora» | Que quede claro que no cambia a los demás (decisión 79) | compu 3 | — | — | No |

Toques para pasar el celular a «trabajar sin conexión»: hoy (spec) 3 (Más, Configuración,
llave); celu 1 igual; celu 2 igual pero cambiar también la búsqueda es el mismo toque;
celu 3 **1** desde la línea de conexión con la recomendación. En la compu, cambiar la
frecuencia de versión: compu 1, Alt B o un clic; compu 3, Ctrl , ↓ → Esc sin salir de Vender.
