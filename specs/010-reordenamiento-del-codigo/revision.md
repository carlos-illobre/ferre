# Revisión: Reordenamiento del código

Revisión independiente (paso 7) del 2026-10-14, sobre `spec.md`, `plan.md`, `tasks.md`, la
maqueta `maquetas/piezas-unificadas.html`, ADR-018, las decisiones 84 y 85, RNF-60 en
`proyecto/estado.yml` y los commits `git log --grep 010-T` (de `4b227a4` a `b22ffa7`).

**Lo que se corrió:** en `microservices/web` y `microservices/api`, `vitest run` (web: 41
archivos y 242 pruebas; api: 18 archivos y 112 pruebas, todas pasan), `pnpm capas` (sin
violaciones en los dos) y `tsc --noEmit` (sin errores en los dos). En la raíz,
`node tests/trazabilidad.mjs` y `node tests/compuerta.mjs revisar` pasan (solo avisos de
otros requerimientos).

**Lo que no se pudo comprobar:** las pruebas de punta a punta (no se levantó Docker), el
despliegue en pruebas con los mismos nombres de servicio e imagen andando de verdad, la vuelta
atrás de una etapa, ni cómo se ven las piezas en un navegador (las piezas se compararon leyendo
el CSS contra las imágenes de la maqueta).

**Resumen:** 18 puntos. Frenan el cierre 3 (1.1, 1.2 y 1.3); los otros 15 son defectos para
anotar (uno de ellos, 5.2, no se pudo confirmar).

---

## 1. Escenarios sin cumplir

### 1.1 E05: el vínculo con el celular y la entrada con Google siguen escritos dos veces — **frena el cierre**

- **Dónde:** `microservices/web/src/pantallas/compu/Vender.tsx:411-425` y
  `microservices/web/src/pantallas/celular/componentes/VincularCelular.tsx:13-33` (los dos piden
  `POST /puestos`, arman el QR y consultan `/puestos/:id` cada 2 s);
  `pantallas/compu/base/pantallas/VincularCelular.tsx:19` y
  `pantallas/celular/pantallas/VincularCelular.tsx:16` (los dos llaman a
  `/puestos/:codigo/vincular`); `pantallas/compu/base/pantallas/Entrar.tsx:80` y
  `pantallas/celular/pantallas/Login.tsx:28` (los dos llaman a `/sesiones/google`).
- **Qué dice la especificación:** E05, «la regla de un proceso está una sola vez y la usan las
  pantallas del celular y las de la computadora»; T006, marcada hecha, dice «usuarios,
  sesiones, **vínculo** y lo de Más una sola vez».
- **Qué hace el código:** el vínculo no tiene nada en `src/negocio/` (`negocio/usuarios.ts` no
  lo nombra). Las dos copias ya divergen: la de la computadora avisa que el código venció y
  corta la consulta al desmontarse; la del celular no avisa y deja el `setInterval`
  corriendo si la pantalla se cierra antes de que se vincule. Es justo la clase de defecto que
  el reordenamiento quería terminar.
- `proyecto/estado.yml` (RNF-60) no dice que el vínculo esté unificado, pero `tasks.md` sí lo da
  por hecho. O se unifica, o T006 se reabre y la parte que falta queda anotada.

### 1.2 E06: «el servidor confirma al cobrar» no confirma el precio — **frena el cierre**

- **Dónde:** `microservices/api/src/ventas/reglas.ts:39-56`.
- **Qué dice la especificación:** E06, «el front no calcula precios, salvo la vista previa de un
  margen o un precio tipeado, **que el servidor confirma al cobrar**»; la aclaración de la
  sesión (decisión 84): «la vista previa la calcula el front y el servidor confirma»; el plan
  («Seguridad»): «el servidor ya recalcula al cobrar y es quien manda; la vista previa del
  front no se guarda ni se cobra sin esa confirmación».
- **Qué hace el código:** el servidor toma tal cual el `precio_unitario`, el `costo_neto`, el
  `margen_aplicado` y la `explicacion` que manda el front, y solo recalcula el subtotal de
  cada renglón (redondeo a $1.000) y el total. No vuelve a calcular el precio desde el costo y
  el margen, ni comprueba que el precio, el costo y el margen guardados en el renglón
  coincidan entre sí. Era igual antes del reordenamiento (`4b227a4`), así que no es una
  regresión, pero la especificación y el plan afirman algo que el código no hace.
