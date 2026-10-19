# Encargo: que la maqueta se pueda navegar

Carlos recorre las maquetas en el ambiente de pruebas, en /v2 (las variante-1 de cada pantalla),
/v3 (las variante-2) y /v4 (las variante-3). Te pasan qué variantes hacer navegables. Quiere que **funcionen los enlaces y
los botones que abren pantallas, diálogos u hojas, o que agregan elementos ficticios**, para ver
cómo funciona visualmente. No hace falta lógica de verdad: que se vea lo que pasaría.

## Dónde
- Tu pantalla está en `microservices/web/public/maquetas/<pantalla>/``, con `compu/` y
  `celu/` y una carpeta por variante. Trabajás **solo ahí**: los `index.html` de cada variante (y
  `estados.html` si hay), más un `.js` o `.css` propio de la pantalla si hace falta.
- No toques `_comun/` ni otras pantallas. No uses git (ni add, ni commit). No publiques nada.
- Antes de empezar, leé `resumen.md` de tu pantalla (dice cómo se mueve cada interacción) y
  `_comun/lenguaje.md`.

## Qué hacer en cada variante (computadora y celular)
1. **Navegación entre pantallas.** Agregá `<script src="../../../_comun/navegar.js" defer></script>`
   (leelo: explica el contrato). Marcá con `data-ir="<pantalla>"` cada elemento del marco que lleva
   a otra pantalla: el menú lateral, la barra de abajo, las pestañas de la parte (por ejemplo
   Vender | Ventas de hoy), y los botones que en la idea llevan a otra pantalla (por ejemplo
   «Entrar con Google» lleva a `vender`). Las pantallas son: entrar, vender, ventas-de-hoy,
   productos, listas, duplicados, stock, compras, contar, resumen, usuarios, actividad, anomalias,
   procesos, mejoras-y-errores, configuracion. Una parte del menú lleva a su primera pantalla
   (Catálogo → productos, Depósito → stock, Negocio → resumen). **«Más»** abre una hoja o menú
   chico, con el lenguaje común, que lista Anomalías, Procesos, Mejoras y errores y Configuración,
   cada una con su `data-ir`. Una pestaña o un filtro propio de la pantalla que se llama igual que
   otra pantalla (por ejemplo «Compras» dentro de Resumen) lleva `data-no-ir`.
2. **Lo que abre algo:** diálogos, hojas que suben, paneles, la ficha de un renglón, el detalle
   de una venta, la cámara, un menú: que se abra al tocarlo y se cierre con su botón, tocando
   afuera y con Escape. Si el diálogo no existe todavía en la maqueta, armalo con el lenguaje
   común y datos verosímiles.
3. **Lo que agrega:** «Agregar», escanear, sumar a la venta o al pedido, autorizar a alguien,
   etc.: agrega un elemento ficticio verosímil (nombres reales de ferretería, «un.», pesos con
   punto de miles) y actualiza los totales visibles que dependen de él.
4. **Lo que confirma o guarda** (Cobrar, Guardar, Aplicar, Anular…): muestra el estado de después
   (aviso, pantalla de listo, renglón tachado), como lo describe el resumen.
5. **Pestañas, filtros, segmentos y conmutadores** de la propia pantalla: cambian lo que se ve.
6. Movimiento: el que describe `resumen.md`, corto y solo con transform y opacity; respetá
   `prefers-reduced-motion`.
- **Quieta, la maqueta se tiene que ver igual que hoy**: no rediseñes ni muevas nada.
- JavaScript simple al pie de la página (sin librerías ni internet). Nada de `alert`.
- Lo que no tenga sentido simular (por ejemplo, la cámara real), se simula con una imagen o una
  animación.

## Reusá, no repitas
- Antes de programar, mirá `_comun/` y una pantalla ya navegable (las de `maquetas/navegables.json`):
  el menú «Más», los avisos, los diálogos y las hojas ya están hechos; copiá o enlazá, no rehagas.
- Si te falta un ícono, mirá primero `_comun/iconos/` y los de las otras pantallas.

## Sin pruebas
No escribas pruebas ni compares capturas (decisión 114). Abrí cada variante una vez en Chromium y
mirá que la consola no tenga errores; nada más.

## Respuesta final
Corta y en castellano: por variante, qué se puede tocar y qué hace, y lo que quedó sin simular.
