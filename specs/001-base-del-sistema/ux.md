# Requerimientos de interfaz generales

Lo que vale para todas las pantallas, sea cual sea la capacidad, y todo lo que Carlos pidió
sobre la interfaz a lo largo del proyecto. Es la entrada para quien diseñe o rediseñe las
pantallas: con este documento, el `ux.md` de cada capacidad (`002` a `007`) y la
constitución alcanza, sin mirar el código.

No fija un diseño. Dice qué tiene que poder hacer quien usa el sistema, con qué reglas, y
qué le gustó y qué no le gustó al dueño de cada versión que vio.

## En qué está la interfaz

**La interfaz es una sola y es la definitiva** (decisiones 28 y 83). En el celular, una cosa por
vez con tarjetas y hojas; en la computadora, menú a la izquierda, tablas y teclado; y un menú
«Más» para lo que se usa poco. Las versiones anteriores y sus mockups se borraron el 2026-10-13.

Lo que quedó decidido de la interfaz elegida está más abajo, en «2026-10-11», y es regla
para cualquier cambio. Lo que esa lista no dice sigue abierto al diseño.

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

**Cómo se ve**

- El lenguaje visual oficial es «Mostrador» (`docs/lenguaje-mostrador/`): paleta, letra, íconos,
  piezas, movimiento y marco. Toda pantalla nueva o rediseñada lo toma por defecto; solo se cambia
  si el director de arte propone algo superador y Carlos lo elige (decisión 115).
- Siempre que se muestra una cantidad, va con su unidad, abreviada igual en todas partes: «3 un.»,
  «1,5 kg», «2 m», «0,5 L»; en el celular y en la computadora, en todas las pantallas (decisiones
  106 y 144). Un renglón dice «3 un. Mecha 8 mm» y, con el precio, «3 un. × $4.000».
- Cuenta corriente va en rojo, con su fondo suave, en todas partes (decisión 144).

- El marco es el de la v2 (decisiones 148 y 149): el menú Vender · Catálogo · Depósito · Negocio ·
  Más, en el celular y en la computadora. Depósito tiene Stock · Compras · Contar (el Ingreso y los
  Pedidos se abren desde Compras); Negocio, Resumen · Usuarios · Quién hizo qué (Roles es un botón
  en Usuarios); Más, Anomalías, Procesos, Mejoras y errores, Configuración y Sistema. En la
  computadora, el nombre de la parte va grande arriba de las pestañas, con las acciones de la
  pantalla a su derecha.

**Aprender y operar**

- Se aprende sin manual: cada pantalla se explica sola y su estado vacío dice qué hacer
  (RNF-01).
- El orden de la pantalla es el del mostrador: buscar, precio, cantidad, cobro. Nada es
  obligatorio que el cuaderno no tenga (constitución, principio II).
- **El menú de la computadora** (decisión 122): el del lenguaje «Mostrador», claro, con el
  logotipo de Ferrebress; la parte abierta va en pino suave con una raya naranja. Un botón arriba
  (y Ctrl+B) lo achica a solo íconos, con el isotipo, y lo vuelve a agrandar; recuerda cómo quedó.
  Achicado, cada ícono dice su nombre al pasar el mouse y todo sigue con el teclado.
  Se ve como la v2 de la maqueta (decisión 126): sin los Alt+número a la vista (salen al apretar
  Alt), sin texto de ayuda, el celular en espejo en un recuadro verde, la conexión en una pastilla
  y abajo el usuario con sus iniciales, su nombre y su rol: al tocarlo (o Enter) abre un menú con
  el nombre y el rol arriba y «Cerrar sesión»; Esc lo cierra. Las pestañas de cada parte
  son texto subrayado, con su Alt+número chico al lado. El botón que achica el menú usa el ícono de
  la maqueta (el panel con la flecha); las teclas a la vista, la letra de siempre con fondo blanco y
  borde suave.
