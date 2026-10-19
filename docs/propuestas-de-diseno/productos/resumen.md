# Catálogo → Productos, con la ficha del producto: seis maquetas para Carlos

Capturas lado a lado: `comparacion-compu.png` y `comparacion-celu.png`. Cada maqueta se abre
sola desde su `index.html` (usa `../../../_comun/`, más `../../iconos-extra.js` con 20 íconos
Lucide que faltaban y `../../ean.js`, que dibuja un código EAN-13 de verdad). Todas muestran el
mismo producto para comparar igual con igual: **Cinta métrica PowerLock 5 m**, Stanley, 6 un.,
costo $9.350,85 de Distribuidora Oeste (el más barato; también la venden Bulonera Centro a $9.980
y Ferretera del Sur a $10.420), margen 50 %, IVA 21 % → $16.971,79 → **se cobra $17.000**. Venía
de $16.000 con costo $8.400 antes de la lista del 06/10. Todos los precios de la planilla cierran
con la regla (lo comprueba `herramientas/planilla.py`).

## Computadora

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Lista y ficha lado a lado** (evolución) | La lista a la izquierda y la ficha siempre abierta a la derecha (↑ ↓ cambia de producto sin abrir ni cerrar nada), con la foto, el stock, el precio y los márgenes arriba; el código con copiar y escanear; el proveedor en uso con los otros a la vista; «Así se calcula», el historial y el archivo; «Agregar a la venta» fijo abajo. | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| **2 · La bandeja** (reinvención) | El Catálogo como una bandeja de trabajo: arriba las colas (para remarcar, sin precio, costo viejo, sin código); a la izquierda los productos de la cola con el precio viejo tachado y el nuevo; a la derecha la ficha dice por qué está ahí, muestra el gráfico de cómo cambió y se resuelve con una tecla («Remarcado, siguiente»). | 3, 5, 11, 12, 13, 14, 15, 16, 17 |
| **3 · La planilla de proveedores** (audaz) | Rompe el marco: sin lateral, barra pino arriba con Ctrl K y la venta en curso; una planilla con una columna por proveedor (el en uso encuadrado, el más barato en verde, «más barato» en ámbar si no se usa), margen y precio en la misma fila; la ficha es una vista rápida que flota con Espacio. | 5, 18, 19, 20, 21, 22, 23, 24 |

## Celular

| | Idea en una frase | Ideas del catálogo |
|---|---|---|
| **1 · Lista y ficha** (evolución) | La lista aprobada con los avisos arriba («28 sin precio», «46 para remarcar») y «Lleva 2» en lo ya agregado; la ficha con la foto, el stock, el nombre y **el precio sin bajar**, después el código, el proveedor y «Listo» / «Agregar a la venta» fijos. | 2, 4, 6, 25, 26, 27 |
| **2 · Apuntá y sabé** (reinvención) | El Catálogo abre en la cámara en modo «Consultar»: se apunta a cualquier producto y sube una hoja que contesta las tres preguntas del mostrador (cuánto sale, si hay, dónde está) con «Agregar a la venta» a un toque; las consultas anteriores quedan abajo. | 28, 29, 30, 31, 32 |
| **3 · La etiqueta de dos caras** (audaz) | Rompe el marco: sin menú ni pestañas, cada resultado es una etiqueta de góndola enorme que se le muestra al cliente (precio de 84 px, hay, código); se desliza para el siguiente y, con dos toques, se da vuelta: del otro lado, en pino, lo que el cliente no ve (cuenta, márgenes, proveedores, historial, lista, código). | 33, 34, 35, 36, 37, 38 |

**Qué rompen las audaces.** Computadora: saca el lateral (barra arriba con Ctrl K), cambia la lista
por una planilla densa y la ficha por un panel flotante. Celular: saca el menú de abajo y las
pestañas, cambia la lista por un mazo de tarjetas y usa una tarjeta pino entera (un panel oscuro,
que el lenguaje común reserva para la cámara) para el dorso: el color dice «esto es privado».

## Cuál me gusta más

