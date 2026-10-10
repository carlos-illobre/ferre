# Requerimientos de interfaz generales

Lo que vale para todas las pantallas, sea cual sea la capacidad, y todo lo que Carlos pidió
sobre la interfaz a lo largo del proyecto. Es la entrada para quien diseñe o rediseñe las
pantallas: con este documento, el `ux.md` de cada capacidad (`002` a `007`) y la
constitución alcanza, sin mirar el código.

No fija un diseño. Dice qué tiene que poder hacer quien usa el sistema, con qué reglas, y
qué le gustó y qué no le gustó al dueño de cada versión que vio.

## En qué está la interfaz

Carlos va a rehacer toda la interfaz, celular y computadora, y es la prioridad (decisión 13
del 2026-10-10).

**Nada de cómo está hecha hoy ata al diseño** (decisión 19): que sean dos interfaces
separadas que se eligen a los 900 px de ancho, las cuatro pestañas del celular, las
tarjetas, las hojas que suben desde abajo, las tablas y el menú de la computadora, la
paleta, la tipografía y la marca son cómo está hecho hoy. Sirven de antecedente: están
descriptos en `docs/sistema-visual.md` y en la maqueta del celular,
`mockups/Ferre iOS.html`.

Lo que sí es regla, se diseñe como se diseñe:

- La constitución, principios II (la vara es el cuaderno y la calculadora), III (todo se
  usa completo en el celular y en la computadora), IV (sin internet no se nota), V (todo
  número se explica) y IX (en castellano y con las palabras del mostrador).
- Los requerimientos de uso RNF-01 a RNF-09 y RNF-54 de [spec.md](spec.md).
- Los requerimientos de interfaz de cada capacidad: qué tiene que poder hacer quien usa el
  sistema, qué necesita ver, en qué orden y qué pasa en cada estado.
- Lo que sigue en este documento.

**Roles.** En esta primera versión todos los usuarios son Administrador y pueden hacer
todo (decisión 18). El diseño no tiene que ocultar ni restringir nada por rol. Donde un
recorrido nombra al Vendedor o al Comprador, dice quién hace ese trabajo en el local: sirve
para saber en qué situación se usa esa pantalla (en el mostrador, recibiendo mercadería).

## Dónde se usa

- **En el mostrador, de pie y con un cliente esperando.** Quien vende usa la notebook para
  buscar y cobrar y el celular para escanear. Una venta de 3 productos lleva menos de 20
  segundos (RNF-02).
- **Caminando el local,** con el celular en una mano y la mercadería en la otra: contar un
  sector, recibir mercadería, remarcar.
- **A distancia,** desde el celular de quien administra: ver cómo va el negocio.
- **El equipo:** una notebook vieja con Chrome o Firefox y un celular Android, sin instalar
  nada. El único lector de códigos es la cámara del celular (RNF-40, RNF-41). El celular
  puede tener la app en su pantalla de inicio.
- **Internet intermitente:** todo lo del mostrador se usa igual sin conexión (RNF-10).

## Reglas generales

Cada una dice de dónde sale. Las que tienen ID están además en [spec.md](spec.md).

**Aprender y operar**

- Se aprende sin manual: cada pantalla se explica sola y su estado vacío dice qué hacer
  (RNF-01).
- El orden de la pantalla es el del mostrador: buscar, precio, cantidad, cobro. Nada es
  obligatorio que el cuaderno no tenga (constitución, principio II).
- En la computadora todo se opera con teclado; el mouse nunca es la única forma (RNF-05).
- En el celular todo se alcanza con una mano y ninguna pantalla se desplaza hacia el
  costado: cada elemento de una lista entra entero en el ancho de la pantalla (RNF-04).
- El celular se parece lo más posible a una app nativa de Android (RNF-04).
- La computadora usa todo el ancho de la pantalla, sin espacio desaprovechado a los
  costados, y aprovecha el ancho para mostrar más datos por fila (RNF-05).