- En la computadora todo se opera con teclado; el mouse nunca es la única forma (RNF-05). Un rediseño
  nunca saca lo especificado del teclado: un gesto nuevo (arrastrar, deslizar) se suma, no lo
  reemplaza (decisión 121).
- Las flechas nunca sacan el cursor de la caja de texto (decisiones 130 y 133): ↑ desde la primera
  fila saca la marca de la lista y, con el cursor en la búsqueda, el cursor se queda ahí; ← y →
  dentro de un campo mueven el cursor del campo, salvo ← con la caja vacía o el cursor al principio,
  que lleva la marca del teclado al menú sin sacar el cursor (decisión 137): ahí ↑ ↓ lo recorren,
  Enter o → abre la parte y la marca pasa a sus pestañas (← → las recorren, Enter abre la pestaña y
  el cursor va a la caja de la pantalla nueva), y ↓ o Esc la devuelven a la pantalla.
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
  nunca «fiado»; se abrevia «cc.» solo donde el espacio no alcanza. El mueble donde va la
  mercadería se llama «estantería», y no de otra forma. Los nombres se tienen que entender solos, sin explicación.
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
  compras recientes se despliegan para ver sus renglones (RF-50); desde el 2026-10-13 están en
  «Cómo va el negocio» y no en el ingreso (decisión 67).
- **Stock.** El detalle de un producto se abre con animación. Toda acción de guardar tiene
  forma de botón (RNF-09).
- **Contar.** El mueble donde va la mercadería se llama «estantería». Para salir de un conteo, «Volver», sin la
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
- **Precio a mano.** Se respeta tal cual, sin aviso aunque no sea múltiplo de $1.000 (RF-19,
  RF-20b; decisión 132).

### 2026-10-11

Lo que Carlos pidió al elegir la interfaz y al usarla. Cada punto tiene su decisión en
`docs/decisiones-de-negocio.md`.

**En las dos pantallas**

- **Un solo menú, en el mismo orden:** Catálogo (Productos, Listas, Duplicados), Vender,
  Depósito (Ingreso, Inventario, Estanterías) y Más (Cómo va el negocio, Usuarios, Anomalías,
  Procesos, Mejoras y errores, Configuración; Usuarios con sus pestañas Usuarios, Sesiones,
  Roles y Quién hizo qué, decisión 88). La aplicación abre en lo primero del menú
  (decisiones 28, 39 y 44).
- **Las palabras:** «estantería» y no «góndola»; «Inventario» y no «Stock» para la pantalla;
  «Estanterías» y no «Contar» para la pestaña; «dinero» y no «plata»; el litro se escribe
  «L» (decisiones 28, 31 y 39).
- **El ambiente de prueba no se puede confundir con producción:** un marco de un color que
  no se usa en ningún otro lado, que aparece y desaparece, y un cartel fijo. Producción no
  lleva nada (decisión 33). Ese marco y ese cartel quedan como están con cualquier rediseño: no
  siguen el lenguaje «Mostrador» ni cambian con la versión elegida de cada pantalla (decisión 116).
- **Lo que está elegido se sigue leyendo** al pasarle el mouse o al tocarlo.
- **Quitar algo es un botón con un tacho,** nunca una «×» suelta. La «×» queda solo para
  borrar lo escrito en una búsqueda.
- **Lo que se toca tiene que parecer un botón:** borde o color; un texto de color solo no
  alcanza.
- **Las pestañas de adentro de una pantalla llevan ícono.**
- **En la computadora, la acción de la pantalla va a la derecha de las pestañas, en la misma
  fila** (nunca hay más de cuatro pestañas, así que el lugar está libre): «Escanear con el
  celular» en Vender, el día en Anular, «Sector nuevo» en Estanterías, «Rol nuevo» en Roles y
  «Pedido nuevo» en Pedidos. Cada acción lleva su ícono («Rol nuevo» y «Pedido nuevo», como «Sector nuevo», un «+» dibujado, no escrito en el texto). Una caja de texto ancha, como la búsqueda de Duplicados, sigue en su
  propia línea. En el celular no cambia (pedido de Carlos del 2026-10-15; maqueta
  `maquetas/acciones-al-lado-del-submenu.html`).
