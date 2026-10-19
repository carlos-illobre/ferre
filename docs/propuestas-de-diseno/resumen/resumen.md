# Negocio → Resumen («Cómo va el negocio»): seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/` y `../../_extra/iconos-extra.js`, con los 20
íconos Lucide que faltaban: tendencias, ojo tachado, escudo, reloj de arena, etc.). Todas
muestran los mismos datos, que cierran entre sí:

- **Hoy (lunes 19/10, 19:12):** $412.000 en 23 ventas, ganancia $151.400 (37 %), ticket $17.913;
  el lunes 12 a la misma hora, $356.000 en 20 ventas. Efectivo $186.000 · MP $121.000 · tarjeta
  $68.000 · cuenta corriente $37.000. Caja cerrada 19:05: contado $184.000, esperado $186.000.
- **7 días:** $2.316.000 en 131 ventas (+8 %). **Octubre al 19:** $7.684.000 (+8 %).
- **Gastos de la semana:** $1.284.000 en 8 compras (Bulonera Centro $512.000 primero).
- **Dinero invertido:** $23.480.000. **Sin rotar 90 días:** $312.000 en 17 productos.
- **Septiembre:** vendido $11.640.000, costo $7.330.000, bruta $4.310.000, gastos $2.950.000
  (alquiler, sueldos, servicios, impuestos), resultado +$1.360.000. Piso: $306.000 por día.

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Tablero por secciones** (evolución) | Lo aprobado en 013 (submenú de secciones, cada una con su permiso) llevado al nivel de las referencias: en Ventas, los cuatro números con su comparación en una pastilla, lo vendido por hora contra el mismo día de la semana pasada, cómo pagaron con los colores de cada medio, lo más vendido, lo que no llevaron y el cierre de caja. | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| **2 · El día contado** (reinvención) | Sin secciones ni selector de período: arriba una frase que cuenta el día, con lo que pide atención resaltado y en pastillas que llevan a su detalle; abajo, hoy, 7 días y el mes a la vez, la semana en barras con la ganancia adentro, lo que más sale, el dinero parado y las tarjetas de dinero (gastos, invertido, resultado). «Ver como» un rol y un navegador de días ‹ › que convierte el tablero en las Novedades de cualquier día. | 2, 5, 10, 11, 12, 13, 14, 15, 16, 17 |
| **3 · La cuenta del mes** (audaz) | Rompe el marco (sin lateral, barra arriba con «Ir a… Ctrl K»): la pantalla responde una sola pregunta, «¿cuánto me quedó?», con una cascada de vendido a resultado, los 12 meses como selector y gráfico a la vez, el piso por día como una regla, y al costado la matriz «Quién ve cada número» para cambiar permisos sobre el dato mismo. | 18, 19, 20, 21, 22, 23, 24 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Tablero** (evolución) | Secciones como cuatro botones con ícono, Hoy/Semana/Mes con las fechas que compara, «Vendido hoy» en 48 px con su comparación y las horas en barras, y cuatro números en grilla (la caja en ámbar porque falta plata); lo demás, desplazando. | 1, 2, 3, 4, 5, 7, 9 |
| **2 · Deslizá el período** (reinvención) | Una tarjeta grande por período que se desliza (Hoy → 7 días → Mes, como el Clima), con la curva acumulada contra el lunes pasado, y debajo «Lo que pasó hoy»: las novedades en el molde de renglón, primero lo que pide atención. | 2, 5, 13, 25, 26, 27 |
| **3 · Tu negocio te cuenta** (audaz) | Rompe el marco (sin pestañas ni menú de abajo): el resumen es una conversación; el negocio escribe a las 19:10 lo que pasó, avisa lo que hay que mirar con su acción, y se le pregunta «¿Y la semana?» con botones rápidos o por voz. Es el mismo mensaje que llega a la hora de cierre (RF-63). | 10, 12, 28, 29, 30, 31 |