- Sin ventanas de confirmación, salvo para lo que no se puede recuperar (constitución,
  principio II).

**Lo que se toca**

- Todo lo que hace algo al tocarlo tiene forma de botón. Un botón no puede parecer una caja
  de texto ni un texto suelto (RNF-09).
- Los paneles plegables arrancan abiertos, y se pliegan y se despliegan con animación, para
  que se note que se pueden abrir y cerrar (RNF-09).
- Lo que se abre sobre lo que se está haciendo (el detalle de un stock, una foto ampliada)
  se abre con una transición, no de golpe.

**Números**

- Todo número calculado se puede tocar y dice de dónde sale, con los números de origen
  (RF-13).
- Se tiene que notar a simple vista qué números tienen explicación. La señal es un signo
  de pregunta dentro de un círculo. El ícono de información («i» en un círculo) no se
  entiende y no se usa.
- Los importes son lo que más se lee: van más grandes que el resto.
- Las cantidades no muestran ceros a la izquierda al escribir. Lo que se vende por unidad
  lleva cantidades enteras; lo que se vende por kilo, metro o litro, hasta un decimal
  (RF-12). La unidad se elige al lado de la cantidad.

**Avisos y espera**

- Los errores van en el lugar, en castellano, y dicen qué hacer. Un aviso desaparece solo
  cuando se corrige su causa: nunca queda en pantalla un aviso de algo ya resuelto (RNF-09).
- Lo que tarda muestra su avance, con lo que está haciendo (RNF-09).
- Buscar muestra los resultados mientras se escribe, sin apretar nada para buscar, y trae
  más resultados al llegar al final de los que están a la vista (RF-07).
- Lo elegido se tiene que poder leer: una fila o una tarjeta seleccionada mantiene todo su
  texto con buen contraste.

**Palabras**

- Todo en castellano, con las palabras del mostrador (RNF-06). Se dice «cuenta corriente»,
  nunca «fiado»; se abrevia «cc.» solo donde el espacio no alcanza. Se dice «estantería»,
  nunca «góndola». Los nombres se tienen que entender solos, sin explicación.
- En pantallas y textos se nombra el rol (Administrador, Vendedor, Comprador), no la
  persona (constitución, principio IX).

**Ambientes**

- El ambiente de pruebas se distingue de producción a simple vista: la barra principal
  titila entre dos colores y dice «Ambiente de prueba». Producción no muestra nada de eso
  (RNF-54).

## Lo que pidió Carlos, por fecha

Pedidos textuales sobre las pantallas, en el orden en que llegaron. Los que son regla
figuran arriba o en la capacidad que se indica; los demás son antecedentes de una versión
que ya no está, y sirven para saber qué esperaba.

### 2026-09-13

- Interfaz limpia y sencilla, que permita buscar fácilmente, con una curva de aprendizaje
  de casi cero. No tiene que retrasar el procedimiento habitual de quien atiende; a lo sumo
  mejorarlo en tiempo, en pasos o automatizando (RNF-01, RNF-02).
- Junto al costo, un selector con 300, 200, 100, 50 y 25 %; al elegir uno, aparece al lado
  del costo el precio con ese margen (RF-10).
- Tiene que ser fácil saber de dónde viene cada número calculado (RF-13).
- «Cuenta corriente» en lugar de «fiado»; «cc.» solo donde sea muy largo. Todo
  autodocumentado y fácil de entender (RNF-06).
- Usar la cámara del celular para escanear el código de barras. Quien atiende mira los
  precios en la notebook y escanea con el celular: los dos se tienen que comunicar de una
  forma fácil de usar, sin instalar nada en el celular (RF-08).
- Sin contraseñas: son inseguras y se olvidan (RF-70).

### 2026-09-14

Prueba manual de punta a punta, pantalla por pantalla.

- **Entrar.** Lo que se le explica a quien todavía no entró tiene que entenderse sin
  conocer el sistema.