- **Cobro:** Efectivo viene elegido; el total se ve grande y fuera del botón «Cobrar», que
  solo dice «Cobrar»; el panel de cobro es lo que más resalta de Vender (decisión 37).
- **Fotos:** un producto sin foto muestra una cámara donde se toca para sacarla. La foto de
  un producto se ve y se saca desde cualquier lista donde aparezca el producto (Catálogo,
  Vender, Ingreso, Inventario).
- **Inventario no muestra dinero** y los gastos de la semana se ven solo en «Cómo va el
  negocio» (decisiones 31 y 34).

- **Celular y computadora son la misma aplicación** (decisión 47): las reglas son idénticas;
  la paleta es una sola; los textos dicen lo mismo, más largos en la computadora (explican,
  casi como una ayuda) y resumidos en el celular si no entran. Las ventanas de confirmación
  pueden ser distintas, porque en el celular una ventana emergente molesta más.
- **La entrada:** en el celular, mínima (nombre, logo, una línea que dice qué hace la
  aplicación y los botones); en la computadora puede explicar más. La línea es la misma.
- **Corregir un stock pide siempre el motivo,** en las dos interfaces; hay motivos
  frecuentes para elegir de un toque.

**En el celular**

- **Ninguna búsqueda toma el foco sola:** abriría el teclado y taparía el menú.
- **Colores** (decisión 36): fondo marcado para que lo blanco resalte; verde oscuro para
  dónde se está y los títulos; naranja para la acción principal y la parte actual del menú;
  amarillo para avisos y el panel de cobro; blanco con borde para botones comunes y campos.
  Ninguna pantalla entera usa colores propios. Un elemento puntual que tiene un significado
  (un medio de pago, por ejemplo) puede llevar su color, y entonces lo lleva siempre: el mismo
  en todas las pantallas y en las dos interfaces, definido en la paleta compartida (decisión
  108, que cambia la regla de antes, «ningún color propio»).
- **Vender** (decisión 38): sin «lo último que se vendió» (ocupa lugar y se toca por error).
  El panel de cobro ocupa dos renglones: los medios de pago con ícono y nombre chico debajo,
  como el menú de abajo (Mercado Pago con su isotipo), y debajo «No llevó», el total y
  «Cobrar».
- **Inventario:** cada producto en su tarjeta, separada de la siguiente.

**En la computadora**

- **Todo con el teclado:** Alt+número abre cada pantalla y el atajo se lee como «Alt+1» en
  el menú y en las pestañas; flecha izquierda pasa al menú, arriba y abajo lo recorren,
  derecha o Enter vuelven a la pantalla (decisión 40); las cantidades suben y bajan con las
  flechas.
- **Vender:** «lo último que se vendió» son cuatro tarjetas del mismo tamaño, con foto, que
  siguen a la vista con la venta empezada.
- **La computadora no tiene cámara:** donde haga falta una foto hay un botón que se la pide al
  celular emparejado; elegir un archivo siempre queda (decisiones 41, 42 y 152; antes, con un
  código QR para cualquier celular).
- **La primera vez en un dispositivo** el catálogo no se espera entero: se ve una primera
  tanda y el resto baja atrás.

**Versión nueva (decisiones 54, 91 y 92, ADR-020).** La app instalada busca sola si hay una
versión nueva: al abrirse, al volver a primer plano, al volver la conexión y, mientras está a la vista, cada el tiempo elegido en Configuración
(15 min de arranque; decisión 92); oculta, no busca. Con la llave de Configuración apagada no
busca mientras está abierta: la versión nueva llega al cerrarla y volver a abrirla. Recién abierta, se actualiza sin
preguntar. Si ya se estaba usando, muestra un aviso con el botón «Actualizar ahora», que no
tapa lo que se está haciendo, y nunca se recarga sola.

