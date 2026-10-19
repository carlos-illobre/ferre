# Depósito → Contar: siete maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre sola
desde su `index.html` (usa `../../../_comun/` y los íconos que sumé en `contar/iconos-extra.js`).
Todas cuentan el mismo local: 14 sectores, 9 ya contados, la «Pared de tornillería» a medias
(24 de 64) desde ayer, y un plan A B C que hoy pide 31 productos (12 A).

Nota de nombre: la decisión 39 llama a esta pestaña «Estanterías»; el lenguaje común la llama
«Contar». Usé «Contar» para seguir el marco; es un cambio de texto si Carlos prefiere el otro.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Sectores y conteo** (evolución) | Arriba, cuánto stock está cargado y qué toca hoy; a la izquierda los sectores con su estado (en curso, nunca, fecha); a la derecha el conteo abierto: buscador, el producto elegido con «¿Cuántas hay?» y Enter, contados con su diferencia y sin contar al lado. | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| **2 · El plano del local** (reinvención) | El local dibujado: cada sector en su lugar, pintado por su estado y con la «A» si le toca; abajo, una semana armada con un sector por día; a la derecha, en vivo, lo que cuenta el celular del depósito, y desde ahí se cierra. | 2, 10, 11, 12, 13, 14, 15 |
| **3 · La planilla a ciegas** (audaz) | Rompe el marco (lateral plegado, sin pestañas): el sector como una planilla de papel en el orden del cajón, se tipea número y Enter baja; el sistema no muestra su stock hasta cerrar; uno cuenta en voz alta y otro tipea; se imprime para contar en papel. | 5, 16, 17, 18, 19, 20, 21 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Seguí donde quedaste** (evolución) | Abre con el conteo a medias primero (anillo de avance y «Seguir contando» bajo el pulgar), después lo que toca hoy en A B C y la lista de sectores con su estado. | 1, 2, 3, 4, 22 |
| **2 · Escaneá y tecleá** (reinvención) | Modo de una sola tarea: la cámara arriba siempre encendida, abajo un teclado numérico grande; apuntás, tecleás y «Listo» deja la cámara lista para el próximo. «No hay» pone cero en un toque. | 7, 8, 23, 24, 25, 26 |
| **3 · Una por una** (audaz) | Rompe el marco (sin menú ni pestañas): el sistema te lleva estante por estante, en el orden de la última vez, con una tarjeta grande por producto; la rueda arranca en lo que dice el sistema y si coincide alcanza con deslizar; se puede decir el número. | 27, 28, 29, 30, 31, 32 |
| **4 · El cierre** (extra, para cualquiera) | La hoja de cerrar: contados, diferencias y sin contar en tres números; las diferencias más grandes en barras; los no contados con su foto; las dos opciones escritas completas. | 6, 33, 34 |

**Qué rompen las audaces.** Compu 3: pliega el lateral y saca las pestañas; cambia tarjetas por
una planilla y **oculta el stock del sistema** (la spec pide mostrar la diferencia de cada
contado: acá se ve recién al cerrar). Celu 3: saca el menú de abajo y el buscador como entrada;
el orden lo pone el sistema y la rueda arranca en el stock del sistema (lo opuesto a la ciega:
gana velocidad y pierde la defensa contra el «que dé»). Son dos apuestas contrarias a propósito.

## Cuál me gusta más

**Computadora: la 1, con la semana y el panel en vivo de la 2.** La 1 cumple todo lo que pide
la especificación en una sola pantalla y es la que menos explica. La computadora casi nunca va
a ser la que cuenta (el local no se cierra y el que cuenta está parado frente al estante); su
trabajo es saber qué falta y cerrar. Por eso le sumaría de la 2 «un sector por día» (convierte
el plan A B C en algo que se hace) y el panel en vivo del celular.

**Celular: la 2 para contar, abierta desde la 1, y la 4 para cerrar.** El ritmo que pide la
spec es «buscar o escanear → cantidad → siguiente, sin otro toque»; la 2 es eso literal y se
usa con una mano y con guantes. La 3 es más linda y la más rápida cuando el sistema acierta,
pero depende de que el stock ya esté bastante bien; para la carga inicial (stock en cero) la
rueda arrancaría en 0 y pierde su gracia. Me la guardaría para los reconteos del plan.

## Cómo se mueve (una línea por interacción)

- **Escanear (celu 2):** las esquinas del visor se cierran sobre el código y se ponen verdes,
  vibra 10 ms y la tarjeta del producto se cruza desde abajo; la pantallita vuelve a «0» con el
  cursor latiendo.
- **Teclear:** cada tecla baja a 97 % y se tiñe de pino suave 120 ms; el número rueda hacia
  arriba al crecer.
- **Listo / Siguiente / Enter:** el producto sale hacia arriba con fundido y entra primero en
  «Contados» desde 8 px abajo con su borde verde 1 s; el contador «25/64» rueda; el foco vuelve
  al buscador (compu) o a la cámara (celu).
