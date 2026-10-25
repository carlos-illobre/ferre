# ADR-029: El teclado, por comandos con nombre y tablas de teclas

**Estado:** Aceptado
**Fecha:** 2026-10-25
**Enmienda:** la parte de ADR-028 sobre el teclado («El teclado se declara»)
**Especificación:** `specs/024-front-por-capas/` (T012, decisión 159)

---

## Contexto

El teclado estaba metido en las pantallas: 43 componentes con su `onKeyDown`, 20 hooks de teclas
propios, 11 oyentes de `keydown` sueltos y las letras de las teclas escritas en 71 lugares de la
interfaz. Cambiar una tecla obligaba a tocar el componente, y las teclas se van a rehacer todas
(T147). Carlos pidió que los componentes gráficos no dependan del código de las teclas, con el
menor acoplamiento y fácil de cambiar (decisión 159).

## Opciones consideradas

1. **Comandos con nombre y tablas de teclas** (la elegida, patrón *Command* con un registro que
   hace de mediador). La pantalla ofrece acciones («cobrar», «siguiente», «cerrar») y no sabe qué
   tecla las dispara; el teclado tiene, aparte, la tabla de qué tecla pide cada acción.
2. **Que el teclado haga clic en botones marcados.** Alcanza para «apretá el botón Cobrar», pero no
   para lo que depende del estado de la pantalla (el renglón elegido, lo escrito en la búsqueda).
3. **Borrar el teclado y rehacerlo en T147.** La computadora quedaría sin teclado hasta entonces y
   habría que reescribir dos veces las pruebas y las especificaciones que lo describen.

## Decisión

- **`plataforma/comandos/`** (técnica, sin nada de la ferretería): un registro de acciones con nombre.
  - Una pantalla o una pieza ofrece las suyas mientras está a la vista: `useComandos({ cobrar, siguiente })`.
  - La última que se ofreció gana (una ventana abierta tapa a la pantalla de atrás).
  - Una acción que devuelve `false` no aplica ahora y deja pasar la tecla.
  - El registro también guarda la etiqueta de cada acción («F2»), para mostrarla al lado del botón
    sin que el componente sepa qué tecla es.
- **`src/teclado/`** (capa propia, al lado de `app/`): todo lo que sabe de teclas.
  - El motor: un solo oyente de teclas, que traduce la tecla («Alt+C», «F2», «Mayús+1») y le pide
    al registro la acción de la tabla.
  - Lo del teclado que no depende de la pantalla: las flechas por las filas, las letras con Alt, el
    foco entre el menú y la pantalla. Lo que va por la forma de la pantalla se reconoce por marcas
    del HTML (`data-flechas-propias` en una tabla que se recorre por filas, `role="radiogroup"`),
    no por el nombre de un componente.
  - Las letras con Alt que pide la tabla para una acción a la vista («Alt+S», subir la lista) no se
    reparten entre los botones: así la letra que muestra el botón es siempre la de su tabla.
  - Una tabla por interfaz y por parte (`tablas/compu/vender.ts`): tecla → acción, y si vale con el
    cursor en un campo de texto.
  - `app/` lo instala en la interfaz que corresponde.
- **Reglas que controla `pnpm capas`:** nada de `ui/`, `negocio/` ni `pantallas/` importa
  `teclado/`, y el teclado solo importa `plataforma/`.
- **Lo que queda en un componente:** lo que el navegador ya hace solo con los elementos de siempre
  (un formulario que se manda con Enter, Escape en un `<dialog>`, un grupo de opciones que se
  recorre con las flechas por ser un `radiogroup`). No es código de teclas.

## Consecuencias

- Cambiar una tecla es cambiar una línea de una tabla; agregar una es ofrecer la acción y sumar la línea.
- La misma acción la puede pedir otra cosa que el teclado (un botón, una paleta de comandos).
- Mientras se mueve, las teclas pueden cambiar (decisión 159); por defecto se dejan las de antes,
  y lo que cambia se anota en la especificación de la capacidad y en sus pruebas.
- Se mueve por partes (la base, `ui/` y el marco, y cada capacidad), con las pruebas en verde en cada una.

## Cuándo revisar esta decisión

Si alguna acción necesita saber qué tecla la disparó, o si T147 pide algo que una tabla no puede decir.

## Referencias

- ADR-028 (el front por capas)
- Decisiones 80, 82, 153, 159
