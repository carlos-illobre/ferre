# Más → Procesos: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre sola
desde su `index.html` (usa `../../../_comun/` y, de esta carpeta, `dibujo.js`, `proceso.js` e
`iconos-extra.js`). Todas dibujan el mismo proceso, para comparar igual con igual: «Venta en el
mostrador», 10 pasos en tres carriles (Cliente, Vendedor, Ferrebress), dos decisiones (¿Tiene
precio?, ¿Lleva algo más?, que vuelve a buscar) y un paso suelto con aviso («Espera que acredite la
transferencia»: ninguna flecha llega).

El dibujo sale de un único dibujante (`dibujo.js`) con el lenguaje «Mostrador»: carriles blancos
sobre el papel punteado; pasos como tarjetas blancas con su ícono (persona o sistema); decisiones
en rombo con ×; el inicio en pino, el fin con trazo grueso; el paso elegido en naranja con un halo;
el aviso, una insignia ámbar. Las doce figuras tienen glifos propios con notación BPMN, dibujados con
el mismo trazo que los íconos de Lucide.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · El tablero de dibujo** (evolución) | El editor aprobado, terminado: lateral de la app plegado, figuras plegadas a íconos con su nombre al pasar el mouse, el dibujo a lo ancho con mapa, zoom y bpmn.io, el paso elegido a la derecha con sus seis datos, y la barra «Los pasos, en orden» con el resumen y el aviso. | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| **2 · El recorrido escrito** (reinvención) | El proceso se escribe como lista, igual que se cuenta («4 ¿Tiene precio? → No → 5 Elige el margen»), con Enter, Tab y «/», y el dibujo **se arma solo** al lado, chico y numerado. Abajo, el paso elegido y las versiones en una línea de tiempo. | 3, 6, 11, 12, 13, 14, 15, 16, 17 |
| **3 · Contalo y se dibuja** (audaz) | Rompe el marco: sin lateral, el dibujo ocupa toda la pantalla con barras flotantes. A la derecha se escribe (o se dicta) cómo se hace, y Ferrebress propone los pasos en el dibujo, punteados en naranja, hasta que se aceptan con Enter. Abajo, las versiones como una regla que se arrastra y «Recorrerlo». | 1, 4, 18, 19, 20, 21, 22, 23, 24 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Diagrama y hoja** (evolución) | Lo aprobado: «Diagrama» primero, el dibujo con el carril pegado a la izquierda, acercar y alejar a la derecha, los botoncitos del paso debajo, y la hoja «Agregar un paso» con las doce figuras iguales y nombres cortos. | 2, 5, 25, 26, 27 |
| **2 · La línea** (reinvención) | «Pasos» como línea de subte: un riel por carril y el recorrido en pino, que salta de riel cuando cambia quién lo hace; las decisiones, en rombos; un paso se arrastra y la línea le abre el hueco. «Marcar vigente» fijo abajo. | 3, 13, 28, 29, 30, 31 |
| **3 · ¿Y después?** (audaz) | Rompe el marco: sin menú ni pestañas, un paso por pantalla, grande, como una historia; se desliza entre pasos y se arma el proceso contestando «¿Y después?»: lo que sigue hoy, una pregunta, una espera o el fin, o diciéndolo con el micrófono. Abajo, «Así va», el dibujo chico. | 19, 32, 33, 34, 35, 36 |

**Qué rompe la audaz.** Computadora: saca el lateral de la aplicación y los paneles fijos; todo
flota sobre el dibujo y aparece un tercer modo de cargar (escribir o dictar), fuera de la
especificación. Celular: saca el menú de abajo, las pestañas y el dibujo como pantalla principal; el
proceso se construye de a un paso.

## Cuál me gusta más

**Computadora: la 1 como base, con el «Contalo» de la 3 como panel opcional.** La 1 es lo que
Carlos aprobó, pero se lee mejor: el paso elegido con sus seis datos, el aviso donde está el
problema y la barra de pasos con el resumen. Dibujar BPMN desde cero es lo que hoy le llevaría a
Carlos más de los 15 minutos de SC-01; contarlo en castellano y corregir el dibujo es más rápido para
alguien que no conoce la notación. La 2 me gusta para quien piensa en lista, pero cambia el centro
de la pantalla, y Carlos pidió el editor clásico.