- **Ya contado:** la pastilla «Antes 8» aparece con un rebote corto al elegirlo, para que se vea
  antes de pisar.
- **Deslizar (celu 3):** la tarjeta sigue al dedo y gira hasta 6°; a la derecha se tiñe verde con
  un tilde, a la izquierda gris con «0»; al soltar vuela y la de atrás sube a su lugar (320 ms).
- **Rueda:** gira con inercia y se traba en cada número con una vibración de 5 ms.
- **En vivo (compu 2):** cada conteo que llega del celular entra arriba del feed con su borde
  verde; en el plano, el punto naranja de quien cuenta late suave y el relleno del sector avanza.
- **Cerrar:** la hoja sube (320 ms) y el fondo se oscurece al 30 %; las barras de diferencia
  crecen desde el centro; al confirmar, tilde dibujado, vibración doble y el sector en la lista
  cambia de «En curso» a la fecha de hoy.
- **Sin señal:** el ícono de la barra cambia y el renglón contado lleva un punto ámbar
  «guardado acá» que se apaga cuando llega al servidor.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: la primera versión se salía por la derecha (columnas sin mínimo) y el nombre del
  producto elegido se partía en una palabra por renglón. Ahora el buscador va arriba y el
  elegido abajo, a lo ancho; las pastillas de estado de los sectores pasaron a texto teñido.
- Compu 2: el título del plano y los filtros se partían y los días de la semana tenían dos
  renglones de horas; ahora un renglón por dato.
- Compu 3: la ayuda de teclado y el aviso de ventas se pisaban abajo; acorté el aviso.
- Celu 1: la tarjeta de «Seguí» tenía borde naranja además del botón naranja: dos naranjas. Quedó
  solo el anillo y el botón.
- Celu 2: quedaba un hueco abajo; bajé el teclado al pulgar y subí la cámara.
- Celu 3: la rueda no marcaba el número elegido y la unidad se encimaba; las cartas de atrás no
  se veían.
- Lo más flojo que queda: hay pocas fotos de tornillería (se repite la de tornillos), los
  productos sin foto quedan con un «#»; con fotos propias la lista de bulones mejora mucho. El
  plano de la compu 2 está dibujado a mano: en serio, alguien tiene que dibujar el local una vez.

## Catálogo de ideas