**Qué rompen las audaces.** Compu 3 saca el lateral y las pestañas de Negocio, cambia el
tablero por una sola respuesta (el resultado) y mete la administración de permisos en la
pantalla de datos. Celu 3 saca el marco entero y la navegación por secciones: se pregunta.

## Cuál me gusta más

**Computadora: la 2, con el submenú de la 1 escondido detrás de «Ver como».** La spec dice
«abrir y leer, sin tocar nada»; la 2 es la única donde se lee el día entero sin elegir
sección ni período (hoy, semana y mes a la vez), y la frase de arriba responde la pregunta de
Carlos antes de mirar un número. Lo que la 1 hace bien (cada sección con su permiso) no se
pierde: cada tarjeta de la 2 es de una sola sección, y la que el rol no puede ver no aparece.
«Ver como» resuelve algo que hoy nadie puede hacer: comprobar qué ve un Vendedor antes de
darle el rol.

**Celular: la 2.** Es la que mejor cumple «el Administrador mira a distancia, desde el
celular»: el número del día arriba, deslizar para la semana (un gesto en lugar de un
segmento chico) y las novedades ordenadas por urgencia. De la 3 tomaría el mensaje de las
19:10: que la notificación diaria abra justo esta pantalla.

## Cómo se mueve (una línea por interacción)

- **Abrir:** las tarjetas aparecen de arriba abajo con 40 ms de diferencia (fundido + 8 px);
  los números grandes cuentan desde el valor anterior guardado, no desde 0 (300 ms).
- **Cambiar de período (compu 1, celu 1):** el segmento se desliza (200 ms); los números
  ruedan sus dígitos hacia arriba o abajo; las barras crecen o se encogen desde su base, la
  sombra del período anterior se funde y reaparece. No se pierde el lugar.
- **Deslizar la tarjeta (celu 2):** sigue al dedo, encaja con resorte suave; el punto del
  indicador se estira hacia el nuevo; vibra 10 ms al encajar.
- **Tocar un número:** la tarjeta se levanta (sombra 1 → 3) y se abre como hoja (celu) o
  panel lateral (compu) con la cuenta: cada término entra uno tras otro, como sumando.
- **Llega una venta con la pantalla abierta:** el total rueda, la barra de la hora sube con
  rebote corto y su borde se pinta de verde 1 s. Sin vibrar: es información, no aviso.
- **Caja con diferencia:** la tarjeta ámbar entra una vez con un leve pulso de escala
  (1 → 1,02 → 1); nunca parpadea ni vibra (la diferencia es un dato, no una acusación).
- **Ver como (compu 2) / pasar el mouse por un rol (compu 3):** lo que ese rol no ve baja a
  15 % de opacidad con un candado al centro (200 ms); lo que sí ve no se mueve.
- **Cascada (compu 3):** al elegir otro mes, las barras caen en orden de izquierda a
  derecha como fichas (40 ms cada una) y el título cambia con fundido.
- **Conversación (celu 3):** cada mensaje entra desde abajo con los tres puntos de
  «escribiendo» 400 ms antes; los botones rápidos se reacomodan con lo que tenga sentido
  preguntar después.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: las pastillas de comparación se partían en dos renglones y los medios de pago se
  salían de la tarjeta (`.tarjeta` y `.cuenta` del común pisaban mis clases); comparación más
  corta y medios en una línea. La etiqueta de la hora pico tapaba la leyenda.
- Compu 2: la tercera columna se salía por la derecha y los nombres de productos se cortaban
  con el importe al lado; ahora el importe va en la línea del detalle. Barras de la semana
  más altas para que no quede un hueco.
- Compu 3: el título se partía y la pastilla quedaba cortada; el marcador del piso salía como
  un bloque negro (la clase `.marca` del común). Ahora una línea fina.
- Celu 1: la ganancia se partía en tres renglones; ahora el 37 % va en la etiqueta.
- Celu 2: la tarjeta grande se aplastaba (flex) y tapaba su propio pie; textos del feed más
  cortos para que cada novedad entre en dos líneas.
