# UX: Catálogo para vender

Maquetas aprobadas por Carlos el 2026-10-17, variante B: `maquetas/celular-catalogo-b.html`,
`maquetas/celular-filtros.html`, `maquetas/compu-catalogo.html` y `maquetas/compu-filtros.html`.
Las variantes A y C quedan como registro de lo que se descartó. Las maquetas están armadas sobre
la pantalla real, con datos de ejemplo.

**Quién:** el Vendedor (y cualquiera con el permiso de vender) en el Catálogo, Productos, en el
celular y en la computadora.

## Saber si hay (historia 1)

- Cada producto dice su stock con la unidad en que se vende («120 m», «9 u.», «12,5 kg») o
  «Sin stock». Los dos se distinguen a la vista: el que hay, en verde; el que no, en naranja.
- En el celular, el stock va como etiqueta chica arriba del nombre («9 u. en stock»); en la
  computadora, en la columna Stock, que ya existía.
- «Stock bajo» no aparece hasta que exista el stock mínimo (RF-54).

## Agregar a la venta (historia 2)

- «Agregar», con un carrito, en cada producto: en el celular debajo del precio; en la
  computadora debajo del precio de venta. Es un botón secundario: borde suave y fondo claro,
  al menos 36 px de alto (decisión 104).
- En la computadora, con el teclado: la tecla «+» agrega el producto elegido, también con el foco
  en el buscador; con Ctrl, Cmd o Alt no hace nada. La línea de atajos lo dice.
- Al agregar se sigue en el Catálogo, con la misma búsqueda y en el mismo lugar; un aviso breve
  dice «Agregado a la venta: <producto>». En el menú, Vender muestra cuántos renglones lleva la
  venta; sin venta, sin número.
- Quien no puede vender no ve «Agregar».

## Filtrar (historia 3)

- Un botón de filtros junto al buscador (en el celular, al lado del lector, con un ícono; en la
  computadora, «Filtros» con texto). Con filtros puestos, muestra cuántos.
- Abiertos: en el celular, una hoja que sube desde abajo; en la computadora, un panel debajo
  del botón, que se cierra con Esc. Tienen «Disponibilidad» (Todos, Con stock, Sin stock), «Marca»
  con un buscador y la lista de marcas, y «Sacar filtros». En el celular, «Ver N productos»
  cierra la hoja; en la computadora la lista se filtra mientras se elige. Si no queda ninguno, el
  botón dice «No hay productos con esos filtros.» en lugar de «Ver 0 productos».
- Las marcas para elegir son las de lo encontrado con la búsqueda escrita; el buscador de marcas
  lleva lupa en las dos interfaces.
- En la computadora, el panel recibe el foco al abrirse, en lo elegido, y no lo vuelve a mover
  mientras se elige: se recorre entero con el teclado.
- Con filtros puestos, arriba de la lista, un renglón dice cuántos productos quedan («12
  productos con filtros») y ofrece «Sacar filtros» de un toque. No está en la maqueta: se agregó
  al programar, para cumplir E18 y E19.
- Con filtros que no dejan nada, la lista lo dice y ofrece sacarlos.

## Pestañas, buscador y tarjetas (historia 4)

- Pestañas Productos, Listas y Duplicados de al menos 44 px de alto en el celular; las demás
  pestañas del celular son las mismas y miden lo mismo.
- Buscador: «Producto, código o marca» en el celular; «Buscar productos, códigos o marcas…» en
  la computadora.
- En el celular, cada producto es una tarjeta suelta, con 1 px de separación entre una y otra;
  el elegido, en amarillo. El nombre va en negrita y en mayúsculas; el margen, debajo del
  precio, en verde (pedidos de Carlos al aprobar la maqueta).

## Chequeo contra los principios de interfaz

- Celular y computadora: las mismas reglas y textos, el del buscador resumido en el celular (decisión 47).
- Palabras del mostrador: «Agregar», «Sin stock», «en stock», «Filtros».
- Teclado en la computadora: «+» agrega, Esc cierra los filtros.
- Colores de la paleta; el fondo de «Agregar» es una mezcla de dos colores de la paleta.
- Sin conexión: agregar funciona igual (E13).