- **Qué falta decidir:** con el precio tipeado permitido a cualquiera que venda, no hay precio
  «correcto» que confirmar en ese caso; sí se podría recalcular el precio de un renglón con
  margen y rechazar o corregir el que no coincide, y guardar el costo leído de la base en vez
  del que manda el front. Hay que decidir si «confirma» quiere decir eso (y hacerlo, con su
  prueba) o solo «recalcula el total» (y corregir E06, el plan y la decisión 84). Ninguna
  prueba nombra esa confirmación: las dos de `010-E06`
  (`api/src/rutas/productos.test.ts:27`, `api/src/rutas/ventas.test.ts:119`) prueban el precio
  que se manda con el producto y el subtotal de las ventas del día.

### 1.3 RNF-60: la forma de los datos no llega del servidor salvo en las ventas, y el ADR da por adoptadas librerías que no están — **frena el cierre**

- **Dónde:** `microservices/api/src/contratos/` tiene un solo archivo, `ventas.ts`; el front usa
  `@servidor/` solo en `negocio/ventas/venta.ts:1` y `negocio/ventas/ventas-del-dia.ts:3`.
  `microservices/web/src/producto.ts:2` escribe a mano el tipo `Producto`, que es lo que más
  viaja. `microservices/web/package.json` no tiene `zod` ni `react-router`;
  `microservices/api/package.json` tampoco tiene `zod`.
- **Qué dice la especificación:** RNF-60, «lo que el front necesita saber de la forma de los
  datos lo recibe del servidor». ADR-018, punto 5 de la decisión
  (`docs/adr/ADR-018-servicios-y-capas.md:27`): «TanStack Query, Zod con el cliente tipado de
  Hono, React Router y Kysely»; y en la línea 43: «Mientras el servidor no esté en tres capas
  (etapa 5), se escribe a mano el contrato de cada tema que se va unificando», o sea que,
  terminada la etapa 5, los contratos deberían llegar del servidor.
- **Qué hace el código:** la etapa 5 está terminada y solo las ventas tienen contrato. Zod, el
  cliente tipado de Hono y React Router no se adoptaron; la navegación sigue siendo propia
  (`plataforma/navegacion/rutas-por-hash.ts`). No hay ninguna tarea abierta, en este
  `tasks.md` ni en `proyecto/tasks.md`, que diga que eso falta.
- Para cerrar hace falta una de dos: hacerlo, o anotar como pendiente lo que falta (contratos
  del resto de los temas; Zod y React Router, o la decisión de no usarlos) y corregir el ADR
  para que no dé por hecho lo que no está. Si no, otro agente que lea el ADR va a buscar algo
  que no existe.

### 1.4 E05: los pedidos a proveedores siguen en la pantalla — defecto

- **Dónde:** `microservices/web/src/pantallas/Pedidos.tsx:64-383` (siete llamadas directas al
  servidor).
- **Qué dice:** T004 (marcada hecha) incluye «pedidos» en el negocio de depósito; ADR-018 dice
  que cada tema tiene su consulta en `negocio/` y las pantallas solo muestran.
- **Qué hace:** no hay `negocio/deposito/pedidos.ts`. Como `Pedidos.tsx` es una sola pantalla
  para los dos lados, la regla no está repetida (E05 se cumple en lo que pide), pero la capa no
  se respeta y `proyecto/estado.yml` (RNF-60) no lo nombra. Lo mismo pasa, con menos peso, en
  `Roles.tsx`, `tickets.ts`, `Vinculo.tsx`, `PedirFoto.tsx`, `PedidosDeLaCompu.tsx`,
  `FotoParaLaCompu.tsx`, `Anomalias.tsx` y `DineroInvertido.tsx`, que hablan con el servidor
  directamente.

### 1.5 E05: los renglones de la venta calculan su subtotal en cada pantalla — defecto

- **Dónde:** `pantallas/celular/Vender.tsx:289` y `pantallas/compu/Vender.tsx:276` llaman a
  `subtotalDeRenglon` por su cuenta; los dos también importan `margenReal`.
- **Qué hace:** la cuenta está en `negocio/precios/vista-previa.ts` (una sola), pero cada
  pantalla decide cuándo y cómo usarla. Convendría que `negocio/ventas/venta.ts` entregue el
  renglón ya calculado.

### 1.6 E06: los precios de los cinco márgenes llegan y nadie los usa — defecto

- **Dónde:** el servidor los manda (`api/src/productos/reglas.ts:17`, campo `precios`), el tipo
  los declara (`web/src/producto.ts:12`) y ningún archivo del front los lee. Los botones de
  margen muestran el porcentaje y, al elegir uno, el precio se vuelve a calcular con la vista
  previa (`negocio/catalogo/precio.ts:15`).