**Celular: la 1 para «Diagrama» y la 2 para «Pasos».** Las dos pestañas que pide la especificación,
cada una con su mejor forma: la línea de subte de la 2 muestra en una lista lo único que una lista
común pierde, quién hace cada paso y dónde se ramifica, sin salirse del ancho. La 3 es para cargar
un proceso nuevo desde el depósito con una mano; la dejaría como modo, no como pantalla.

## Cómo se mueve (una línea por interacción)

- **Soltar una figura en el dibujo:** el paso cae desde 8 px arriba con rebote corto, queda elegido
  (halo naranja que crece de 0 a 5 px en 200 ms) y el panel del paso elegido se desliza desde la
  derecha (320 ms) si estaba plegado. Celular: vibra 10 ms al soltar.
- **Arrastrar una figura (celular):** la baldosa se levanta (escala 1,04, sombra 3, borde pino), sigue
  al dedo, y la hoja baja a solo el título para dejar ver el dibujo.
- **Unir dos pasos:** la flecha se dibuja desde el borde hasta la punta (150 ms); si sale de una
  decisión, la pastilla «Sí» o «No» aparece con fundido sobre ella.
- **Elegir otro paso:** el naranja pasa al nuevo y los campos del panel cambian con fundido de 120 ms;
  sus flechas se tiñen de naranja.
- **Guardado:** «Guardando…» se funde a «Guardado» con el tilde que se dibuja; no se mueve nada más.
- **Aviso de forma:** la insignia ámbar entra con rebote; al pasar el mouse, el globo sale desde la
  insignia (120 ms).
- **El recorrido escrito (compu 2):** al apretar Enter el renglón nuevo entra desde 8 px abajo; en el
  dibujo chico, el paso nuevo aparece con fundido y los demás se corren a su lugar (200 ms).
- **Propuesta de pasos (compu 3):** mientras se escribe, las palabras reconocidas se marcan; los
  pasos propuestos aparecen punteados con fundido; al aceptar, el trazo se vuelve continuo y el borde
  queda verde 1 s.
- **Recorrerlo (compu 3):** una bolita naranja recorre las flechas de paso en paso, y cada paso se
  ilumina 400 ms al pasar.
- **Versiones (compu 3):** al arrastrar la perilla, el dibujo cambia con fundido cruzado a esa versión
  y lo que cambió parpadea en ámbar una vez.
- **Arrastrar en la línea (celu 2):** la tarjeta se levanta (rotación de 2°, sombra 3); la línea le abre
  un hueco punteado naranja y las tarjetas de abajo bajan 50 px (200 ms). Al soltar, vibra 10 ms.
- **¿Y después? (celu 3):** elegir una opción hace que la tarjeta actual suba y quede como la «de
  atrás», y entre la nueva desde abajo (320 ms); la barra de avance suma un tramo.
- **Marcar vigente:** el tilde se dibuja, vibración doble, la pastilla pasa de «Borrador» ámbar a
  «Vigente» verde con fundido.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: con las figuras abiertas y el panel a la derecha, el dibujo se cortaba en la mitad. Ahora
  las figuras arrancan plegadas (como pide la especificación), el proceso entra entero y el nombre
  de cada figura aparece en un globo con su tecla. El título se partía en dos renglones; «Guardado»
  pasó a la miga. Los botoncitos del paso tapaban la flecha que vuelve; los subí entre la flecha y
  el paso. El panel del paso se salía por abajo; lo achiqué.
- Compu 2: la lista no entraba con el pie de teclas; achiqué los renglones a 36 px. El dibujo chico
  quedaba en 12 px; reacomodé las columnas para que los números queden en 14.
- Compu 3: la barra de arriba se aplastaba (chocaba con una clase común); los «No» quedaban tapados
  por los pasos; el rótulo de la decisión nueva se pisaba con su flecha. Corregido. El panel
  quedaba vacío abajo: sumé «Le falta, según otros procesos».