- **Sesiones.** Todas las acciones de cerrar una sesión dicen «Cerrar» y son botones, no
  enlaces. La de la sesión propia se distingue de las demás por el color. Cerrar la propia
  vuelve a la pantalla de entrada y la sesión deja de figurar (RF-74).
- **Listas de precios.** Aplicar una lista tarda: muestra una barra de progreso. Los
  proveedores van a la vista, no plegados, y antes que el lugar donde se entrega el archivo
  (RF-01).
- **Productos.** El autocompletado gustó; se le pidió una pausa mínima al escribir antes
  de buscar, y cargar más resultados al llegar al final. Los botones de margen parecían
  cajas de texto: tienen que verse como botones. El ícono de información no se entendía:
  signo de pregunta en un círculo. Un lugar para una foto chica que, al tocarla, se amplía
  con una transición y muestra la descripción (RF-07, RF-09, RF-10, RF-13).
- **Productos, teclado.** Las flechas y los atajos de margen (las teclas 1 a 5 con
  mayúsculas) funcionan aunque el cursor no esté en la búsqueda (RF-10).
- **Productos, margen.** Al elegir un margen, el precio se redondea para arriba a
  múltiplos de $1.000. Lo que se pone «a mano» es un porcentaje. El margen elegido sigue
  elegido al recargar la pantalla (RF-10, RF-19, RNF-20).
- **Productos, lista de origen.** Donde dice de qué lista salió el costo, se baja el Excel
  original (RF-01b).
- **Productos con varios proveedores.** Al seleccionarlo, todo el texto se tiene que seguir
  leyendo.
- **Vender, cantidad.** Sin cero a la izquierda al escribir. Un selector al lado de la
  cantidad: por unidad no admite decimales; por kilo, metro o litro admite uno (RF-12).
- **Vender, margen y precio.** Los cinco márgenes a la vista, y debajo del precio el lugar
  para poner el precio a mano, que en la venta es un importe y no un porcentaje (RF-20b).
- **Vender, foto.** Un lugar para la foto del producto en cada renglón (RF-09).
- **Vender, medios de pago.** Tienen que parecer botones (RNF-09).
- **Ventas del día.** Si una venta tiene más de un producto, cada uno va en su renglón, y
  los renglones de una misma venta se pliegan juntos (RF-23).
- **Vender, aviso.** «Cuenta corriente: elegí el cliente» no desaparecía nunca: tiene que
  irse al elegir el cliente (RNF-09).
- **Compras.** La factura se tiene que poder cargar con una foto, que precargue todo
  (RF-51). Las cantidades, sin cero a la izquierda y con la misma regla de decimales. Las
  compras recientes se despliegan para ver sus renglones (RF-50).
- **Stock.** El detalle de un producto se abre con animación. Toda acción de guardar tiene
  forma de botón (RNF-09).
- **Contar.** «Estantería» en lugar de «góndola». Para salir de un conteo, «Volver», sin la
  aclaración de que queda abierto (RF-52).
- **Duplicados.** Una unión se tiene que poder deshacer desde la misma pantalla. Los
  paneles, desplegados y con animación (RF-06, RNF-09).
- **Quién hizo qué.** Es muy largo: se pagina (RF-71).
- **Menú.** Se tiene que notar dónde termina una opción y empieza la otra.
- **Celular.** Que se use cómodamente desde el celular, lo más parecido posible a una app
  de Android, y que se pueda instalar. No queda bien desplazarse hacia el costado: cada
  elemento de una lista tiene que verse entero en la pantalla (RNF-04, RNF-40).
- **Foto ampliada.** Desde ahí, un botón para sacar la foto con el celular y reemplazarla
  (RF-09).
- **Ambiente de pruebas.** La barra titila entre dos colores y aparece la leyenda
  «Ambiente de prueba», solo en pruebas (RNF-54).