- E06 queda cumplido del lado del servidor (con prueba en `api/src/rutas/productos.test.ts:34`),
  pero es un dato que viaja sin uso. Anotarlo o usarlo para la vista previa de un botón.

### 1.7 Escenarios sin una prueba que los nombre

- E04 lo prueba el control de `pnpm capas` (`microservices/web/.dependency-cruiser.cjs`), que
  corre en CI con `pnpm typecheck`. Bien.
- E01 y E07 se comprueban mirando el repositorio: todo el código está bajo `microservices/` y no
  hay `libraries/` (comprobado). No hay un control automático que impida que vuelva una carpeta
  de librerías compartidas. Defecto menor.
- E02, E03, E08 y E09 son del proceso de despliegue y de trabajo: no los pude comprobar. Lo que
  sí vi: ninguna etapa agrega migraciones (E08) y CI sigue construyendo
  `gestion-del-local` y `listas-de-proveedores` (E03).
- Las pruebas que se tocaron cambiaron dónde vive algo, no qué comprueban (el cambio de clase
  `coral` → `principal` en `celular/Negocio.test.tsx` y `tests/e2e/celular/12-cerrar-sesion.spec.ts`
  sigue la decisión 85; la prueba de la foto que se cierra con «volver» pasó a
  `pantallas/celular/componentes/Foto.test.tsx`).

## 2. Seguridad

### 2.1 Mismas rutas, misma sesión, mismos permisos — sin hallazgos

Comparé, archivo por archivo, las verificaciones de sesión y de permiso de las rutas del
servidor antes (`4b227a4`) y ahora. Son las mismas; las que bajaron en cantidad
(`catalogo.margenes` en productos, `puede(` en pedidos) pasaron a las reglas con el mismo
efecto (`api/src/productos/reglas.ts:32`, `api/src/rutas/pedidos.ts:11`).

### 2.2 Tipos que viajan solo al compilar — sin hallazgos

`api/src/contratos/ventas.ts` tiene solo tipos y el front lo importa con `import type`. No
encontré código ni nombres de tablas del servidor en el front.

### 2.3 El costo solo para quien tiene «Ver costos» — defecto (documentación)

- **Dónde:** `api/src/rutas/productos.ts:12-15` manda `costo_neto` a cualquiera con sesión; la
  explicación del precio que agrega el servidor (`explicacion_precio`, de
  `api/src/precios.ts:38`) empieza con «Costo $…».
- Es lo mismo que antes (el defecto ya está anotado en `proyecto/estado.yml:642`), así que el
  plan («el costo **sigue** saliendo solo para quien tiene Ver costos») se cumple en el sentido
  de que no empeoró. Pero la razón que da ese defecto, «el precio se calcula en el
  dispositivo», ya no es cierta después de la etapa 4: el servidor calcula el precio y podría
  dejar de mandar el costo (y la explicación con el costo) a quien no tiene el permiso, salvo
  por la venta sin conexión con un margen cambiado. Corregir el texto del defecto y decidir si
  ahora se arregla.

### 2.4 Consultas con valores como parámetros — sin hallazgos de inyección; un defecto

- Las consultas con la plantilla `sql` de Kysely y con `pool.query` usan parámetros. Los dos
  lugares que arman texto de SQL con `${…}` usan nombres fijos: `api/src/productos/datos.ts:87-89`
  (columnas del `UPDATE`, que hoy salen solo de claves validadas en
  `productos/reglas.ts:29-52`) y `api/src/duplicados/datos.ts:98` (tablas de una lista fija).
- Defecto: `productos/datos.ts:cambiar` acepta cualquier nombre de columna; su seguridad depende
  de que quien lo llame filtre las claves. Convendría que el tipo de `cambios` solo admita las
  columnas permitidas.

### 2.5 Librerías nuevas en versión exacta — sin hallazgos

`@tanstack/react-query` 5.104.2, `kysely` 0.29.6 y `dependency-cruiser` 18.6.0 están fijas.

### 2.6 El control de la plataforma no ve el código del servidor — defecto

- **Dónde:** `microservices/web/.dependency-cruiser.cjs:10`. La regla prohíbe que
  `src/plataforma/` importe algo de `src/` fuera de su carpeta, pero un `@servidor/...` resuelve
  a `../api/src/contratos/...`, que no empieza con `src/`, así que una pieza de la plataforma
  podría depender de los contratos de Ferrebress sin que el control falle.

## 3. Reglas inventadas

### 3.1 Capas del front: el negocio importa de las pantallas — defecto

- **Dónde:** `web/src/negocio/ventas/venta-en-espejo.ts:1` importa el tipo `Producto` de
  `pantallas/celular/pantallas/Productos`. ADR-018 pone las pantallas encima del negocio y el
  control automático solo vigila la plataforma, así que esto no lo frena nada.