**Computadora: la 1 de base, con las colas y el «Está acá porque…» de la 2.** La 1 cumple las
dos especificaciones de una vez y saca el paso de abrir y cerrar la ficha: con la ficha siempre al
lado, ↑ ↓ recorre productos viendo todo. Pero la pregunta real después de cargar una lista es
«¿qué tengo que tocar?», y la 2 la contesta: las colas arriba de la lista (como filtros que ya
dicen cuántos) y la franja que explica por qué ese producto pide atención valen en cualquier
diseño. La planilla de la 3 la dejaría como una vista más para el Comprador: es la única que
compara proveedores de muchos productos a la vez.

**Celular: la 1, con el modo «Consultar» de la 2 detrás del botón de escanear.** La 1 es lo
aprobado, se lee de un vistazo y sube el precio arriba sin cambiar ninguna regla. El botón oscuro
del buscador, en vez de solo buscar, debería abrir la cámara de la 2: apuntar y tener precio, stock
y estante en una hoja es la forma natural de contestar «¿cuánto sale esto?» con el producto en la
mano. La etiqueta de la 3 es la más linda y la idea de «dar vuelta para ver el costo» (que el
cliente nunca vea el costo aunque mire la pantalla) merece quedar aunque no se tome el resto.

## Cómo se mueve (una línea por interacción)

- **Elegir otro producto (compu 1):** la ficha no se cierra: la foto hace un fundido cruzado de
  120 ms y los números ruedan al nuevo valor; la fila elegida desliza su raya pino.
- **Abrir la ficha (celu 1):** entra desde la derecha como en iPhone (320 ms); la foto de la
  lista viaja y crece hasta el lugar grande (transición compartida), el menú de abajo no se mueve.
- **Elegir un margen:** el segmento blanco se desliza al nuevo lugar (200 ms), el precio rueda
  sus dígitos hacia arriba o hacia abajo y la línea «Se cobra» se pinta de verde 1 s.
- **Copiar el código:** el ícono se vuelve tilde 1,2 s y sube la tostada «Código copiado»; en el
  celular vibra 10 ms.
- **Escanear el código en la ficha:** la caja del código se ilumina en verde al llegar el número,
  los dígitos entran de izquierda a derecha y aparece «Código actualizado · 13/10/2026 · 10:24».
- **Agregar a la venta:** el botón baja a 97 %, una miniatura de la foto vuela hacia Vender
  (lateral o menú) y la insignia salta con rebote; en la lista, «Agregar» pasa a «Lleva 2».
- **Remarcado, siguiente (compu 2):** el producto se tacha y se apaga en la bandeja (200 ms), la
  barra de avance crece, y el siguiente entra en la ficha desde 8 px abajo.
- **Usar otro proveedor (compu 3):** el recuadro pino salta de celda a la elegida y el precio de
  la fila rueda; la vista rápida acompaña el cambio.
- **Vista rápida (compu 3):** con Espacio crece desde la fila elegida (escala 0,96 → 1, 200 ms)
  y se va igual; ↑ ↓ la mantiene abierta y cambia el contenido.
- **Apuntar (celu 2):** el marco se cierra sobre el código y se pone verde, vibra 10 ms y la hoja
  sube con los números ya puestos; apuntar a otro reemplaza la hoja sin bajarla.
- **Deslizar etiquetas (celu 3):** la de arriba sigue al dedo con un leve giro, la de atrás
  crece a su lugar; los puntos de abajo avanzan.
- **Dar vuelta (celu 3):** giro 3D de 320 ms sobre el eje vertical; vuelve sola al frente al
  bloquear la pantalla o a los 30 s sin tocarla.

## Autocrítica (lo que corregí antes de mostrar)

- Compu 1: la ficha se salía por la derecha y lo de abajo quedaba cortado; la foto y el código
  ocupaban demasiado. Achiqué la foto a 120 px, puse «Última lectura» dentro de la caja del código
  y copiar como botón de ícono. La lista era de cintas sin foto (íconos grises, se veía pobre):
  ahora es «lo que más se vende», todo con foto.
- Compu 2: con el lateral abierto no entraba nada (el precio tapaba el gráfico). Plegué el lateral
  a íconos, llevé los márgenes a «Así se calcula» y el código a la línea del nombre.
- Compu 3: el recuadro del proveedor en uso ocupaba toda la celda y se veía como un campo; ahora
  abraza el número. La celda del producto rompía las rayas de la tabla.