- Celu 3: «Para mirar» quedaba pegado al texto; los íconos de la cabecera estaban corridos.
- **Lo más flojo que queda:** en compu 1 la fila de abajo está apretada y «Lo más vendido»
  muestra solo dos; en compu 3 los gastos chicos (servicios, impuestos) son rayas casi
  invisibles en la cascada (escala real; con un corte en el eje se leerían mejor); en celu 3
  el último botón rápido queda cortado. Las fotos siguen siendo de banco, con luces distintas.
- **Dependen de aclaraciones abiertas:** qué es «la semana» (usé 7 días móviles) y contra qué
  se compara (usé el mismo día de la semana anterior hasta la misma hora); cómo se ordena lo
  más vendido (usé dinero); el piso por día (usé el margen del mes y 26 días).

## Catálogo de ideas

«Toques» = lo que ahorra en la tarea más frecuente: el Administrador abre Negocio para ver
cómo va el día, la semana y si la caja cerró bien (hoy, con el submenú de 013: ~4 toques:
Ventas, cambiar período dos veces, ir a Compras).

| # | Idea | Problema que resuelve | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Secciones como segmentos con ícono (Ventas · Compras · Inventario · Resultado) dentro de la pestaña Resumen | Lo de 013 en el marco nuevo, sin un tercer nivel de pestañas subrayadas | C1, celu 1 | Apple Fotos (segmentos) | 0 | No (Resultado sí: sección nueva) |
| 2 | Comparación como pastilla verde/roja con flecha + «+$56.000 · lun 12: $356.000» | La comparación se lee sin cuenta y no solo por color | todas | Stripe Dashboard | — | No |
| 3 | El período dice qué compara: «Lunes 19/10 hasta las 19:12 contra el lunes 12/10 a la misma hora» | Comparar un día a medias con uno entero engaña | C1, celu 1 | Shopify Analytics | — | No (fija una aclaración de RF-60) |
| 4 | Vendido por hora, con el día anterior como sombra punteada y la siesta marcada «Cerrado» | Ver si el día va mejor o peor a esta altura, no solo al final | C1, celu 1 | Square Dashboard | — | **Sí** |
| 5 | Cómo pagaron: barra apilada con los colores de cada medio (decisión 108) y su importe | Ver de un vistazo cuánto entró en efectivo | C1, C2, celu 1 | Apple Wallet | — | No (RF-63) |
| 6 | Lo más vendido con foto y posición, ordenado por dinero | Reconocer el producto sin leer | C1, C2 | Shopify (top products) | — | No |
| 7 | Cierre de caja en el tablero, en ámbar si hay diferencia, con contado/esperado | Enterarse sin abrir Novedades | C1, celu 1, celu 2, celu 3 | Square (cash drawer) | 1 | No (RF-63) |
| 8 | «No llevaron» con cuántas veces lo pidieron | Qué conviene comprar | C1 | Apple Recordatorios | — | No (013) |
| 9 | «Actualizado 19:12» + Actualizar con F5 | Saber si el número es de ahora | C1, celu 1 | Gmail | — | No |
| 10 | Frase que cuenta el día con los números en negrita y lo urgente resaltado | Entender cómo va sin interpretar gráficos | C2, celu 3 | Apple Salud (resúmenes), Stripe | 1–2 | **Sí** |
| 11 | Pastillas «Para mirar» (caja, stock bajo, pedidos, listas) que llevan a su detalle | Los pendientes de RF-60 punto 8 en una fila | C2 | Linear (inbox) | 1 por pendiente | No |
| 12 | Anillo «135 % del piso»: lo vendido hoy contra el punto de equilibrio diario | Saber si el día ya pagó los gastos | C2 (y regla en C3) | Apple Actividad (anillos) | — | **Sí** (usa RF-64) |
| 13 | Hoy, 7 días y el mes a la vez, sin selector | Cero toques para los tres períodos | C2, celu 2 (deslizando) | Robinhood, Clima | 2 | No |
| 14 | Barras de la semana con la ganancia adentro y la semana anterior como raya | Vendido y ganancia en un solo gráfico | C2 | Stripe | — | **Sí** |
| 15 | «$312.000 parados»: lo que no rota como un número de dinero | Dinero parado se entiende mejor que una lista | C2 | Shopify (inventory insights) | 1 | No (RF-61) |
| 16 | «Ver como» un rol: la pantalla muestra solo lo que ese rol vería | Probar los permisos antes de dárselos a alguien | C2, C3 | Facebook «Ver como», Figma | — | **Sí** |
| 17 | Navegador de días ‹ Hoy › : el tablero de un día pasado son sus Novedades | Novedades y tablero en una sola pantalla | C2, celu 3 (calendario) | Apple Salud | 2 | No (RF-63, días anteriores) |
| 18 | Barra superior con migas e «Ir a… o preguntá algo · Ctrl K» en lugar del lateral | Ancho para el dato; navegar sin mouse | C3 | Linear, Raycast | 1–2 | **Sí** (marco) |
| 19 | Los 12 meses como selector y gráfico a la vez, en contra en rojo y hacia abajo | Comparar meses y elegir uno con el mismo gesto | C3 | Apple Salud (tendencias) | 1 | No (RF-64) |
| 20 | Título que es la respuesta: «En septiembre te quedaron +$1.360.000» | El dato principal dicho en palabras, con signo | C3 | Apple Wallet (resumen) | — | No |
| 21 | Cascada de vendido → costo → ganancia bruta → cada gasto → resultado | «De dónde sale» del resultado sin abrir nada | C3 | Stripe (balance), finanzas | 1 | No (RF-64 escenario 4) |
| 22 | Regla del piso por día con el promedio del mes encima | Cuánto falta o sobra para cubrir gastos | C3 | Termómetros de recaudación | 1 | No (RF-64) |
| 23 | Matriz «Quién ve cada número»: roles × bloques, se cambia tocando un ojo | Dar permisos mirando el dato que se oculta | C3 | Notion (compartir), Google Drive | 3–4 (ir a Usuarios → Roles) | **Sí** |
| 24 | Permiso propio para la ganancia y el costo, separado de «Ver las ventas del negocio» | El vendedor ve cuánto se vendió sin ver cuánto se gana | C3 | Shopify (permisos de staff) | — | **Sí** (cambia 013) |
| 25 | Una tarjeta por período que se desliza, con puntos de página | Cambiar de período con el pulgar | celu 2 | Clima de iPhone | 1 por cambio | **Sí** |
| 26 | Curva acumulada del día contra el lunes pasado punteado | Saber si a esta hora vamos mejor | celu 2 | Robinhood | — | **Sí** |
| 27 | «Lo que pasó hoy»: novedades en el molde de renglón, primero lo urgente | Novedades sin abrir otra pantalla | celu 2 | Apple Fotos (Recuerdos), Linear | 1 | No (RF-63) |
| 28 | El resumen como conversación del negocio, con el mensaje diario | La app y el mensaje de las 19:10 son lo mismo | celu 3 | WhatsApp Business, Slack bots | 2 | **Sí** |
| 29 | Aviso con su acción en el mismo globo («Ver las 11 ventas», «Ya lo sé») | Resolver o descartar sin buscar | celu 3 | Gmail (acciones en notificación) | 1–2 | **Sí** |
| 30 | Preguntas rápidas que cambian según lo último que se vio | Descubrir qué más se puede saber | celu 3 | Google Assistant | 1 | **Sí** |
| 31 | Preguntar por voz o texto («¿cuánto vendí de mechas en septiembre?») | Lo que no está en ningún tablero | celu 3, C3 | Siri, Shopify Sidekick | varios | **Sí** |

Toques de la tarea frecuente: hoy ~4; compu 1 y celu 1 ~3; compu 2 **0** (todo a la vista);
celu 2 **2** (deslizar dos veces); celu 3 **0–1** (el mensaje ya trae el día; una pregunta
para la semana).
