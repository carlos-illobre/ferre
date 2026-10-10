Viene de `docs/ux.md` (secciones «Sistema visual» y «Concreto»), pasado a este documento el 2026-10-10 al adoptar Spec Kit. Los principios de la interfaz y cómo se verifican están resumidos en la constitución (`.specify/memory/constitution.md`, principio II).

# Sistema visual

Rediseño del 2026-09-14. La decisión de tener dos interfaces está en
[ADR-014](adr/ADR-014-dos-interfaces-celular-y-escritorio.md).

> **Este documento describe la interfaz que hay hoy.** El 2026-10-10 Carlos decidió rehacer
> toda la interfaz, celular y computadora (decisión 13 de
> [decisiones-de-negocio.md](decisiones-de-negocio.md)). Hasta entonces las pantallas no se
> tocan. Para rediseñar, la entrada es
> [specs/001-base-del-sistema/ux.md](../specs/001-base-del-sistema/ux.md): reúne las reglas
> que valen sea cual sea el diseño y todo lo que Carlos pidió sobre las pantallas. Si la
> paleta, la tipografía y la marca de acá se conservan es una pregunta abierta.

## Dos interfaces

Hay dos interfaces sobre la misma app, con la misma paleta y la misma marca:

- **Celular** (pantallas de menos de 900 px): el diseño de `mockups/Ferre iOS.html` (Claude
  Design), una maqueta que no está en el repositorio porque la carpeta `mockups/` está
  excluida del control de versiones. El 2026-10-09 el dueño la había aprobado tal como
  está; el 2026-10-10 decidió rehacerla junto con la de computadora.
  Vive en `src/App.tsx`, `src/pantallas/`, `src/componentes/` y `src/estilos.css` del
  cliente web.
- **Computadora** (900 px o más): tablas a todo el ancho de la pantalla, menú completo arriba
  (Vender, Productos, Compras, Stock, Contar, Listas de precios, Duplicados, Administración),
  edición en la fila y atajos de teclado. Vive en `src/escritorio/`.

Lo que comparten: un solo color de acción (coral), tinta y niebla, importes en Archivo
Narrow, el logo «fe», las palabras del mostrador y que todo número se explica. Toda función
nueva con pantalla se hace en las dos.

## Paleta

- **Un solo color de acción: coral.** Todo lo demás es tinta (`#0e1220`) y niebla
  (`#f3f4f7`).
- Lo que falta (sin margen, sin cliente) se marca con coral tenue.

## Tipografía

- **Los importes van en tipografía condensada (Archivo Narrow)**, más grandes que el resto:
  se leen de lejos.
- En pantalla los importes van sin centavos (`$3.000`); en explicaciones y detalles, con
  centavos.
- Letra mínima 16 px en laptop, 18 px en celular. Alto contraste.

## Componentes

- **Tarjetas** blancas redondeadas sobre fondo niebla. Cada fila de una lista es nombre +
  detalle a la izquierda e importe a la derecha.
- **Hojas que suben desde abajo** para lo que se abre sobre lo que se está haciendo:
  explicación de un número, ficha del producto, elegir cliente o proveedor, revisar una
  lista. Escape o tocar afuera cierra.
- **Pantalla de éxito a pantalla completa** al cobrar o registrar un ingreso: el importe
  grande, cómo pagó y un solo botón para seguir.
- **Avisos en el lugar:** un toast oscuro para lo que salió bien, un aviso coral para lo que
  falta; se van solos al corregir la causa.
- **Botones:** un solo estilo de botón principal por pantalla; el resto, secundarios.
- **Barra de progreso** con lo que está haciendo, para lo que va a tardar (cargar una lista).

## Reglas del celular

Salen del diseño de referencia.

- **Cuatro pestañas, todo el negocio,** abajo: Vender · Catálogo (productos, listas,
  duplicados) · Depósito (stock, ingreso, contar) · Negocio (hoy, gastos, usuarios, sesiones,
  quién hizo qué).
- Tarjetas; nada de tablas anchas.
- Hojas, pantalla de éxito y avisos como se describen en «Componentes».
- La cámara está a un toque al lado de cada buscador.
- Cada renglón de venta es una tarjeta: producto y subtotal arriba, cantidad (− +), unidad y
  margen abajo; el margen se despliega en el mismo renglón con los cinco botones y el precio
  a mano.

## Reglas de la computadora

- Mandan las tablas: nada de las reglas de layout del celular aplica.
- Menú completo arriba.
- La barra de arriba entra entera en la notebook: la leyenda de pruebas se acorta a «Prueba»
  y el estado de conexión es un punto verde mientras todo está sincronizado; sin conexión se
  lee completo.
- Cada renglón de venta es una fila de la tabla y el cobro queda fijo abajo.

## Concreto

- Letra mínima 16 px en laptop, 18 px en celular. Alto contraste. Los precios, más grandes
  que el resto.
- La pantalla de venta entra entera en la laptop sin desplazarse: búsqueda arriba, líneas en
  el medio, total y cobro abajo.
- Cada renglón de venta es una tarjeta: producto y subtotal arriba, cantidad (− +), unidad y
  margen abajo; el margen se despliega en el mismo renglón con los cinco botones y el precio
  a mano. En la computadora, cada renglón es una fila de la tabla y el cobro queda fijo abajo.
- Estado vacío de cada pantalla con una frase que dice qué hacer («Escribí el nombre del
  producto o escaneá el código»).
- Respuesta visible en menos de 100 ms para búsqueda y para cambiar margen. Si algo va a
  tardar más (cargar una lista), barra de progreso con lo que está haciendo.
- Nombres autodocumentados y fáciles de entender: «cuenta corriente» (no «fiado»), «lista»,
  no «importación»; «costo», no «precio de compra neto». Se abrevia «cc.» solo donde el
  espacio no alcanza, por ejemplo en una columna angosta.
- Un solo estilo de botón principal por pantalla; el resto, secundarios.
- Funciona en Chrome y Firefox de la laptop antigua y en el navegador del celular. Se prueba
  en la laptop real antes del piloto.