**El teclado en la computadora (decisiones 77 y 82; RNF-05).** Hay dos focos distintos:

- **El cursor de escritura** está en la caja de texto de la pantalla (la búsqueda) y no se mueve
  con las flechas: de un campo a otro, y a los botones, se va con Tab (y Mayús + Tab).
- **La marca de las flechas** es propia de las flechas. Solo puede estar en tres lugares: una
  opción del menú de la izquierda, una pestaña, o una fila entera de la lista de la pantalla.
  La fila marcada se ve entera resaltada, no una parte de ella.

Vale igual en todas las pantallas:

| Tecla | Qué hace |
|---|---|
| ↑ ↓ en el menú | Recorren las partes y, debajo, el botón del vínculo (Vincular el celular, Desconectar o Reconectar) y Salir. No abren nada: se abre con Enter |
| Enter en el menú | Abre esa parte y deja la marca en su primera pestaña (en Más, en su primera opción) |
| → en el menú | Pasa la marca a las pestañas de esa parte; en Más, a su primera opción |
| Clic en una pestaña | La abre y deja la marca de las flechas en esa pestaña |
| ← → en las pestañas | Pasan la marca de una pestaña a otra sin abrirla; Enter abre la marcada; ← desde la primera vuelve al menú |
| ← → ↑ ↓ en Más | Las opciones de Más se recorren como la grilla que se ve: → a la siguiente y ← a la anterior; ↓ a la de abajo y ↑ a la de arriba, en la misma columna (en la última o la primera fila no se mueve); Enter abre; ← desde la primera vuelve al menú (pedido de Carlos del 2026-10-15) |
| ↓ desde las pestañas | Marca la primera fila de la lista de la pantalla, y el cursor de escritura queda en la búsqueda. **Si la lista está vacía, la marca se queda en las pestañas** |
| ↑ ↓ con una fila marcada | Marcan la fila anterior o la siguiente, entera; el cursor de escritura no se mueve. ↑ desde la primera vuelve a las pestañas |
| ↓ desde la búsqueda | Marca la primera fila de la lista, si hay; el cursor sigue en la búsqueda |
| Enter con una fila marcada | Abre esa fila (su acción principal) |
| ← con una fila marcada | Vuelve al menú, si la búsqueda está vacía o el cursor está al principio |
| Tab, Mayús + Tab | Van al campo o botón siguiente o anterior |
| Esc | Cierra lo que esté abierto |
| Alt + número | Abre cada pantalla |

Solo se marcan las filas que hacen algo al apretar Enter (abren una ficha, tienen un botón). Una
lista que solo muestra datos no se recorre: ahí la marca se queda en las pestañas. Los títulos
de una tabla (los de ordenar) no son filas: se alcanzan con Tab. El foco se ve siempre: borde
amarillo en el menú, en las pestañas, en las opciones de Más y en la fila marcada. Una búsqueda que
despliega sus propios resultados (la de Vender) los recorre con ↑ ↓ y Enter toma el marcado.
Con una ventana abierta, las flechas valen dentro de ella.

**Atajos de los botones (decisión 80).** En la computadora todos los botones tienen atajo:

- Mientras se mantiene apretada la tecla Alt, cada botón que está a la vista muestra encima una
  letra. Con Alt apretado, esa letra acciona el botón. Al soltar Alt, las letras desaparecen.
- La letra sale del nombre del botón: la primera que no esté tomada por otro botón de más
  arriba; si no le queda ninguna de su nombre, la primera libre del abecedario. Con los mismos
  botones a la vista, a cada uno le toca siempre la misma letra.
- No se usan la D, la E ni la F: en Windows el navegador las tiene para cosas propias.
- Los botones que ya tienen su tecla (Alt + número, F2, F5 a F8) no llevan letra.
- Las letras se reparten primero entre los botones de la pantalla, de arriba hacia abajo, y
  después entre los del menú de la izquierda. Si hay más botones que letras, los que sobran
  quedan sin atajo y se alcanzan con Tab.