«Toques» = lo que ahorra por producto en la tarea más frecuente (contar un producto en el
celular). Hoy, según la spec: tocar buscar o escanear, apuntar o escribir, elegir la sugerencia,
tocar la cantidad, tipear y Siguiente: unos 4 toques más el número.

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Resumen arriba: sectores con stock cargado (9 de 14 con barra), nunca contados, en curso, lo que toca hoy | Saber cuánto falta para que el stock sea real | C1, celu 1 | Referencias de Carlos (tarjetas de resumen) | — | No |
| 2 | Barra A B C de lo que toca hoy (A 12 · B 15 · C 4) | El plan se entiende sin leer una lista | C1, C2, celu 1 | Apple Salud (anillos y barras) | — | No |
| 3 | Estado del sector como texto teñido + ícono (en curso naranja, nunca ámbar rayado, fecha) | Distinguir de un vistazo qué falta (pedido del ux) | C1, celu 1, C2 | Linear (estados) | — | No |
| 4 | Pastilla «9 A» en cada sector: cuántos de clase A tiene atrasados | Responde la pregunta abierta 25 a mitad de camino: el plan es por producto, se muestra por sector | C1, celu 1, C2 | Shopify (insignias de cantidad) | 1 | Toca una pregunta abierta |
| 5 | Diferencia en su caja: «−2» ámbar, «+0,7» pino, «=» verde | Ver lo que va a ajustar sin abrir nada | C1, C2, celu 4 | Stripe (montos con signo) | — | No |
| 6 | Los no contados con sus fotos antes de cerrar | Darse cuenta de que algo quedó sin contar | C1, celu 4 | Fotos de iPhone (miniaturas) | — | No |
| 7 | «Antes pusiste 8 · ayer 17:22» en el producto elegido | Pisar un conteo sabiendo qué había (escenario 10) | C1, celu 2 | Notas (versión anterior) | — | No |
| 8 | «Viene de Electricidad»: avisa que el producto cambia de sector al contarlo | Que el cambio de sector no sea sorpresa (escenario 11) | C1 | Google Maps (mover un lugar) | — | No |
| 9 | Enter cuenta y devuelve el foco al buscador; «/» vuelve al buscador | Contar con lector de código y teclado sin mouse | C1, C3 | Linear, Gmail (atajos) | 1 | No |
| 10 | El plano del local con los sectores pintados por estado | Ver dónde falta contar como se ve el local | C2 | Apple Home, mapas de tiendas de Square | 1 | **Sí** |
| 11 | Filtros del plano: Estado · Plan A B C · Diferencias | El mismo dibujo responde tres preguntas | C2 | Google Maps (capas) | — | **Sí** |
| 12 | «Un sector por día»: el plan A B C convertido en una semana | El plan se hace si dice qué hacer hoy y cuánto tarda | C2 | Duolingo, Todoist (hoy y próximos) | — | **Sí** |
| 13 | Tiempo estimado por sector (~35 min) y ritmo (22 s c/u) | Decidir si da el tiempo antes de abrir | C2 | Apple Fitness | — | **Sí** |
| 14 | Panel en vivo: lo que cuenta el celular aparece en la computadora | El dueño ve el avance sin ir al estante | C2 | Google Docs (en vivo), Apple Continuity | — | **Sí** (usa el espejo de RF-08) |
| 15 | Cerrar desde cualquier dispositivo, aunque lo abrió otro | El que cuenta se va y otro cierra | C2 | Linear (asignación) | — | No |
| 16 | Planilla en el orden del cajón, número y Enter baja | Pasar el papel a la pantalla a la velocidad de una planilla | C3 | Excel, Airtable | 2 | **Sí** |
| 17 | Conteo a ciegas: el stock del sistema oculto hasta cerrar | Que nadie cuente «para que dé» | C3 | Inventario cíclico de grandes cadenas | — | **Sí** (contradice el ux) |
| 18 | Dos personas: uno cuenta en voz alta, otro tipea; queda quién cargó cada uno | Contar más rápido sin soltar la caja | C3 | Inventarios de supermercado | — | No (quién contó ya se pide) |
| 19 | Imprimir la planilla en blanco para contar en papel y tipear después | Lugares sin señal o gente que prefiere papel | C3 | Planillas de inventario | — | **Sí** |
| 20 | Ventas posteriores al conteo se descuentan solas al cerrar | Responde la pregunta abierta 8 de una forma concreta | C3 | Shopify (ajustes por movimientos) | — | Propone una respuesta |
| 21 | Columna «Se cuenta en: unidades / kg, a granel» | Saber si va con decimal antes de tipear (RF-12) | C3 | — | — | No |
| 22 | «Seguí donde quedaste» primero, con el anillo de avance | Retomar sin buscar el sector (escenario 7) | celu 1 | Netflix (seguir viendo) | 2 | No |
| 23 | Cámara siempre encendida mientras se cuenta | Escanear sin tocar «escanear» cada vez | celu 2 | Shopify POS, lectores de depósito | 2 | No |
| 24 | Teclado numérico propio, grande, con «No hay» | Tipear con guantes; poner cero en un toque | celu 2 | Teléfono de iPhone, cajeros | 1 | No |
| 25 | Ráfaga: cada pitido suma 1 al mismo producto | Contar de a una las cosas con código propio | celu 2 | Lectores de inventario | todo el número | **Sí** |
| 26 | «Recién: … −2» arriba, tocá para corregir | Corregir el último sin buscarlo | celu 2 | Gmail (deshacer) | 2 | No |
| 27 | El recorrido: estante por estante, en el orden de la última vez | No hay que buscar nada: el sistema sabe qué sigue | celu 3 | Google Maps (indicaciones), Duolingo | 3 | **Sí** |
| 28 | Una tarjeta grande por producto, con foto y lugar («Gancho 14») | Reconocer el producto en el estante de lejos | celu 3 | Tinder, Apple Wallet | — | **Sí** |
| 29 | La rueda arranca en el stock del sistema: si coincide, deslizar | El caso más común (coincide) en un gesto | celu 3 | Selector de iPhone | 3 | **Sí** |
| 30 | Deslizar a la izquierda = «no hay ninguno» | Poner cero sin teclear | celu 3 | Mail de iPhone | 1 | **Sí** |
| 31 | Decir el número («catorce») con el micrófono | Manos ocupadas, con guantes | celu 3 | Siri, Google Assistant | 1 | **Sí** |
| 32 | Barra de estantes del sector (3 de 5) | Saber cuánto falta de este mueble | celu 3 | Historias de Instagram | — | **Sí** |
| 33 | Diferencias en barras desde el centro, las más grandes primero | Ver qué ajuste importa antes de confirmar | celu 4 | Apple Bolsa | — | No |
| 34 | Las dos opciones del cierre escritas completas como botones | No equivocarse con lo que no se deshace | celu 4 | Apple (hojas de acción) | 1 | No |

Toques por producto (celular): hoy ~4 más el número; celu 1 igual (es la entrada); celu 2
**1 más el número** (apuntar, teclear, Listo); celu 3 **1** cuando coincide (deslizar), 2 cuando
no (girar y deslizar). Computadora: con lector, número y Enter en las tres; la 3 además sin
buscar, porque la planilla ya está en el orden del cajón.