- **Huella.** Entrar con la huella del celular, vinculado una vez desde la app (RF-70b).

### 2026-09-15

- **Huella, la primera vez.** Si es la primera vez que alguien entra con Google desde el
  celular, la app le ofrece entrar con la huella, como hacen las apps de los bancos. En la
  computadora esa oferta no aparece (RF-70b).
- **Computadora.** Quedaba mucho espacio desaprovechado, sobre todo a los costados: tiene
  que aprovechar toda la pantalla y las filas de las tablas pueden mostrar más (RNF-05).
- **Quién hizo qué.** Páginas de 10 (RF-71).

### 2026-10-09

- **Computadora.** Las grillas y las búsquedas tienen que ser tan fáciles de usar como en
  la primera versión de escritorio (RNF-05).
- **Entrar leyendo un QR.** No tiene utilidad: se quita (RF-70).
- **Paleta y marca,** las mismas en el celular y en la computadora.

### 2026-10-10

- **Toda la interfaz se rehace** (decisión 13) y es la prioridad. Nada de cómo está hecha
  hoy ata al diseño (decisión 19).
- **Roles.** Por ahora todos los usuarios son Administrador y el Administrador puede todo
  (decisión 18).
- **Precio a mano.** Se respeta tal cual; si no es múltiplo de $1.000 aparece un mensaje
  de alerta que lo dice (RF-19, RF-20b).

## Qué dijo Carlos de cada versión

Para no repetir lo que no funcionó.

| Versión | Qué era | Qué dijo |
|---|---|---|
| Primera, del 2026-09-13 y 14 | Una sola interfaz: barra arriba con el menú completo, tablas, el margen y el precio editables en la fila, atajos de teclado. Colores a partir de las maquetas de `mockups/` (imágenes) | Los estilos le gustaron. En la computadora, «perfecta a nivel de usabilidad». En el celular, inusable: había que desplazarse hacia el costado |
| Rediseño del 2026-09-14 | Una sola interfaz hecha a partir de una maqueta de celular: cuatro pestañas, tarjetas, hojas que suben desde abajo, un solo color de acción | En el celular, «perfecto». En la computadora perdió usabilidad: mucho espacio desaprovechado, y grillas y búsquedas más difíciles de usar |
| Ensanche del 2026-09-15 | La misma del rediseño, estirada a todo el ancho en la computadora, con columnas y filas de una línea | No conformó |
| Dos interfaces, del 2026-10-09 | El celular del rediseño y, en la computadora, la primera versión con la paleta y la marca del rediseño | No la validó. El 2026-10-10 decidió rehacer toda la interfaz |

Lo que se repite en lo que funcionó: en la computadora, tablas densas que muestran muchos
productos a la vez, edición en la misma fila y todo con el teclado; en el celular, una cosa
por vez, entera en el ancho de la pantalla y al alcance del pulgar.

## Estados que toda pantalla resuelve

| Estado | Qué tiene que pasar |
|---|---|
| Vacío | Dice qué es ese lugar y cuál es el primer paso. Nunca un espacio en blanco |
| Cargando | Lo que tarda muestra su avance; lo que ya está en el dispositivo se usa sin esperar |
| Error | En el lugar, en castellano, con qué hacer; lo cargado no se pierde |
| Sin conexión | Lo del mostrador funciona igual; un indicador siempre a la vista dice que no hay conexión y cuántos cambios están por enviar. Lo que necesita conexión lo dice antes de intentarlo |
| Éxito | Se ve sin leer letra chica y deja listo el paso siguiente |

## Lo que no está decidido

Está en [preguntas-abiertas.md](../preguntas-abiertas.md). Lo que más pesa para un rediseño:

- La letra mínima y cuánto es «alto contraste» (RNF-04, RNF-05).
- La notebook y el celular del local, para saber en qué pantalla tiene que entrar todo
  (RNF-40).
- A partir de cuánto tiempo una operación muestra su avance (RNF-09).