- Celu 1: el dibujo quedaba en 270 px de alto; achiqué la hoja y centré el paso elegido. Las pastillas
  «Sí» se pisaban con el nombre del carril.
- Celu 3: sobraba un hueco; sumé «Así va», el dibujo chico con el paso actual.
- Lo más flojo que queda: en la computadora, con el panel del paso abierto, un proceso de más de 12
  pasos ya no entra a 100 %, y alejarlo baja los textos de 14 px; el mapa ayuda, pero ahí la 2
  (lista con dibujo chico) se defiende mejor. En el celular, el dibujo en «Diagrama» se ve en una
  ventana chica: con el menú de abajo, la hoja y la cabecera, quedan unos 300 px. En el celu 2,
  los tres íconos de carril de arriba se tocan; habría que darles un poco más de aire.

## Catálogo de ideas

Cada una se puede tomar o descartar sola. «Toques» = lo que ahorra en la tarea más frecuente:
agregar un paso después del elegido y completarle quién lo hace y dónde se hace (hoy, en la
computadora, unos 6: arrastrar la figura, soltarla, unirla, escribir el nombre, elegir quién y
elegir la pantalla).

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Lateral de la aplicación plegado a íconos dentro de Procesos | El dibujo necesita todo el ancho | C1, C2, C3 (sin lateral) | Figma, Linear | — | **Sí** (marco) |
| 2 | Paso elegido en naranja con halo y sus flechas teñidas | Ver de un vistazo qué paso se está cambiando y con qué se une | C1, celu 1 | Figma (selección) | — | No |
| 3 | Insignia ámbar sobre el paso con error de forma, y en la barra «1 paso con aviso» | Encontrar lo que falta sin recorrer el dibujo | C1, C2, celu 2 | Xcode, Figma (avisos) | 1–2 | No (E14) |
| 4 | Mapa chico abajo a la izquierda con la parte visible marcada | Saber dónde se está en un proceso grande | C1 | Figma, Miro | 1 | **Sí** |
| 5 | Botoncitos junto al paso elegido: agregar tarea, unir, cambiar tipo, quitar | Agregar el siguiente sin ir a las figuras | C1, celu 1 | bpmn.io, Miro | 2 | No (E13) |
| 6 | Barra «Los pasos, en orden» con el resumen (pasos, carriles, decisiones, avisos) | Saber el tamaño del proceso sin abrir la tabla | C1, C2 | Linear (pie de lista) | 1 | No |
| 7 | Figuras plegadas con su nombre y su tecla en un globo | Aprender las figuras sin ocupar lugar | C1 | Photoshop, Figma | — | No (E03) |
| 8 | Figuras en cuatro grupos (empieza y termina, lo que se hace, el camino, lo demás) | Encontrar la figura sin leer las doce | C1 | Keynote (formas) | — | **Sí** |
| 9 | «Dónde, en Ferrebress» como pastilla pino con el ícono de la parte | Reconocer la pantalla sin leer | C1, C2, celu 3 | Notion (menciones) | — | No |
| 10 | «Con qué sigue» como enlace que lleva al paso siguiente | Recorrer el proceso desde el panel | C1 | Linear (relaciones) | 1 | No |
| 11 | El recorrido como lista que se escribe: Enter paso nuevo, Tab a la rama, «/» tipo, «@» quién | Dibujar sin mouse, como se cuenta | C2 | Notion, Workflowy | 3–4 | **Sí** |
| 12 | El dibujo se arma solo a partir de la lista (orden y carriles) | No acomodar cajas a mano | C2 | Mermaid, Whimsical | 2 | **Sí** |
| 13 | Ramas de una decisión con su pastilla «Sí»/«No» y «vuelve al 3» como enlace | Leer las decisiones en una lista | C2, celu 2 | Notion (toggles) | — | No (E26) |
| 14 | Dibujo chico numerado con el mismo número que la lista | Relacionar lista y dibujo de un vistazo | C2 | Apple Mapas (pasos numerados) | — | **Sí** |
| 15 | «Fuera del recorrido» con «Ponerlo después del 8» | Arreglar el paso suelto en un toque | C2 | Linear (sugerencia de arreglo) | 2 | **Sí** |
| 16 | Versiones en una línea de tiempo con vigente en verde y borrador punteado | Ver el historial sin abrir un menú | C2 | GitHub (historial), Figma | 2 | No (E22–E23) |
| 17 | Recorrido y Dibujo como dos vistas del mismo proceso | Que cada uno trabaje como piensa | C2 | Notion (vistas) | — | **Sí** |
| 18 | Dibujo a pantalla completa con barras flotantes | Máximo lugar para dibujar | C3 | Figma, tldraw | — | **Sí** (marco) |
| 19 | Contar o dictar el proceso y que se dibuje solo | Dibujar sin conocer BPMN | C3, celu 3 | Asistentes de IA, Whimsical AI | ~5 por paso | **Sí** |
| 20 | Pasos propuestos punteados en naranja, que se aceptan con Enter | Ver qué va a cambiar antes de aceptar | C3 | GitHub Copilot (sugerencias en gris) | — | **Sí** |
| 21 | «Le falta, según otros procesos»: preguntas que completan el proceso | Pensar en los casos que se olvidan | C3 | Grammarly | — | **Sí** |
| 22 | Quién más está mirando el borrador (caras arriba) | Evitar pisarse (E41) antes de que pase | C3 | Google Docs, Figma | — | **Sí** (aclara E41) |
| 23 | Versiones como regla que se arrastra | Comparar cómo era antes sin abrir nada | C3 | Time Machine | 2 | **Sí** |
| 24 | «Recorrerlo»: una bolita que pasa por cada paso | Explicar el proceso a alguien nuevo | C3 | Simuladores BPMN | — | **Sí** |
| 25 | Nombre del carril pegado al borde izquierdo mientras se mueve el dibujo | No perder de quién es cada paso en el celular | celu 1 | Excel (fijar paneles) | — | **Sí** |
| 26 | Acercar, alejar y ver todo en una columna arriba a la derecha | Zoom a una mano, sin pellizcar | celu 1 | Apple Mapas | — | No (E30) |
| 27 | La figura que se arrastra se levanta y la hoja baja | Ver dónde se suelta | celu 1 | iOS (arrastrar) | — | No |
| 28 | «Pasos» como línea de subte: un riel por carril | Ver quién hace cada paso en una lista angosta | celu 2 | GitKraken (grafo), mapas de subte | — | **Sí** |
| 29 | Hueco punteado naranja «Soltalo acá, después de Cobra» | Saber dónde cae antes de soltar | celu 2 | Trello | — | No (E27) |
| 30 | Las decisiones como tarjetas punteadas, distintas a los pasos | Separar preguntar de hacer | celu 2 | — | — | No |
| 31 | «Marcar vigente» fijo abajo mientras hay borrador | La acción principal a mano | celu 2 | Shopify (guardar cambios) | 1 | No |
| 32 | Un paso por pantalla, grande, que se desliza | Leer y revisar con una mano, con guantes | celu 3 | Instagram (historias) | — | **Sí** |
| 33 | «¿Y después?» con lo que sigue hoy, pregunta, espera y fin | Armar el proceso contestando, sin dibujar | celu 3 | Typeform | 3 | **Sí** |
| 34 | Barra de avance por pasos arriba | Saber dónde se está en el proceso | celu 3 | Historias | — | **Sí** |
| 35 | El paso anterior asomando arriba de la tarjeta | No perder el hilo | celu 3 | Apple Wallet (tarjetas apiladas) | — | **Sí** |
| 36 | «Así va»: el dibujo chico con el paso actual marcado | Ubicarse en el dibujo sin dejar el modo | celu 3 | Apple Mapas (vista general) | 1 | **Sí** |

Toques de la tarea frecuente (agregar el paso siguiente con quién y dónde): hoy ~6; C1 ~4 (botoncito
«tarea», nombre; quién se deduce del carril); C2 ~1 (Enter, escribir «Cobra @vendedor»); C3 ~1
(escribir o dictar una frase y Enter); celu 1 ~4; celu 3 ~2 (tocar lo que sigue o dictarlo).
