# Catálogo → Duplicados: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/`, `../../duplicados.css` y
`../../iconos-extra.js`, con 18 íconos Lucide que faltaban: unir, separar, código de barras…).
Los datos son los mismos en todas: 12 sugerencias (7 por código de barras, 5 por descripción),
38 productos ya unidos, y pares reales como «Mecha acero rápido HSS 8 mm» de Bulonera Centro
($2.480) contra «MECHA HSS 8MM P/METAL» de Distribuidora Oeste ($2.610).

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · La bandeja** (evolución) | Arriba los números (por revisar, por qué motivo, cuántos unidos); a la izquierda la cola de sugerencias, como una bandeja de entrada; a la derecha los dos productos en una tabla lado a lado con lo distinto en ámbar, «Conservar este» con ← →, cómo queda al unir, y **E** es el mismo / **D** son distintos / **J** saltar. | 1, 2, 3, 4, 5, 6, 7, 8 |
| **2 · Así queda** (reinvención) | En lugar de pares, **grupos**: cada tarjeta ya es el producto unido, con sus 2 o 3 proveedores, el costo de cada uno en una barra y el más barato en verde; se destilda el que no corresponde; los 7 de mismo código se unen de una vez; a la derecha, los unidos con «Separar» al lado. | 3, 9, 10, 11, 12, 13, 14, 15 |
| **3 · De a uno** (audaz) | Rompe el marco: un modo a pantalla completa, sin lateral ni pestañas. Dos cartas grandes enfrentadas con foto, stock, ventas y la historia del costo; en el medio un «=» con lo que coincide y qué tan seguro está el sistema; abajo, cuatro teclas grandes. Lo recién unido queda en una tostada con «Deshacer Z». | 2, 4, 6, 16, 17, 18, 19, 20 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Renovada** (evolución) | Lo aprobado el 17/10 (nota con raya verde, Buscar · Unir · Separar con su bajada, sugerencia con los dos lado a lado), pero «Es el mismo / Son distintos» pasa a la barra fija de abajo, bajo el pulgar, y la diferencia se marca en ámbar. | 1, 3, 4, 7, 21 |
| **2 · La pila** (reinvención) | Una sugerencia por vez, como una carta: deslizar a la derecha es «es el mismo», a la izquierda «son distintos»; tocar un producto lo elige para conservar; debajo, cómo queda; deshacer en el medio. | 4, 6, 7, 22, 23, 24 |
| **3 · Recorré el estante** (audaz) | Rompe el marco: la cámara manda. Se recorre el estante escaneando; si ese código lo tienen varios productos, sube una hoja con todos, tildados, se destilda el que no es y se desliza para unir. | 9, 10, 25, 26, 27, 28 |

**Qué rompen las audaces.** Compu 3: saca el lateral y las pestañas; Duplicados pasa a ser un
modo de una sola tarea que se abre desde la pestaña y se cierra con Esc. Celu 3: saca el menú
de abajo y las pestañas; el punto de partida deja de ser la lista y pasa a ser el producto en
la mano.

## Cuál me gusta más

**Computadora: la 1, con los grupos y el «Unir los 7 de mismo código» de la 2.** La 1 cumple
«una tras otra sin soltar el teclado» con tres teclas, y la tabla con las diferencias en ámbar
se lee de un vistazo. Pero la 2 tiene la mejor idea de todas: el mismo artículo suele estar
en **tres** listas, no en dos, y unir de a pares obliga a resolverlo dos veces. Mostrar el
grupo y el resultado («así queda») ahorra la mitad del trabajo.

**Celular: la 1 de base, con la pila de la 2 como forma de revisar.** La 1 ya está aprobada y
la barra fija abajo solo la mejora. Al tocar «Por revisar», abrir la pila de la 2 hace que 12
sugerencias se resuelvan con 12 gestos del pulgar. La 3 es la idea más original (une lo que
el empleado tiene en la mano) y sirve como modo aparte para el depósito, no como pantalla
principal.

## Cómo se mueve (una línea por interacción)