- Con una ventana abierta, las letras son solo de los botones de esa ventana.
- Alt + número sigue abriendo las pantallas; en Vender, F5 a F8 eligen el medio de pago y F2 cobra.
- En el celular no hay atajos.

**Por dónde se entra en el celular (decisión 56).** Al entrar se abre siempre el Catálogo, y
cada parte del menú de abajo abre siempre en su primera pestaña (Catálogo en Productos,
Depósito en Inventario; el orden de Depósito es Inventario, Ingreso, Estanterías, Pedidos, decisión 68): la aplicación no recuerda en qué pestaña se estaba.

**Vincular, siempre a mano (decisión 66).** En el celular, mientras no esté vinculado con una
computadora, todas las pantallas llevan «Vincular» a la derecha de su encabezado: un botón chico,
con borde, el ícono a la izquierda y la leyenda a su derecha. Vinculado, ese mismo botón dice «Desconectar» o «Reconectar», en verde o en
gris según estén o no trabajando juntos. «Desvincular» está solo en Más → Configuración (decisiones 70, 73, 74 y 99).

**Las partes y sus pestañas (decisiones 68 y 72).** Catálogo: Productos, Listas, Duplicados.
Vender: Vender, Hoy, Anular. Depósito: Inventario, Ingreso, Estanterías, Pedidos. Más no tiene
pestañas: es una lista de opciones. Las pestañas se ven igual en las tres partes, cada persona
ve solo las que puede usar y, si le queda una sola, no se dibujan.

**Más, en el celular.** Todas las opciones se ven igual: ícono a la izquierda, nombre, una línea
que explica y la flecha a la derecha. «Salir» también, en su propio bloque al final.

**Movimiento (decisión 78).** En el celular la navegación se anima como en una aplicación de
iPhone: entrar a una pantalla la trae desde la derecha, volver la saca por la derecha, y cambiar
de parte o de pestaña es un fundido. El detalle (curva y duraciones) está en
`docs/sistema-visual.md`, «Movimiento en el celular».

**La línea de arriba del celular (decisión 76).** Todas las pantallas del celular empiezan con una
línea chica que dice cómo está la conexión: «Conectado», «Sincronizado hace 5 min», «Sin
conexión · 2 por enviar» o «3 por enviar desde hace más de una hora». Debajo, sin espacio de
más, va el título de la pantalla.

**Volver a Más (decisiones 64 y 90).** En el celular, cada pantalla de Más lleva arriba a la
izquierda «Volver a Más», que regresa al menú de Más. En la computadora no lo lleva: se vuelve
con «Más» del menú de la izquierda.

**El botón de volver del celular (pedido de Carlos del 2026-10-12).** Con algo abierto encima
de la pantalla (la ficha de un producto, cualquier hoja que sube desde abajo, la cámara del
escáner), volver lo cierra y deja la pantalla de abajo como estaba: no cambia de pantalla ni
sale de la aplicación. Con varias cosas apiladas, cada «volver» cierra la de arriba.

**Lo de atrás queda quieto (pedido de Carlos del 2026-10-17).** En el celular, mientras hay una
hoja abierta, deslizar el dedo mueve solo la hoja: la pantalla de atrás no se desplaza, ni
cuando la hoja llega a su principio o a su final. Al cerrarla, la pantalla de atrás está donde
se la dejó.

**Lo que se ve depende de los permisos (decisión 50, RF-72).** El menú, las pestañas, los
botones y los atajos de teclado muestran solo lo que los roles de la persona le permiten
usar; nada se muestra deshabilitado. Una dirección que no le corresponde muestra qué permiso
hace falta. Toda pantalla o botón nuevo dice qué permiso pide, igual en el celular y en la
computadora. El detalle está en
[los requerimientos de interfaz de Usuarios y acceso](../007-usuarios-y-acceso/ux.md),
historias 3 y 3b.

## Lo que funcionó

En la computadora, tablas densas que muestran muchos
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
