# UX: Ficha del producto renovada

Maquetas aprobadas por Carlos el 2026-10-17: variante A en el celular
(`maquetas/celular-ficha-a.html`, `maquetas/celular-ficha-a-entera.png`) y su versión de la
computadora (`maquetas/compu-ficha.html`). Las variantes B y C quedan como referencia descartada.

## Reconocer el producto (historia 1)

- Lo primero: la foto, el stock, el nombre, la marca y el código del proveedor (sin ninguno de
  los dos, «Sin marca ni código»). El nombre en
  negrita y en mayúsculas, como en la tarjeta del Catálogo; el stock con la misma etiqueta («40
  un. en stock», «Sin stock»).
- La foto lleva «Cambiar foto» encima. Sin foto, el mismo lugar con un fondo neutro y «Sacar
  foto» (celular) o «Subir foto» (computadora): no un color que tape al nombre.

## El código de barras (historia 2)

- El código con un botón de copiar adentro de la caja, y «Escanear código» al lado («Escanear
  con el celular» en la computadora, donde el código llega del celular vinculado). Sin cámara, o
  en la computadora sin celular vinculado, el código se tipea y el botón dice «Cargar el código»
  o «Cambiar el código». Si el código no entra al lado del botón (14 dígitos en un celular
  angosto), el botón baja a otro renglón: el código nunca se corta.
- Al copiar, un aviso breve (dos segundos y medio): «Código copiado». Si el navegador no deja, el aviso dice «No se pudo
  copiar: quedó seleccionado» y el código queda seleccionado.
- Sin código: «Sin código», sin botón de copiar.
- Recién cargado o cambiado en esta ficha: una franja verde con «Código actualizado» y «Última
  lectura: 13/10/2026 · 10:24». Las otras veces, solo «Última lectura: …» debajo del código. Un
  código cargado antes de que existiera el dato no dice fecha.

## Proveedor, precio y cálculo (historia 3)

- Orden: código, proveedor y costo, precio y margen, archivo de origen. Cada tema en su tarjeta,
  con su título.
- El proveedor en uso: su inicial en un cuadrado, el nombre, la estrella si es el más barato,
  «Proveedor principal», «Última lista: <fecha>» y «Costo de compra» con el importe. Con más de
  un proveedor, una flecha despliega los demás en la misma tarjeta, cada uno con su costo, su
  fecha y «Usar»; el más barato con la estrella.
- El precio de venta grande, los cinco márgenes y «Otro margen», como hoy.
- «Así se calcula», plegado al abrir la ficha: costo de compra (con el detalle de descuentos de
  la lista, si hay), + margen, + IVA, = precio con IVA, y «Se cobra» con el redondeo a $1.000 y
  su explicación. Sin margen o sin costo, dice qué falta. El precio dice «sin costo», o, sin
  margen, «elegí un margen» a quien puede fijarlo y «sin margen» a quien no.
- Si la foto no se puede subir, un aviso dice por qué.
- Sin permiso de ver costos: no hay tarjeta de proveedor, ni «Así se calcula», ni archivo.

## Archivo de origen (historia 4)

- Ícono de planilla, el nombre del archivo, «<proveedor> · <fecha> · <N> productos» y
  «Descargar Excel». Sin conexión: el proveedor y la fecha, y «Descargar Excel» avisa que hace
  falta internet.

## Agregar a la venta (historia 5)

- Abajo, fijos: «Listo» y «Agregar a la venta» (principal, con el carrito). Al agregar, el aviso
  «Agregado a la venta: <producto>» y la ficha sigue abierta. Sin permiso de vender, solo «Listo».
- Computadora: dos columnas (código, proveedor y archivo a la izquierda; precio y cálculo a la
  derecha) y el pie con las teclas: Mayús + 1 a 5 el margen, «+» agrega a la venta, Esc cierra.
  ← → recorren los márgenes y ↑ ↓ las partes de la ficha, como hoy. En una ventana de menos de
  900 px, una sola columna y sin la línea de teclas.

## Chequeo contra los principios de interfaz

- Las palabras del negocio: «Proveedor principal», «Costo de compra», «Se cobra». Cumple.
- Lo mismo en el celular y en la computadora, con textos compartidos (decisión 47). Cumple.
- Todo con el teclado en la computadora. Cumple: teclas en el pie, el resto con Tab.
- Funciona sin conexión: todo menos el archivo de origen y la descarga, que lo dicen. Cumple.
- Botones de al menos 44 px en el celular; secundarios (copiar, «Descargar Excel») de 36 o más
  (decisión 104). Cumple.