### 3.2 Rutas del servidor con reglas adentro — defecto

- **Dónde:** `api/src/rutas/pedidos-de-foto.ts` (79 líneas) guarda los pedidos de foto en
  memoria, valida tipo y tamaño de la foto y decide vencimientos en la ruta, sin
  `reglas.ts`. ADR-018: «La ruta solo traduce… No tiene SQL ni reglas». `proyecto/estado.yml`
  dice «todo el servidor está en tres capas». No toca la base, por eso `pnpm capas` no lo ve.

No encontré otro comportamiento que ninguna regla escrita pida.

## 4. Documentación que quedó atrás

### 4.1 ADR-018 y RNF-60 (ver 1.3) — incluido en el punto que frena el cierre

### 4.2 Decisión 85: «el botón grande de cobrar sigue mostrando el importe adentro» — defecto

- **Dónde:** `docs/decisiones-de-negocio.md:633` y `docs/sistema-visual.md:42`.
- **Qué hace el código:** «Registrar ingreso» lleva el importe adentro
  (`pantallas/celular/Deposito.tsx:269-271`), pero «Cobrar» no: el total va al lado, en
  `cobro-total` (`pantallas/celular/Vender.tsx:257-258`). Ya era así antes de la decisión 85
  (`b22ffa7~1`), así que es la documentación la que dice algo que no pasa. Corregirla o
  preguntarle a Carlos cuál quería.

### 4.3 ADR-015 sigue diciendo dónde vive cada cosa con las carpetas viejas — defecto

- **Dónde:** `docs/adr/ADR-015-la-interfaz-elegida-es-la-version-5.md:59-67` (tabla con
  `clientes/gestion-del-local-web/…`, `src/v2/`, `src/componentes/`) y la enmienda de la línea
  93 («lo común en `src/`»). `CLAUDE.md` manda a leer ese ADR para saber «dónde vive cada
  cosa». La enmienda debería apuntar a ADR-018 y a `plataforma/`, `negocio/` y `pantallas/`.

### 4.4 RNF-60 en `proyecto/estado.yml` — defecto

- No nombra que pedidos (T004) y vínculo (T006) no quedaron en `negocio/`, ni que los
  contratos del servidor existen solo para las ventas. Tampoco lista pruebas de las piezas de
  interfaz: `plataforma/interfaz/`, `plataforma/camara/`, `plataforma/sin-conexion/`,
  `plataforma/almacenamiento/` y `plataforma/tiempo-real/` no tienen pruebas propias (se
  ejercitan a través de las pantallas).

## 5. Pantallas (maqueta `piezas-unificadas.html`)

Comparé las imágenes «celular, unificado» y «computadora» con
`plataforma/interfaz/piezas.css`, `pantallas/piezas.css` y `plataforma/camara/escaner.css`.
Botones (principal naranja con borde, común blanco, peligro con borde rojo, chicos), avisos (ícono,
borde, acción a la derecha), aviso flotante oscuro con tilde verde, hoja con cabecera y cruz que
sube desde abajo en el celular, y visor con guía naranja y panel verde oscuro: coinciden.

### 5.1 Visor de la cámara: el texto de «Cerrar» — defecto

- **Dónde:** `plataforma/camara/escaner.css:16` pone el texto del botón «Cerrar» en blanco
  (`--pz-sobre-accion`). En la maqueta (celular y computadora) el texto es oscuro, y antes de
  la unificación la computadora lo tenía oscuro (`color: var(--tinta)` en el `base.css` de
  `b22ffa7~1`). La decisión 85 dice que «la computadora no cambia», y acá cambia.

### 5.2 Visor: lo último leído en verde — no lo pude confirmar

- `.escaner-leido` (`escaner.css:13`) pinta lo último leído en verde claro; en la maqueta
  («Agregado: MECHA 8 MM…») se ve blanco. No pude saber si la captura se hizo sin esa clase;
  conviene mirarlo con `tests/capturas/`.

### 5.3 Colores fijos fuera de la paleta — defecto

- **Dónde:** `pantallas/piezas.css:21` y `:25-36` fijan a mano rojos, verdes y el borde de la
  información (`#b3301a`, `#0f6b45`, `#8fc7b0`…), copiados de
  `pantallas/compu/base/estilos/tokens.css`. La decisión 85 dice que las piezas «toman los
  colores de la paleta» y `CLAUDE.md` que la paleta es una sola (`paleta.css`). Se ven igual,
  pero un cambio de color en la paleta no les llega.