- **Es el mismo:** las dos tarjetas se juntan hacia el centro (200 ms, `--curva`), se funden en
  una con un rebote corto; el contador «Por revisar» baja rodando un dígito y la de «Unidos» sube.
  Celular: vibra 10 ms.
- **Son distintos:** la sugerencia se desliza hacia la izquierda y se apaga (200 ms,
  `--curva-salida`); entra la siguiente desde 8 px abajo.
- **Conservar este (← →):** el borde pino y el fondo pino suave se deslizan de un lado al otro
  (200 ms); el «así queda» cambia de nombre con un fundido.
- **Deslizar en la pila (celu 2):** la carta sigue al dedo y gira hasta 6°; el sello «ES EL
  MISMO» (verde) o «SON DISTINTOS» (gris) aparece con la opacidad según la distancia; al soltar
  pasado el 40 %, sale volando y la de atrás sube a su lugar (320 ms).
- **Separar:** la fila del unido se parte en dos con un corte vertical que se abre (200 ms) y sale
  de la lista; tostada pino con «Deshacer» 6 s.
- **Unir los 7 (compu 2):** las tarjetas de mismo código se pliegan una tras otra, de arriba
  abajo, cada 60 ms; el anillo de avance se llena.
- **Escanear un código con dueños repetidos (celu 3):** el visor se cierra sobre el código, vibra
  doble y la hoja sube desde abajo con los productos entrando de a uno (40 ms entre cada uno).
- **Destildar un proveedor:** la fila se tacha y baja a 55 % de opacidad; el costo «sale de»
  rueda al nuevo más barato.
- **Buscar en todo el catálogo:** el botón se vuelve una barra que avanza con números
  («18.240 de 104.500 productos»); al terminar, las sugerencias nuevas entran de a una.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: la tabla se cortaba abajo y la lista de la izquierda rompía su grilla; uní «Se
  conserva» con la fila del producto y saqué la fila de stock (pasó al «así queda»).
- Compu 2: los nombres de proveedor salían cortados y la grilla se escapaba hacia la derecha;
  barras más cortas, sin fechas en la fila y el motivo al lado de la marca.
- Compu 3: las cartas quedaban vacías abajo y la tostada pisaba la carta; fotos más grandes, una
  fila de stock, ventas y la historia del costo, y la tostada arriba.
- Celu 1: la tarjeta se salía del ancho y los botones de decidir no se veían; pasaron a la barra
  fija de abajo.
- Celu 2: la carta inclinada se salía de la pantalla; menos giro y más chica la foto.
- Celu 3: el pie de la hoja se salía; textos más cortos.
- Lo más flojo que queda: el mismo producto aparece con la misma foto en los dos lados (en la
  realidad la foto de un proveedor muchas veces falta); la «cámara» de la celu 3 es una escena
  armada con fotos recortadas, no una foto real de un estante.

## Catálogo de ideas