- Celu 1: una tostada tapaba al proveedor; la saqué de la maqueta (queda en «Cómo se mueve»).
- Celu 2: el botón principal heredaba un estilo y se partía; los modos de la cámara no entraban.
- Celu 3: el dorso se cortaba abajo; compacté la cuenta y los márgenes.
- Lo más flojo que queda: en la compu 1 y 2 la ficha está justa de alto y el historial es una
  línea chica; en la cámara del celular 2 la etiqueta del código está pegada sobre la foto (en la
  realidad es la cámara); la vista rápida de la compu 3 tapa el margen y el precio de la fila
  elegida (los repite ella, pero se pierde el contexto).

## Catálogo de ideas

«Toques» = lo que ahorra en la tarea más frecuente: **saber cuánto sale, si hay y agregarlo a la
venta** (hoy, en el celular: tocar el buscador, escribir, tocar el producto para la ficha, bajar para
ver el precio, «Agregar a la venta» ≈ 5 toques y un desplazamiento).

| # | Idea | Problema de la persona | Variantes | Patrón de | Ahorra | ¿Fuera de la spec? |
|---|---|---|---|---|---|---|
| 1 | Ficha siempre abierta al lado de la lista; ↑ ↓ cambia de producto | Abrir y cerrar la ficha para comparar dos productos | C1 | Mail de Mac, Linear (panel de detalle) | 2 por producto | No |
| 2 | Precio de venta y margen arriba, junto al nombre, sin bajar | En la ficha aprobada el precio queda abajo (SC-001 lo aceptó) | C1, celu 1 | Shopify (producto) | 1 desplazamiento | Cambia la maqueta aprobada |
| 3 | Márgenes como segmentos al lado del precio, con Mayús 1–5 | Elegir el margen sin buscar dónde | C1, C2 | Linear (estado en el detalle) | 0 | No |
| 4 | Código con copiar adentro, «Escanear» oscuro al lado y la última lectura en la misma caja | Saber que el código quedó bien sin volver a escanear | C1, celu 1 | Stripe (ID con copiar) | — | No |
| 5 | Costo de cada proveedor a la vista, el en uso marcado y «Usar» en los otros | Ver quién es más barato sin desplegar | C1, C2, C3 | Comparadores de precios | 1 | No (RF-06 con flecha; acá abierto) |
| 6 | «28 sin precio» y «46 para remarcar» como pastillas arriba de la lista | Saber que hay trabajo pendiente sin ir a buscarlo | C1, celu 1 | Referencias de Carlos (resumen arriba) | — | Sí (adelanta RF-15) |
| 7 | Historial chico: «+18 % desde junio» con una línea | Saber si el precio viene subiendo sin abrir el historial | C1 | Robinhood, Apple Bolsa | 1 | No (RF-14) |
| 8 | Archivo de origen en una fila con descargar | Saber qué se baja antes de bajarlo | C1, C2, celu 3 | Google Drive | — | No |
| 9 | Pie de la ficha con las teclas: Esc, ↑ ↓, «+» | Descubrir los atajos | C1, C2 | Superhuman | — | No |
| 10 | Insignia de Vender con los renglones de la venta | Saber que lo agregado está | C1, C2, celu 1 | iOS (insignia) | — | No (E24) |
| 11 | Colas arriba: Para remarcar · Sin precio · Costo viejo · Sin código · Todos | Después de una lista, saber qué atender y cuánto falta | C2 | Linear (bandeja), Gmail (pestañas) | 2–3 por producto | Sí |
| 12 | Avance de la cola («18 de 46») con barra | Saber cuánto falta para terminar de remarcar | C2 | Duolingo, Linear | — | Sí |
| 13 | Franja «Está acá porque…» con la lista, el % y el precio viejo → nuevo | No entender por qué un producto pide atención | C2 | GitHub (por qué te notificó) | — | Sí |
| 14 | Precio viejo tachado → precio nuevo, en la bandeja y en la ficha | Remarcar la góndola sin calcular | C2 | Tiendas (precio tachado) | — | No (RF-15) |
| 15 | «Remarcado, siguiente» con una tecla (E) | Recorrer 46 productos sin mouse | C2 | Superhuman (archivar y seguir) | 2 por producto | Sí |
| 16 | Gráfico «Cómo cambió»: precio, costo en uso y otro proveedor | Ver la evolución y si otro proveedor se acerca | C2 | Apple Bolsa | 1 | No (RF-14) |
| 17 | Costo de los proveedores como barras | Comparar de un vistazo, sin leer números | C2 | Gráficos de Stripe | — | No |
| 18 | Planilla con una columna por proveedor | Comparar proveedores de muchos productos a la vez | C3 | Excel, Airtable | muchos | Sí |
| 19 | «Más barato» en ámbar cuando el barato no es el en uso | Encontrar dónde se está pagando de más | C3 | Linear (aviso en la celda) | — | No (RF-06) |
| 20 | Filtro «Proveedor más barato sin usar (37)» | Revisar todos los casos de una vez | C3 | Airtable (vistas) | — | Sí |
| 21 | ← → recorre proveedores, U usa el elegido | Cambiar de proveedor sin mouse | C3 | Excel | 2 | No |
| 22 | Vista rápida con Espacio | Mirar la ficha sin perder el lugar en la planilla | C3 | Quick Look de Mac | 2 | Sí |
| 23 | Barra superior con Ctrl K y la venta en curso («Venta: 3 · $45.500») | Ir a cualquier lado y ver la venta sin cambiar de parte | C3 | Linear, Shopify POS | 1–2 | Sí (marco) |
| 24 | Tendencia del costo de cada producto en la planilla | Ver lo que sube rápido (naranja) entre todos | C3 | Robinhood (listas) | — | Sí |
| 25 | «Lleva 2» en verde en lugar de «Agregar» en lo ya agregado | Saber que ya está en la venta sin ir a Vender | celu 1 | Rappi, PedidosYa | 1 | Sí |
| 26 | Tostada «Agregado: … · Deshacer» | Corregir un toque equivocado | celu 1 | Gmail | 2 | Sí (deshacer) |
| 27 | «Listo» y «Agregar a la venta» fijos, la principal en naranja | La acción siempre bajo el pulgar | celu 1 | Referencias de Carlos | — | No |
| 28 | Modo «Consultar» de la cámara: apuntar y saber | «¿Cuánto sale esto?» con el producto en la mano | celu 2 | Shopify POS, lectores de precios de súper | ~4 | Sí |
| 29 | Hoja con tres respuestas: hay, está en, costo | Contestar las tres preguntas del mostrador juntas | celu 2 | Apple Maps (hoja de lugar) | 1–2 | No |
| 30 | «Subió $1.000 el 06/10» al lado del precio | Explicarle al cliente por qué cambió | celu 2 | Mercado Libre (precio anterior) | — | Sí |
| 31 | Modos Consultar · Código · Foto en la misma cámara | Cargar el código o sacar la foto sin otra pantalla | celu 2 | Cámara de iPhone | 1–2 | No |
| 32 | «Consultaste antes» con las últimas consultas | Volver a un producto recién mirado | celu 2 | Spotlight (recientes) | 2 | Sí |
| 33 | La ficha como etiqueta de góndola para mostrarle al cliente | Girar el celular y que el cliente lea el precio | celu 3 | Apple Wallet (pase) | — | Sí |
| 34 | Dar vuelta la etiqueta para ver costo y proveedores | Que el cliente nunca vea el costo aunque mire la pantalla | celu 3 | Wallet (dorso del pase) | — | Sí |
| 35 | Vuelve sola al frente al bloquear o a los 30 s | Olvidarse el costo a la vista | celu 3 | Apps de banco (ocultar saldo) | — | Sí |
| 36 | Deslizar entre los resultados de la búsqueda («1 de 7») | Comparar sin volver a la lista | celu 3 | Tinder, Fotos de iPhone | 2 por producto | Sí |
| 37 | Precio de 84 px | Que se lea de lejos | celu 3 | Etiquetas de góndola | — | Sí |
| 38 | Compartir la etiqueta (imagen con foto y precio) | Pasarle el precio a un cliente por WhatsApp | celu 3 | Mercado Libre (compartir) | 3–4 | Sí |

Toques de la tarea frecuente (saber precio y stock y agregar): hoy ~5 y un desplazamiento en el
celular; celu 1 ~4 sin desplazar; celu 2 **~2** (abrir la cámara, apuntar, «Agregar»); celu 3 ~3.
Computadora: hoy buscar, Enter para abrir la ficha, «+»; compu 1 lo mismo sin abrir la ficha
(ya está al lado); compu 2 remarcar 46 productos es una tecla por producto; compu 3 compara todos
los proveedores sin abrir ninguna ficha.
