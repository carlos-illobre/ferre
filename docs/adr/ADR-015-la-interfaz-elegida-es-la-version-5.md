# ADR-015: La interfaz elegida es la versión 5, armada sobre las pantallas de la 1 y la 2

**Estado:** Aceptado
**Fecha:** 2026-10-11
**Amplía a:** [ADR-014](ADR-014-dos-interfaces-celular-y-escritorio.md) (dos interfaces que se eligen por el ancho)

---

## Contexto

El 2026-10-10 Carlos decidió rehacer toda la interfaz (decisión 13). Se probaron una versión
nueva para las dos pantallas (la 2), tres maquetas (la 3) y una versión hecha a partir de un
diseño de Figma (la 4). Ninguna lo conformó entera: le gustó el celular de la versión 1, la
computadora de la versión 2 (menú lateral, tablas, teclado) y la idea de un menú «Más» de la
versión 4 (decisión 27). El 2026-10-11 eligió la versión 5, que junta esas tres cosas
(decisión 28), y pidió que las otras versiones sigan publicadas pero sin pruebas (decisión 43).

> **Actualización del 2026-10-11 (decisiones 46 y 47).** La «versión 5» pasó a llamarse
> **la principal**: su código está en `src/principal/` y se publica en la raíz. Las versiones
> 1 a 4 son históricas y se publican bajo `historico/`. Donde este documento dice «versión 5»
> hay que leer «la principal». Se sumaron tres archivos que comparten las dos interfaces:
> `src/principal/textos.ts` (textos y listas; forma larga para la computadora y corta para
> el celular), `src/principal/paleta.css` (todos los colores) y las reglas, que tienen que
> ser idénticas en las dos.

## Decisión

**La versión 5 es la interfaz del sistema y es la que abre la raíz.** Se arma así:

- **Dos árboles que se eligen por el ancho (900 px), como en ADR-014.** El del celular usa
  las pantallas de la versión 1; el de la computadora, las de la versión 2. Si la ventana
  cruza el límite, se recarga.
- **No se copia lo que no cambia.** La versión 5 importa las pantallas de las versiones 1 y 2
  tal cual. Solo cuando una pantalla tiene que comportarse distinto se hace una copia propia
  en la carpeta de la versión 5 y se cambia ahí (Vender, Depósito, Catálogo y Negocio del
  celular; Vender, Ingreso e Inventario de la computadora). Las versiones anteriores no se
  tocan, salvo los componentes compartidos que la versión 5 usa y que mejoran para todas (el
  contador de cantidad, el diálogo de la foto del producto, el nombre de las unidades).
- **Lo nuevo se escribe una sola vez y lo usan los dos árboles:** Mejoras y errores, Anomalías, la foto
  de la factura, el pedido de foto con código QR, el dinero invertido, el marco del ambiente
  de prueba. Cada una trae sus propios estilos para verse igual sobre cualquiera de los dos.
- **El aspecto se ajusta con una hoja de estilos por árbol,** que pisa los colores y las
  piezas de la versión de la que sale, en vez de tocar las hojas de esa versión.
- **Un solo menú en los dos árboles:** Catálogo (Productos, Listas, Duplicados), Vender,
  Depósito (Ingreso, Inventario, Estanterías) y Más (Cómo va el negocio, Usuarios y sesiones,
  Quién hizo qué, Anomalías, Mejoras y errores).

Dónde está cada cosa en el código:

| Qué | Dónde |
|---|---|
| Entrada de la aplicación y elección del árbol | `clientes/gestion-del-local-web/src/principal/main.tsx` (la carga `index.html`, en la raíz) |
| Árbol del celular: menú, copias de pantallas y estilos | `src/principal/celular/` (`App.tsx`, `tema.css`) |
| Árbol de la computadora: menú, atajos, copias y estilos | `src/principal/compu/` (`App.tsx`, `tema.css`) |
| Lo compartido por los dos árboles | `src/principal/*.tsx` y `src/principal/*.css` |
| Pantallas de la versión 1 que usa el celular | `src/pantallas/`, `src/componentes/` |
| Pantallas de la versión 2 que usa la computadora | `src/v2/` |
| Textos y listas comunes, y la paleta | `src/principal/textos.ts`, `src/principal/paleta.css` |
| Las versiones históricas | `historico/v1/`, `historico/v2/`, `historico/v4/` (entradas), `public/historico/` (maquetas 3 y 4 y la lista) |
| Redirecciones desde las direcciones viejas | `public/v1/` … `public/v5/`, `public/versiones.html` |

**Pruebas.** Solo se prueba la versión 5. Las unitarias están en `src/principal/` (las de las
pantallas del celular y de la computadora, más las de lo nuevo) y corren en cada push. Los
archivos de prueba de las otras versiones quedaron en su lugar y están excluidos en
`vitest.config.ts`. Los escenarios de punta a punta (`tests/e2e/`, una carpeta por árbol) corren contra la versión 5,
una vez por semana y a pedido; `tests/e2e.sh` explica cómo correrlos en el servidor.

**Para mirar una pantalla sin Docker:** `tests/capturas/` (API de mentira y capturas).

## Consecuencias

- El celular y la computadora siguen siendo dos interfaces con su propio marcado; una regla
  que cambia se toca en los dos árboles, salvo que viva en lo compartido.
- La versión 5 depende de archivos de las versiones 1 y 2. **No se puede borrar una versión
  anterior sin antes mover a la carpeta de la versión 5 lo que ella usa.** Cuando Carlos pida
  borrarlas, ese es el primer paso.
- Una mejora hecha en un archivo de la versión 1 o 2 que la versión 5 importa también cambia
  esa versión vieja. Se acepta: las versiones viejas están para comparar, no para usarse.
- Los estilos de cada árbol pisan a los de la versión de origen; al mover las pantallas a la
  carpeta de la versión 5 conviene fundirlos.
