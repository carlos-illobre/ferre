# Revisión: El front, por capas y en piezas chicas (specs/024, T014)

**Fecha:** 2026-10-25 · **Revisor:** subagente `revisor` (paso 7) · **Commits:** los 31 con «(024-»
en el título, de `c58a14a` a `3529a7f`.

## Qué se corrió

Todo desde `microservices/web`.

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit -p .` | sin errores |
| `pnpm capas` | sin violaciones (995 módulos); `.dependency-cruiser-known-violations.json` está vacío (`[]`) |
| `pnpm limites` (ESLint) | 0 errores, 1 aviso (`negocio/catalogo/catalogo.ts:155`, dependencia de más en `useCallback`); `limites-excepciones.json` está vacío (`[]`) |
| `pnpm limites` (jscpd) | **pasa, pero con 40 clones exactos (310 líneas, 0,71 %)**: el umbral es `"threshold": 1` (ver 1.1) |
| `npx vitest run` | 89 archivos, 621 pruebas, todas pasan |
| e2e | No las corrí (lo pidió así quien me lanzó). Me dijeron que pasaron 74 + 4 y que se omitieron 2; no lo comprobé |
| `node tests/trazabilidad.mjs` | coinciden |

No pude comprobar E05 («se ve igual») más allá de las pruebas: las comparaciones de capturas que
anotan las tareas T004 a T011 no están en el repositorio, y no levanté la aplicación.

## Resumen, de lo más grave a lo menos grave

| # | Gravedad | Qué |
|---|---|---|
| 1.1 | **Frena el cierre** | Queda código copiado (40 clones). El control lo deja pasar porque el umbral de jscpd es 1 %, no cero (E03, SC-01) |
| 1.2 | **Frena el cierre** | Hay pantallas y negocio que leen y escriben en el dispositivo y llaman al servidor por su cuenta, sin pasar por `datos/` (E01) |
| 1.3 | **Frena el cierre** (es chico) | La regla de quién puede anular está escrita dos veces, una en cada interfaz y las dos en `pantallas/`; `puede`/`usePuede` viven en `pantallas/` (E04, Seguridad) |
| 2.1 | Defecto | Los módulos de forma de pantalla de `teclado/compu/` dependen de nombres de clase CSS y de `data-testid`, y uno tiene una regla de una sola pantalla (Vender). ADR-029 pide marcas del HTML |
| 2.2 | Defecto | Quedan nombres de teclas escritos a mano fuera de `teclado/`: el manual, cuatro textos de ayuda y comentarios. Si se cambia la tabla, eso queda viejo |
| 2.3 | Defecto | ADR-029 dice «un solo oyente de teclas», pero hay 11, y el resultado depende del orden en que se instalan. No está escrito en ningún lado |
| 2.4 | Defecto | Las marcas del HTML que lee el teclado (`data-flechas-propias`, `data-ficha-vertical` y otras) y las clases de las que depende no están documentadas |
| 2.5 | Defecto | Hay 27 archivos de código y 16 hojas sueltos en la raíz de `pantallas/`, fuera de `comun/`, `celular/` y `compu/`. Tres de ellos importan de `compu/` y el celular los usa (E01, E02) |
| 2.6 | Defecto | Hay siete archivos sueltos en la raíz de `negocio/`, fuera de `negocio/<capacidad>/`, y la regla de la puerta de entrada no los controla |
| 2.7 | Defecto | `ui/` no tiene estilos: el botón y la tecla se dibujan con hojas globales de cada interfaz. La paleta sigue en `pantallas/`. Quedan unas 3200 líneas de CSS global y cinco hojas pasan de 150 líneas |
| 2.8 | Defecto | Hay hooks de `pantallas/` con lógica de proceso, y algunos están repetidos entre el celular y la computadora |
| 3.x | Anotar | Reglas inventadas: no encontré ninguna de negocio; hay detalles técnicos menores |
| 4.x | Defecto | Documentación atrasada: `proyecto/estado.yml` (RNF-69), ADR-028 (qué hay en `ui/`), ADR-015 y `CLAUDE.md` (`textos.ts`, «lo común está en `src/`») |
| 5 | — | No hay maquetas: no corresponde |

---

## 1. Escenarios sin cumplir

Ningún escenario tiene una prueba que lo nombre. La spec dice que los controla «una
verificación automática en cada subida»: es `pnpm typecheck` (que corre `capas` y `limites`) en
`.github/workflows/ci.yml:36`. El plan dice «con `pnpm test`», que es otra cosa: es una diferencia
menor. Abajo, cada escenario contra lo que esos controles miden de verdad.

### 1.1 E03 y SC-01: «no hay código copiado». **Frena el cierre**

- **Dónde:** `microservices/web/.jscpd.json:18` (`"threshold": 1`).
- **Qué dice la spec:** E03 dice «no hay código copiado». ADR-028, en «Límites», pone para el
  código copiado: «ninguno». También dice que al terminar «la lista queda vacía».
- **Qué hace el código:** el umbral de jscpd funcionó como lista de excepciones y fue bajando, de
  1,8 en T001 a 1 en T008, pero no llegó a cero. Ahora jscpd encuentra **40 clones exactos (310
  líneas, 0,71 %)** y la verificación pasa igual. El commit de cierre (`3529a7f`) dice «el control
  sin excepciones», y no es así. Los clones más grandes:
  - el manual: `pantallas/compu/base/pantallas/manual/Catalogo-secciones*.tsx` contra
    `CatalogoCelular-secciones*.tsx` (nueve clones, de 6 a 15 líneas cada uno);
  - `pantallas/celular/configuracion/Configuracion.module.css:18-36` contra
    `pantallas/compu/configuracion/Configuracion.module.css:27-45` (19 líneas), y dos clones más
    en el mismo par;
  - `celular/configuracion/MisCelularesCelu.tsx` contra `compu/configuracion/MisCelulares.tsx`
    (líneas 1-11 y 17-28) y `DatosSinConexionCelu.tsx` contra `DatosSinConexion.tsx` (tres clones);
  - Ventas: `RenglonCorregido.tsx`, `OtroDia.tsx:11-18` y `ComoSeResuelve.tsx:8-16`, iguales en
    las dos interfaces;
  - `celular/deposito/FotoDeProducto.tsx:3-12` contra `compu/deposito/FotoDeProducto.tsx:3-12`, y
    `MovimientosDeLaHoja.tsx:24-33` contra `MovimientosDelProducto.tsx:44-53`;
  - `celular/catalogo/useProductosDelCelular.ts:41-47` contra `compu/catalogo/useProductos.ts:41-47`
    (`useAgregarALaVenta`, la misma función en los dos lados);
  - `teclado/tablas/celular.ts:9-14` contra `teclado/tablas/compu/vender.ts:8-13`.
  La lista completa sale con jscpd y el reporter `json`.
- **Lo que falta:** sacar los clones, o que Carlos acepte un mínimo y quede escrito en ADR-028. Y
  poner el umbral en 0.

### 1.2 E01: «lo guardado en el dispositivo, la conexión con el servidor … está en una sola carpeta, la de su capa». **Frena el cierre**

- **Qué dice la spec:** E01. ADR-028 pone en `datos/almacenamiento/` «lo bajado, la cola de
  envíos, lo guardado, las preferencias», y en `datos/conexion/` «la API de Ferrebress».
- **Qué hace el código:** `localStorage`, `sessionStorage` y `fetch` son globales del navegador:
  no se importan, así que `pnpm capas` no los ve. Se usan directo en:
  - `pantallas/compu/ventas/usePanel.ts:4-6` (`ferre.panel`);
  - `pantallas/compu/marco/usePlegado.ts:5-6` (`ferre.menu`);
  - `pantallas/compu/base/pantallas/manual/SelectorDeDispositivo.tsx:8,11`;
  - `negocio/deposito/ingreso-borrador.ts:9,21-22` (el borrador del ingreso);
  - `negocio/entrada/ofrecer-huella.ts:14,18`;
  - `negocio/procesos.ts:16` (`localStorage`) y `:31` (`fetch`);
  - `negocio/tickets/tickets.ts:92` (`fetch` con el token a mano);
  - `negocio/sistema/estado-del-servidor.ts:10` (`fetch`).
  Casi todo esto ya estaba antes de 024 (el borrador, por ejemplo, estaba en
  `negocio/deposito/ingreso.ts`): no es un cambio de comportamiento, es orden que faltó hacer.
  No comprobé si el borrador del ingreso, que no consulta `guardaEnElDispositivo`, va contra RF-84.
- **Lo que falta:** pasarlos a `datos/` y agregar una regla (ESLint `no-restricted-globals`)
  para que no vuelva a pasar.

### 1.3 E04: «una regla … está escrita una sola vez». Seguridad: «los permisos siguen en `negocio/`». **Frena el cierre (es chico)**

- **Dónde:** `pantallas/compu/ventas/useListaDelDia.ts:35-38` (`usePuedeAnular`) y
  `pantallas/celular/ventas/ParteVender.tsx:33`.
- **Qué dice la spec:** E04, y el plan en «Seguridad»: «Los permisos siguen en `negocio/` y en el
  servidor». ADR-028: «Una pantalla solo dibuja».
- **Qué hace el código:** la regla de la decisión 135 (hoy, con `ventas.anular` o
  `ventas.anular_cualquiera`; otro día, solo con `ventas.anular_cualquiera`) está escrita dos
  veces, una en cada interfaz y las dos en `pantallas/`. Además, `puede` y `usePuede`, que
  calculan si alguien tiene un permiso, están en `pantallas/permisos.ts:8-13` y no en
  `negocio/permisos/`, que solo tiene la lista. El servidor sigue controlando cada pedido; eso no
  lo cambió 024 (ningún commit de 024 toca `microservices/api`), así que no es un agujero de
  seguridad. Lo que falla es el lugar donde está escrita la regla.
- También están en `pantallas/` y por interfaz los permisos que pide cada parte del menú
  (`compu/marco/menu.ts:33`, `celular/marco/menu.ts:16`, `celular/ventas/permisos-de-vender.ts:4`).
  Son la forma del menú de cada interfaz y se puede discutir si son una regla. Lo anoto sin
  ponerlo como defecto.

### E02: capas, puerta de entrada y ciclos

`pnpm capas` pasa sin violaciones conocidas. Las reglas de `.dependency-cruiser.cjs` cubren la
tabla de ADR-028 y las dos de ADR-029 (`nadie-usa-el-teclado`, `el-teclado-solo-usa-la-plataforma`).
Quedan dos huecos, en 2.5 y 2.6.

### E03: límites de tamaño y complejidad

ESLint pasa con `complexity` 8, `max-depth` 3, `max-lines` 150 y `max-lines-per-function` 40, y
sin excepciones. Hay 23 `eslint-disable-line react-hooks/exhaustive-deps`, que no afectan los
límites. Uno sí es un olor: `pantallas/compu/negocio/useActividadDeLaCompu.ts:46` apaga
`rules-of-hooks` para llamar a un hook dentro de un `map`. Anda porque `CATEGORIAS` tiene largo
fijo. Se anota como defecto menor. Las hojas CSS no se miden: ver 2.7.

### E05: se ve igual

No lo pude comprobar (ver arriba).

---

## 2. Seguridad, diseño del teclado y orden

Los tres puntos de «Seguridad» del plan:

- **Permisos:** ver 1.3. El servidor no se tocó.
- **Nada nuevo en el dispositivo; las bases y sus nombres no cambian:** comparé `c58a14a` con
  `HEAD`. La base IndexedDB tiene los mismos almacenes y la misma versión (el sufijo por ambiente
  de `deEsteAmbiente("ferre")` vino de 022-T009, no de 024). Las claves de `localStorage` que
  encontré son las mismas, y `ferre.panel` ahora es una constante. No revisé una por una las que
  se arman con variables.
- **Dependencias nuevas, solo de desarrollo:** sí. `eslint`, `typescript-eslint`, los dos
  plugins y `jscpd` están en `devDependencies`. `conexion-entre-dispositivos`, en `dependencies`,
  es de 023.

Sobre el teclado, que es lo que más le importa a Carlos: la base cumple ADR-029.
- `plataforma/comandos/` es técnica pura: `registro.ts`, `useComandos.ts`, `lugar.ts` y
  `etiquetas.ts`, sin nada de la ferretería.
- `teclado/` solo importa `plataforma/`, y solo lo instala `app/main.tsx:21-26`.
- Las tablas están por parte, en `teclado/tablas/compu/*.ts`, con `{ tecla, accion, enCampos,
  lugar, donde, etiqueta }`. Agregar o sacar una tecla de una acción que ya existe es una línea.
- ESLint (`eslint.config.js`, segundo bloque) prohíbe `onKeyDown`, `onKeyUp`, `onKeyPress`,
  `addEventListener("keydown")` y `e.key` / `e.code` fuera de `teclado/`. Busqué a mano otras
  formas (`.key` con otro nombre de variable, `keyCode`, `altKey`, `KeyboardEvent`) y no queda
  ninguna fuera de `teclado/` y de las pruebas.
- Los componentes solo usan `useComandos` o `useAccionesDelLugar` con nombres de acción, y
  muestran la etiqueta con `useEtiqueta` o `<Atajo>`.

Lo que no cumple:

### 2.1 Los módulos de forma de pantalla dependen de clases CSS y de `data-testid`. Defecto

- **Qué dice ADR-029:** «Lo que va por la forma de la pantalla se reconoce por marcas del HTML
  (`data-filas` y `data-fila` …, `role="radiogroup"`), no por el nombre de un componente».
- **Qué hace el código:**
  - `teclado/compu.ts:15,23-29` y `teclado/compu/dos-focos.ts:12-13`,
    `flecha-al-menu.ts:14,22`, `grilla-de-mas.ts:11,27` y `menu-y-pestanas.ts:5-7,72,81-82`
    buscan `.lateral`, `.lateral nav button`, `.cuerpo`, `.pestanas` y `.mas-grilla`, que son
    nombres de clase de `compu/marco/Lateral.tsx:35` y `compu/marco/Mas.tsx:23`;
  - `teclado/compu/ficha.ts:35` busca `.margenes button`, la clase de `compu/base/Margenes.tsx:24`;
  - `teclado/motor/disposicion.ts:2,23,33` trata como lista o fila lo que tenga `.lista`,
    `.elegible` o `.hija`.
  Si esas piezas pasan a CSS Modules (ADR-028 lo pide), los nombres cambian y el teclado deja de
  andar sin que lo avise ningún control.
  - `teclado/compu/menu-y-pestanas.ts:20` tiene una regla de una sola pantalla dentro de un
    módulo general: `[data-testid="vender"] [data-testid="busqueda"]` (decisión 127, «en Vender
    el cursor va siempre a la búsqueda»).
  - `dos-focos.ts:32,67` saca la ruta de una pestaña leyendo su `data-testid` (`pestana-…`).
  Los `data-testid` son para las pruebas; usarlos así ata el teclado a ellos.
- **Por qué importa:** agregar o sacar un módulo es fácil, como dice ADR-029
  (`teclado/compu.ts:34-47`). Pero cambiar un componente del marco puede romper el teclado sin que
  se note.

### 2.2 Teclas escritas a mano fuera de `teclado/`. Defecto

- **Qué dice ADR-029:** «Cambiar una tecla es cambiar una línea de una tabla». Y T020: «el
  manual, sin código de teclas».
- **Qué hace el código:** son textos, no código, pero quedarían mal en cuanto cambie la tabla.
  - El manual: `pantallas/compu/base/pantallas/manual/Catalogo-secciones-3.tsx:13-18` (la tabla
    «Con el teclado»), `Catalogo-secciones.tsx:36,58,98`, `Catalogo-secciones-2.tsx:49,60,76` y
    `Catalogo.tsx:14`, con 22 `<Tecla>…</Tecla>` en total. Podrían usar `<Atajo accion=…>`, como
    `compu/ventas/TeclasDeVender.tsx`.
  - Cuatro textos de ayuda que se ven en pantalla:
    - `pantallas/compu/deposito/Ingreso.tsx:34` («Enter en la cantidad vuelve al buscador»);
    - `pantallas/compu/ventas/AvisosDeLaBusqueda.tsx:22` («Enter lo agrega»);
    - `pantallas/compu/catalogo/PanelDeFiltros.tsx:24` («Esc cierra»);
    - `pantallas/textos/contar.ts:18` («Enter cuenta y vuelve acá»).
  - Comentarios que describen teclas: `compu/ventas/Vender.tsx:13`, `BarraDeCobro.tsx:11-12`,
    `usePanel.ts:3`, `VentasDelDia.tsx:19`, `DetalleDeLaVenta.tsx:8`,
    `compu/catalogo/useProductos.ts:51` y `FichaAlLado.tsx:19`.
  - Una función del negocio con nombre de tecla: `negocio/ventas/busqueda-de-venta.ts:39`
    (`alApretarEnter`).
  - Dentro de `teclado/`, `tablas/celular.ts:31-35` («Shift+1 a Shift+5 …») y
    `tablas/compu/productos.ts:20` («Mayús|1–5») repiten a mano lo que dicen las líneas de la
    misma tabla. Cambiar esa tecla obliga a tocar dos lugares.
- **Gravedad:** defecto. T147 va a rehacer las teclas, y conviene que esto esté resuelto antes.

### 2.3 «Un solo oyente de teclas»: hay 11, y el orden importa. Defecto (sobre todo de documentación)

- **Qué dice ADR-029:** «El motor: un solo oyente de teclas, que traduce la tecla … y le pide al
  registro la acción de la tabla».
- **Qué hace el código:** la tabla tiene un oyente (`teclado/motor/instalar.ts:9`). Además:
  - cada módulo de forma pone el suyo en `window`: `dos-focos.ts:90` (en la fase de captura),
    `menu-y-pestanas.ts:79`, `grilla-de-mas.ts:26`, `ficha.ts:41`, `grupos-de-opciones.ts:18`,
    `filas-propias.ts:22` y `flecha-al-menu.ts:20`;
  - `motor/flechas.ts:84` pone otro, y `motor/atajos.ts:107` uno más, también en captura.
  Se coordinan por el orden de instalación y por `e.defaultPrevented`. `teclado/compu.ts:41` lo
  dice en un comentario («La tabla antes que "← al menú"»). Sacar o reordenar un módulo puede
  cambiar qué hace una tecla que está en la tabla. Esa regla de orden no está en ADR-029.
- Algunos detalles repetidos dentro de `teclado/`:
  - `hayVentana` y el selector `dialog[open], [role='dialog'], [aria-modal='true']` aparecen en
    cinco archivos;
  - `conModificador`, en cuatro.
  Les falta una ayuda común en `motor/`.

### 2.4 Las marcas del HTML que lee el teclado no están documentadas. Defecto

- ADR-029 nombra `data-filas`, `data-fila` y `role="radiogroup"`. El código usa además:
  - `data-flechas-propias` (5 usos), `data-sin-flechas` (2), `data-ficha-vertical` (5),
    `data-ficha-con-flechas` (1), `data-flechas-de-afuera` (1) y `data-principal` (1);
  - las clases de 2.1;
  - el formato de `aria-keyshortcuts` que lee `motor/atajos.ts:27` (`/^Alt ([A-Z])$/`). Por ese
    formato, una etiqueta tiene que escribirse «Alt F» y no «Alt + F» (`tablas/compu/mas.ts:12-15`).
- Ninguna de estas está en `docs/` ni en `specs/`. Otro agente no podría reconstruir la forma de
  marcar una pantalla nueva sin leer el código del teclado.

### 2.5 Archivos sueltos en la raíz de `pantallas/`, y un hueco en la regla entre interfaces. Defecto

- **Qué dice ADR-028:** `pantallas/` tiene `comun/<capacidad>/`, `celular/<capacidad>/` y
  `compu/<capacidad>/`. El contexto del ADR da «70 en la de `pantallas/`» como problema.
- **Qué hace el código:** en la raíz de `pantallas/` siguen 27 archivos `.ts`/`.tsx` que no son
  pruebas y 16 hojas. Entre ellos:
  - `PedidosDeLaCompu.tsx`, que usa solo el celular;
  - `RolesDeUsuario.tsx`, `DineroInvertido.tsx`, `Costos.tsx`, `FotoDeFactura.tsx` y
    `iconos-de-negocio.tsx`;
  - `permisos.ts` (ver 1.3) y `paleta.css`.
  Además:
  - el manual está en `pantallas/compu/base/pantallas/manual/`, no en `compu/<capacidad>/`;
  - siguen `compu/base/` y `celular/componentes/`.
- **El hueco:** `pantallas/pestanas-de-anomalias.ts:1`, `pestanas-de-negocio.ts:1` y
  `pestanas-de-usuarios.ts:1` importan de `./compu/base/ui` (solo el tipo), y el celular los usa
  (`celular/marco/menu-del-celular.ts:4-6`, `celular/anomalias/CabezaDeAnomalias.tsx:4`). Así el
  celular depende de la computadora a través de un archivo de la raíz. La regla
  `el-celular-no-usa-la-computadora` solo mira los imports directos, y
  `lo-comun-no-es-de-una-interfaz` no cubre la raíz de `pantallas/` (E02).

### 2.6 Archivos sueltos en la raíz de `negocio/`. Defecto

- `negocio/actividad.ts`, `anomalias.ts`, `compras.ts`, `del-servidor.ts`, `procesos.ts`,
  `proveedores.ts` y `buscar-version.ts` no están en `negocio/<capacidad>/`. Además
  `negocio/anomalias.ts` y `negocio/apartados/` conviven.
- La regla `por-la-puerta-de-entrada` (`.dependency-cruiser.cjs`, `ADENTRO_DE_UN_MODULO`) solo
  reconoce módulos con carpeta. Estos archivos quedan fuera del control de la puerta de entrada.

### 2.7 `ui/` sin estilos, la paleta fuera de `ui/` y CSS global grande. Defecto

- **Qué dicen el plan y ADR-028:**
  - plan, etapa 3: «La paleta y las variables de tamaño de cada interfaz», en `ui/`;
  - ADR-028: `ui/` tiene «la paleta»; «Una pieza por archivo, con su `.module.css` al lado»; «Lo
    que cambia entre celular y computadora … va en variables de la paleta, no en una copia de la
    pieza»; «Las hojas de estilo globales quedan solo para la paleta, la letra y lo básico del
    documento».
- **Qué hace el código:**
  - `ui/` no tiene ninguna hoja. `ui/Boton.tsx:9,13` pone las clases globales `boton`, `tecla` y
    `solo-compu`, y esas clases se dibujan aparte en cada interfaz: `.boton` está en
    `pantallas/compu/tema.css`, `compu/base/estilos/base.css`, `celular/tema.css` y
    `celular/estilos.css`. Es una dependencia que `pnpm capas` no ve, y es la copia por interfaz
    que el ADR quería evitar;
  - la paleta sigue en `pantallas/paleta.css`;
  - quedan unas 3200 líneas de CSS global, en 35 hojas. Cinco pasan de 150 líneas:
    `celular/estilos.css` (644), `compu/base/estilos/base.css` (372), `celular/tema.css` (340),
    `compu/base/estilos/manual.css` (180) y `compu/negocio/negocio.css` (179). E03 dice «ningún
    archivo pasa de unas 150 líneas», y las hojas no se miden.
- **Gravedad:** defecto. Las tareas T004 a T011 explican por qué algunas hojas quedaron globales,
  pero el cierre (T013) no lo resolvió ni enmendó el ADR.

### 2.8 Lógica de proceso en hooks de `pantallas/`, repetida entre interfaces. Defecto

- **Qué dice ADR-028:** «Una pantalla solo dibuja. Un hook de `negocio/` le da el estado y las
  acciones».
- **Qué hace el código:** en `pantallas/` hay unas 1800 líneas de hooks (`use*.ts`). Muchos solo
  juntan estado de la vista, y eso está bien. Otros tienen pasos del proceso, que deberían estar
  en el negocio:
  - `compu/deposito/useConteoDeSector.ts:27-33,64-69`: buscar por código, traer del servidor lo
    que no está y validar la cantidad;
  - `celular/catalogo/useProductosDelCelular.ts`: escanear, abrir la ficha y el mensaje de
    «ningún producto tiene el código»;
  - `useAgregarALaVenta`, igual en `compu/catalogo/useProductos.ts:44-49` y en el celular.
  Esos pasos están dos veces, una por interfaz.

---

## 3. Reglas inventadas

No encontré ninguna regla de negocio nueva: los commits dicen «iguales a la vista» y las pruebas
pasan. Hay comportamientos técnicos que no pide ninguna regla escrita:

- `teclado/compu/menu-y-pestanas.ts:21` reintenta el foco a los 60, 150, 350 y 600 ms.
  `dos-focos.ts:30-35` reintenta cada 40 ms, hasta 10 veces, y `dos-focos.ts:40` deja una bandera
  global (`porLaMarca.ahora`) durante 700 ms. Ya existían antes de moverse; lo anoto porque no
  están en ADR-029.
- `teclado/pruebas.ts:15-16` arma para las pruebas una tabla mezclada (la de la computadora y
  después la del celular). Las pruebas del celular corren con las teclas de la computadora
  delante. Además, `teclado/index.ts:5` exporta esa ayuda en el módulo de producción. Se puede
  anotar.

---

## 4. Documentación que quedó atrás

- `proyecto/estado.yml:1650-1653`: RNF-69 sigue en «Nuevo (024): especificación aprobada», con
  `pruebas: []`. No dice qué controles lo verifican (`pnpm capas`, `pnpm limites`) ni lo que falta.
- ADR-028, «Las seis capas», dice que `ui/` tiene pestañas y la paleta. No las tiene: las
  pestañas están en `compu/marco/CabezaDeLaParte.tsx` y la paleta en `pantallas/paleta.css`.
  Tampoco nombra `src/pruebas/` ni `src/fuentes/`.
- ADR-028, «Consecuencias», dice que las hojas globales quedan solo para la paleta y la letra.
  Ver 2.7.
- ADR-029 dice «un solo oyente» y no dice nada del orden de los módulos ni de las marcas. Ver 2.3
  y 2.4.
- `docs/adr/ADR-015-la-interfaz-elegida-es-la-version-5.md:22` nombra `src/pantallas/textos.ts`,
  que ahora es la carpeta `pantallas/textos/`. `CLAUDE.md`, en «La interfaz», dice `textos.ts` y
  «Lo común a las dos (la llamada a la API, el catálogo, el envío sin conexión, la sesión) está
  en `src/`», que ya no es así: ahora está en `datos/` y `negocio/`.
- El plan dice que los controles corren «con `pnpm test`»; corren con `pnpm typecheck`
  (`package.json`, y `ci.yml:36`).
- `specs/001-base-del-sistema/ux.md` no nombra carpetas del código, así que no tenía nada que
  poner al día. ADR-018 (`:22`) sí remite a ADR-028 y ADR-029.

## 5. Pantallas

La funcionalidad no lleva maquetas («No lleva pantallas»). No hay nada que comparar.

## Después de la revisión (2026-10-25)

Lo que frenaba el cierre, resuelto:

1. **Código copiado (E03, SC-01):** T023 y decisión 166. La lógica repetida entre las dos
   interfaces quedó una sola vez; `pnpm limites` falla con cualquier repetición que no sea el
   dibujo del celular parecido al de la computadora (hoy, 0 prohibidas).
2. **Lo guardado y el servidor fuera de `datos/` (E01):** T021. Una regla de `pnpm limites`
   prohíbe `localStorage`, `sessionStorage`, `indexedDB` y `fetch` fuera de `datos/`,
   `plataforma/` y `app/`.
3. **Quién puede anular (E04, Seguridad):** T022. `puede`, `usePuede` y `usePuedeAnular` en
   `negocio/usuarios/`; quién ve cada parte de Vender, en `negocio/permisos/`.

De los defectos del teclado: T024 hizo que reconozca la pantalla solo por marcas del HTML
(`teclado/compu/marcas.ts`) y ADR-029 documenta las marcas y el orden de las piezas. Las teclas
escritas a mano del manual y de cuatro ayudas quedaron en T147. La documentación atrasada
(RNF-69, ADR-028, ADR-015, `CLAUDE.md`, el plan) está al día.

Quedan como defectos, sin frenar: los archivos sueltos en la raíz de `pantallas/` y de `negocio/`,
los estilos globales y la paleta en `pantallas/`, y lógica de pantalla en hooks de cada interfaz
que no es igual entre las dos.