«Toques» = lo que ahorra en la tarea más frecuente: resolver 12 sugerencias después de aplicar
una lista. Hoy, en el celular, unos 3 por sugerencia (elegir cuál se conserva, decidir, bajar a
la siguiente): ~36.

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Cola de sugerencias a un lado y el par elegido al otro | Ver cuántas quedan y avanzar sin volver a una lista | C1, celu 1 | Linear (bandeja), Gmail | 1 por sugerencia | No |
| 2 | Lo que cambia entre los dos, en ámbar; lo que coincide, con tilde verde | Decidir de un vistazo sin leer todo | C1, C3 | GitHub (diff) | — | No |
| 3 | «Conservar este» ya elegido (el que tiene más ventas e historia) | La mayoría de las veces no hay que elegir | todas | Apple Fotos (duplicados) | 1 por sugerencia | No (lo deduce) |
| 4 | «Así queda» antes de unir: proveedores, stock, ventas y de quién sale el costo | Saber qué va a pasar sin miedo a romper algo | C1, C3, celu 1, celu 2 | Stripe (vista previa) | — | No |
| 5 | Teclas E · D · J · ← → para todo el recorrido | Resolver sin soltar el teclado | C1 | Superhuman, Linear | — | No |
| 6 | Unir sin confirmar, con «Deshacer» en una tostada (Z) | Rapidez sin riesgo | C1, C3, celu 2 | Gmail (deshacer envío) | 1 | No |
| 7 | La marca «el más barato» en el costo | Ver por qué conviene unir | todas | Shopify (comparar) | — | No |
| 8 | Resumen arriba: por revisar, por motivo, unidos, y barras de cuándo llegaron | Saber cuánto trabajo hay y de dónde salió | C1 | Referencia de Carlos | — | No |
| 9 | Grupos de 2 o 3 en vez de pares | El mismo artículo en tres listas se resuelve una vez | C2, celu 3 | Apple Fotos (fusionar) | 1 por grupo de 3 | **Sí** |
| 10 | Destildar el proveedor que no corresponde dentro del grupo | Un falso positivo no tira abajo todo el grupo | C2, celu 3 | Mail (seleccionar) | 2 | **Sí** |
| 11 | Barras de costo por proveedor | Comparar costos sin leer números | C2 | Google Flights | — | No |
| 12 | «Unir los 7 de mismo código» de una vez | Los de mismo código casi nunca fallan | C2 | Gmail (acciones en lote) | ~14 | **Sí** |
| 13 | Unidos al costado, con «Separar» en cada uno y buscador | Separar sin ir a otra pantalla | C2 | Dropbox (versiones) | 1–2 | No |
| 14 | Tarjeta «¿Viste dos iguales?» con arrastrar o escribir dos nombres | Unir a mano donde se piensa en eso | C2 | Notion | 1 | No |
| 15 | Anillo de avance del día | Sensación de terminar | C2 | Apple Fitness | — | **Sí** |
| 16 | Modo de una sola tarea, a pantalla completa, Esc para salir | Concentrarse en 12 decisiones seguidas | C3 | Superhuman, Tinder | — | **Sí** (marco) |
| 17 | «96 % seguro» y la lista de lo que coincide | Confiar en la sugerencia | C3 | Google Fotos (caras) | — | **Sí** |
| 18 | Stock, ventas 90 días e historia del costo en cada carta | Conservar el que tiene la historia | C3 | Shopify | — | **Sí** |
| 19 | Barra de avance «4 de 12» con unidos | Saber cuánto falta | C3, celu 2 | Duolingo | — | No |
| 20 | Teclas grandes abajo, con la acción principal en naranja | Descubrir el teclado sin leer ayuda | C3 | Juegos, Raycast | — | No |
| 21 | «Es el mismo / Son distintos» en la barra fija, bajo el pulgar | Decidir sin bajar la vista | celu 1 | Referencia de Carlos | 1 | No |
| 22 | Una carta por sugerencia; deslizar para decidir | Resolver con el pulgar, con guantes | celu 2 | Tinder, Apple Fotos | 1–2 por sugerencia | **Sí** |
| 23 | Sello «ES EL MISMO» que aparece al deslizar | Saber qué va a pasar antes de soltar | celu 2 | Tinder | — | **Sí** |
| 24 | Los dos productos uno arriba del otro, con lo que coincide en el medio | Comparar sin desplazar al costado (ux.md) | celu 2 | Apple Wallet | — | No |
| 25 | Recorrida del estante escaneando para encontrar duplicados | Encontrar lo repetido con el producto en la mano | celu 3 | Shopify (inventario) | — | **Sí** |
| 26 | «Este código lo tienen 3» al escanear | Hoy un código repetido se descubre por accidente | celu 3 | Ficha (decisión 51) | — | **Sí** |
| 27 | Deslizá para unir | Unir a prueba de toque accidental | celu 3 | iPhone (deslizar) | 0 | **Sí** |
| 28 | Fotos de lo unido en esta recorrida | Ver lo que se hizo sin abrir otra lista | celu 3 | Apple Wallet | — | **Sí** |

Toques de la tarea frecuente (12 sugerencias): hoy ~36 en el celular; celu 1 ~24 (el conservado
ya viene elegido); celu 2 **~12** (un gesto por sugerencia); compu 1, 12 teclas; compu 2, **1
clic** para los 7 de mismo código y 1 por cada grupo restante (~6).
