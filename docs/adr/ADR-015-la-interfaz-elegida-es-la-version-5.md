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
> **la principal**: su código está en `src/pantallas/` y se publica en la raíz. Las versiones
> 1 a 4 son históricas y se publican bajo `historico/`. Donde este documento dice «versión 5»
> hay que leer «la principal». Se sumaron tres archivos que comparten las dos interfaces:
> `src/pantallas/textos/` (textos y listas; forma larga para la computadora y corta para
> el celular), `src/pantallas/paleta.css` (todos los colores) y las reglas, que tienen que
> ser idénticas en las dos.
>
> **La aplicación ya no depende de las versiones históricas.** Las pantallas, los componentes
> y los estilos de las versiones 1 y 2 que usaba se copiaron adentro de `src/pantallas/`
> (`celular/pantallas`, `celular/componentes`, `celular/estilos.css` y `compu/base/`). Lo que
> más abajo dice sobre importar pantallas de las versiones 1 y 2, y sobre no poder borrarlas,
> ya no vale: el código de las históricas quedó congelado y un cambio en la aplicación no las
> toca. Siguen compartiendo solo lo común de `src/` (API, catálogo, envío sin conexión, sesión).

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
  Depósito (Ingreso, Inventario, Estanterías) y Más (Cómo va el negocio, Usuarios, Anomalías,
  Procesos, Mejoras y errores, Configuración; Usuarios con sus pestañas Usuarios, Sesiones,
  Roles y Quién hizo qué, decisión 88).

Dónde está cada cosa en el código:

| Qué | Dónde |
|---|---|
| Entrada de la aplicación y elección del árbol | `clientes/gestion-del-local-web/src/pantallas/main.tsx` (la carga `index.html`, en la raíz) |
| Árbol del celular: menú, copias de pantallas y estilos | `src/pantallas/celular/` (`App.tsx`, `tema.css`) |
| Árbol de la computadora: menú, atajos, copias y estilos | `src/pantallas/compu/` (`App.tsx`, `tema.css`) |
| Lo compartido por los dos árboles | `src/pantallas/*.tsx` y `src/pantallas/*.css` |
| Pantallas de la versión 1 que usa el celular | `src/pantallas/`, `src/componentes/` |
| Pantallas de la versión 2 que usa la computadora | `src/v2/` |
| Textos y listas comunes, y la paleta | `src/pantallas/textos/`, `src/pantallas/paleta.css` |
| Las versiones históricas | `historico/v1/`, `historico/v2/`, `historico/v4/` (entradas), `public/historico/` (maquetas 3 y 4 y la lista) |
| Redirecciones desde las direcciones viejas | `public/v1/` … `public/v5/`, `public/versiones.html` |

**Pruebas.** Solo se prueba la versión 5. Las unitarias están en `src/pantallas/` (las de las
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

## Enmienda del 2026-10-13

Las versiones 1 a 4, sus páginas publicadas y los mockups se borraron del repositorio
(decisión 83): la interfaz elegida es la única y es la definitiva. Lo que este ADR dice de
dónde vivía cada versión vale como historia, incluida la tabla de «Dónde está cada cosa».

Desde el reordenamiento ([ADR-018](ADR-018-servicios-y-capas.md)), el front está en
`microservices/web/src/` así: `pantallas/celular/` y `pantallas/compu/` (cada interfaz, con su
menú, sus pantallas, sus piezas y sus estilos), `pantallas/` (lo compartido por las dos:
textos, paleta y pantallas comunes), `negocio/` (la regla de cada proceso, una sola vez),
`plataforma/` (la tecnología reutilizable) y lo común de la aplicación en `src/` (cliente del
servidor, catálogo, cola, sesión). La entrada es `pantallas/main.tsx`.
