# UX: Secciones de «Cómo va el negocio», cada una con su permiso

**Maquetas aprobadas por Carlos el 2026-10-15:** `maquetas/elegida.html`. Salió de la
variante A (`a-pestanas.html`), con el submenú arriba como en Catálogo y Usuarios; `b-` y
`c-` son las otras variantes que se mostraron. Valen además las reglas generales de
`specs/006-informacion-del-negocio/ux.md` (estados de todo bloque, todo número se explica).

## Historia 1: cada rol ve solo las secciones que su permiso deja

**Qué tiene que poder hacer el rol**

- Abrir «Cómo va el negocio» y leer, sin tocar nada, la primera sección que puede ver.
- Pasar de una sección a otra con un toque (celular) o con las flechas (computadora).
- No enterarse de que existe una sección que no puede ver.

**Información, en este orden**

1. El submenú con las secciones que puede ver, en este orden: Ventas, Compras, Inventario.
   Al abrir, la primera de ellas.
2. Una frase que dice qué muestra la sección elegida.
3. Los números de la sección:
   - Ventas: «Vendido hoy», «Ventas de hoy» y «No llevaron hoy».
   - Compras: «Gastos de la semana» (solo con «Ver los gastos»).
   - Inventario: «Dinero invertido».
4. El detalle de la sección:
   - Ventas: ventas de hoy por medio de pago, con «Ver las ventas de hoy», y lo que
     preguntaron y no llevaron.
   - Compras: los gastos de la semana por proveedor (con «Ver los gastos») y las compras
     recientes (con «Ver las compras»).
   - Inventario: el dinero invertido por proveedor.

**Reglas**

- Una sección que el rol no puede ver no aparece en el submenú, ni deshabilitada.
- Con una sola sección visible, el submenú no se muestra: se ve directo esa sección.
- Sin ninguna, «Cómo va el negocio» no está en Más; si se llega por la dirección, la
  pantalla dice qué permisos hacen falta y a quién pedírselos.
- **Computadora:** el submenú va arriba de todo, a la izquierda; a la derecha, «Actualizar»
  con su ícono. No hay «Volver a Más»: se vuelve con el teclado, como en el resto del menú.
  Las secciones se recorren con las flechas y no llevan atajo Alt (como en Usuarios,
  decisión 88).
- **Celular:** «Volver a Más», el título «Cómo va el negocio» y debajo el submenú, con ícono
  y nombre en cada sección. Se usa con una mano y sin desplazarse hacia el costado.
- «Actualizar» vuelve a traer los números de la sección abierta, sin recargar la página.

**Estados**

Los de 006 para todo bloque (cargando, vacío, error, sin conexión, éxito), dentro de cada
sección. Uno propio:

- *Sin permiso* (se llega por la dirección a una sección que no puede ver): «No tenés permiso
  para esta pantalla. Hace falta el permiso «…». Pedile a quien administra los roles que te lo
  dé.», con el nombre del permiso de esa sección, como en cualquier pantalla.

## Historia 3: el valor del stock en Depósito

- Sin «Ver el dinero invertido», Depósito → Inventario muestra las cantidades y no el valor
  en pesos, ni su columna ni su total. No se reemplaza por un $0.

## Chequeo contra la constitución

- Cuaderno y calculadora: la sección que más se mira (Ventas) abre primero y se lee sin tocar.
- Se aprende sin manual: cada sección tiene su frase; el estado sin permiso dice qué pedir.
- Teclado en la computadora: el submenú se recorre con las flechas; «Actualizar» se alcanza con Tab.
- Errores en el lugar, en castellano: los de 006, por bloque.
- Celular y computadora: el mismo submenú, las mismas secciones y los mismos textos (decisión 47).
- Sin internet: vale el estado sin conexión de 006.
- Todo número se explica: los números de cada sección conservan su explicación al tocarlos.
- Seguro por defecto: lo que el rol no puede ver no llega al navegador.
