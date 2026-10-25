# Quickstart: Base del sistema

Cómo se levanta y cómo se prueba el repositorio. Es una guía de uso: nombra comandos y
carpetas. Qué pruebas respaldan cada requerimiento se anota en `proyecto/`, fuera de
`specs/`.

## Levantarlo

Requisitos: Docker con Compose, Node 22 con pnpm 10, y uv.

```bash
cp .env.example .env
pnpm install
docker compose up -d --build --wait
```

Eso levanta la API en http://localhost (vía el Caddy de desarrollo) y un PostgreSQL local.
Los perfiles del compose (`local`: base propia; `gateway`: Caddy) vienen de
`COMPOSE_PROFILES` en el `.env`; no hay que pasarlos por línea de comandos. Las
migraciones se aplican solas al arrancar la API.

El cliente web se sirve aparte, como en producción:

```bash
VITE_API_URL=http://localhost VITE_AMBIENTE=desarrollo VITE_VERSION=local pnpm --filter gestion-del-local-web dev
```

`ORIGEN_WEB` del `.env` tiene que coincidir con el origen desde el que se abre el cliente:
`http://localhost:4173` para `vite preview`, que es el valor de `.env.example`, y
`http://localhost:5173` para `dev`. Con el valor de la plantilla, el cliente en modo `dev`
queda bloqueado por CORS hasta cambiarlo.

El ingreso con Google no funciona en local con el `GOOGLE_CLIENT_ID` de la plantilla; el
resto sí. El primer usuario se crea desde el contenedor:

```bash
docker compose exec comercial node dist/crear-usuario.js correo@gmail.com "Nombre"
```

En pruebas y producción la base es el contenedor `db` de cada ambiente, en la máquina, y el cliente está en GitHub Pages. `master` es
el ambiente de pruebas y `produccion` el de producción; en cada push la máquina se despliega
sola (ADR-012, ADR-013). Pasar a producción: `git push origin master:produccion`. La puesta
en marcha de la máquina está en `deployment/oracle-single/ORACLE.md`.

## Probarlo

Estrategia en ADR-004 y su enmienda del 2026-09-14: las unitarias corren en cada push y son
la red de seguridad del CI; las de punta a punta (E2E) de los caminos principales se lanzan
a mano antes de promover a producción y tras un cambio grande; integración solo sobre lo
estable. Sin compuerta de cobertura ni mutation testing, salvo la capa de datos de cada servicio, que
se prueba contra PostgreSQL con el 100 % de cobertura (enmienda del 2026-10-24).

```bash
tests/utest.sh               # unitarias; la capa de datos, contra la base del compose (la levanta)
node tests/trazabilidad.mjs  # la especificación y el estado coinciden, y specs/ no nombra código
tests/itest.sh --rapido      # paridad de configuración
tests/itest.sh               # integración completa (necesita el stack levantado)
tests/e2e.sh                 # caminos principales, en las dos interfaces (levanta el stack)
```

### Corredores

| Corredor | Qué corre | Necesita |
|---|---|---|
| `tests/utest.sh` | Unitarias del workspace TypeScript (vitest, `pnpm -r test`) y de `listas-de-proveedores` (pytest) | Nada levantado |
| `tests/itest.sh` | Los scripts de `tests/integration/`. `--rapido` saltea los que necesitan el stack | Docker (salvo `--rapido`) |
| `tests/e2e.sh` | Levanta dos stacks (el del compose para la computadora y uno aparte para el celular, `tests/e2e/segundo-stack.yml`), construye y sirve un cliente web contra cada API (`vite preview` en 4173 y 4174; no lo reconstruye si no cambió) y corre los escenarios Playwright de `tests/e2e/escritorio/` (ventana de 1366×768) y `tests/e2e/celular/` (412×915) en Chromium, las dos interfaces a la vez. Al final, solas, las marcadas `@tiempo`. `--solo <nombre>` repite uno. `CARGA=1` activa además la prueba de carga. Con `API_URL`, todo contra ese único stack, de a uno | Docker, pnpm |
| `node tests/trazabilidad.mjs` | Que la especificación (`specs/`) y el estado del proyecto (`proyecto/`) coincidan, que las pruebas que el estado nombra existan y que `specs/` no nombre código | Nada |

### Qué corre en cada push

Workflow `CI` (`.github/workflows/ci.yml`), en cada push a `master` o `produccion` y en cada
pull request:

| Job | Qué hace |
|---|---|
| `typescript` | Instala con el lockfile congelado, chequea tipos, construye y corre las unitarias de la librería de precios, la API y el cliente web (`pnpm test`) |
| `listas-de-proveedores` | `uv sync --frozen` y `pytest` |
| `configuracion` | `tests/itest.sh --rapido` (paridad de los `.env`), `docker compose config` y la trazabilidad entre especificaciones y pruebas |

Solo en un push, y si los tres pasan: `imagenes` (construye y publica en GHCR las dos
imágenes con el SHA corto, en un runner ARM), `avisar` (aviso por ntfy para que la máquina
despliegue) y `cliente-web` (publica en Pages producción en la raíz y pruebas en `/pruebas/`).

### Qué corre a mano

> **En pausa desde el 2026-10-11** (decisión 25 de `docs/decisiones-de-negocio.md`): las
> pruebas de las pantallas y las de punta a punta no corren hasta que se elija la versión
> definitiva de la interfaz. Lo que sigue describe cómo funcionan cuando están activas.

- **Los E2E:** workflow `E2E` (`.github/workflows/e2e.yml`), que se lanza desde la pestaña
  Actions y corre solo los lunes a las 09:00 UTC; o `tests/e2e.sh` en la máquina de
  desarrollo. En el workflow las dos interfaces corren en paralelo, cada una con su stack, y
  cada escenario es un paso del job. Antes de los escenarios corre `tests/itest.sh` completo.
- **La integración completa** (`tests/itest.sh` sin `--rapido`), que necesita el stack.
- **La prueba de carga** (`CARGA=1 tests/e2e.sh --solo carga`): se corre en la notebook del
  local antes del piloto (RNF-07, RNF-08).
- **Lo que no se automatiza:** el escaneo con la cámara real, la instalación como app en el
  celular, la leyenda del ambiente de pruebas y que ninguna pantalla del celular se desplace
  hacia el costado.

## Caminos principales cubiertos por E2E

Cada escenario va dos veces, con el mismo nombre de archivo: en `tests/e2e/escritorio/`
y en `tests/e2e/celular/`. Qué tiene que pasar en cada uno está en los escenarios de
aceptación de la `spec.md` de su capacidad.

| Escenario | Archivo |
|---|---|
| La app abre y el servidor responde; cada interfaz carga solo su hoja de estilos | `00-arranque.spec.ts` |
| Sin sesión se pide entrar; con sesión el dueño ve la administración; vincular el celular con la huella y entrar con ella | `01-login.spec.ts` |
| Cargar una lista de precios y aplicarla | `02-listas.spec.ts` |
| Buscar un producto, elegir su margen o tipear otro margen a mano | `03-productos.spec.ts` |
| Buscar un producto y registrar una venta; ventas del día; anular; «no llevó» | `04-vender.spec.ts` |
| Ingresar mercadería de un proveedor; costo según factura; gasto semanal; anular | `05-compras.spec.ts` |
| Ver el stock valorizado, sus movimientos y corregirlo | `06-stock.spec.ts` |
| Contar un sector y cerrarlo con ajustes | `07-contar.spec.ts` |
| Vender y cambiar un margen sin red, y que llegue todo al volver; la app abre sin red | `08-sin-conexion.spec.ts` |
| Carga del navegador: 50.000 productos y 10.000 ventas (solo con `CARGA=1`) | `09-carga.spec.ts` |
| Vincular el celular por QR y que lo escaneado aparezca en la laptop; asociar un código desconocido | `10-escaner.spec.ts` |
| Sugerir un duplicado entre proveedores, unirlo y ver el más barato como preferido; separar | `11-duplicados.spec.ts` |
| Cerrar la sesión de otro dispositivo, cerrar la propia (vuelve al login) y Salir | `12-cerrar-sesion.spec.ts` |
| El admin administra pero no puede crear, cambiar ni desactivar dueños | `13-admin.spec.ts` |

El escaneo con la cámara real (`10-escaner`) se prueba a mano; la carga (`09-carga`) corre
solo con `CARGA=1`.

## Verificaciones guardadas como integración

| Script | Verifica | Por qué se guardó |
|---|---|---|
| `paridad_env.sh` | Todos los `.env*` declaran las mismas variables; el compose no interpola ninguna sin declarar | Es la que atrapa el error más caro y corre en segundos |
| `health.sh` | Cada servicio responde 200 en `/health` con el stack arriba | Primera verificación después de cualquier despliegue |
| `migraciones.sh` | Todas las migraciones aplicadas y existen las doce tablas de la primera migración | Verifica el arranque real de la API contra la base |
| `listas.sh` | Alta de proveedores, carga con detección automática, vista previa, aplicación, reaplicar no duplica, descartar, archivo irreconocible; la lista real de Ixnova si está en `privado/` | Es el circuito completo de precios contra los dos servicios |
| `puerta.sh` | La puerta del servidor: reparte por ruta, pregunta quién es la persona, borra las cabeceras de identidad que manda el navegador, atiende el CORS y es lo único que se publica (specs/026) | Es la seguridad de la entrada, que las unitarias no ven |
| `base-propia.sh` | La base del ambiente: una base y un usuario por servicio, que no abre las otras; publicada solo en 127.0.0.1; los datos sobreviven a recrear el contenedor; el primer usuario con la base vacía (specs/022) | Es la seguridad de la base, que las unitarias no ven |
| `autenticacion.sh` | 401 sin sesión, 403 por rol, alta de usuario, auditoría, cierre de sesión | Es la puerta de todo; se prueba sin Google sembrando sesiones |

## Unitarias

Corren en cada push (`pnpm test` en el job `typescript`, `tests/utest.sh` en la máquina).
Cada pedido del dueño que cambia un comportamiento trae la suya.

| Dónde | Qué cubre |
|---|---|
| `microservices/comercial` (`src/precios.test.ts`) y `microservices/web` (`src/negocio/precios/`, `src/plataforma/busqueda/`) | Redondeo para arriba a $1.000, precio de venta con margen de botón o tipeado, explicación paso a paso, margen real de un precio a mano; que la vista previa del front haga la misma cuenta que el servidor; búsqueda (orden de palabras, acentos, códigos, velocidad con 50.000 productos) |
| `microservices/comercial` (`src/**/*.test.ts`, base simulada en `src/pruebas/base-falsa.ts`) | Validaciones y permisos de las rutas: margen entero, unidad, foto (subida, servida sin sesión, nombres raros), Excel original de una lista, auditoría paginada, roles (admin no toca dueños), ventas (validación, reenvío sin duplicar, ítems con precio/margen/explicación, stock), unir y separar productos, orden de migraciones |
| La capa de datos de `microservices/comercial` y de `microservices/procesos/servidor` (`src/persistencia/**/*.test.ts`) | Cada consulta contra un PostgreSQL 17 de verdad, con el 100 % de cobertura: si baja, la subida se corta (specs/022, E15–E18). Se corre con `pnpm --filter <paquete> test:persistencia` y necesita `BASE_DE_PRUEBAS`, una cadena con un usuario que pueda crear bases (`tests/utest.sh` la arma con el `db` del compose). Después de una migración nueva, `pnpm --filter <paquete> tablas` vuelve a generar `tablas.ts`; si no, la prueba de `tablas.test.ts` falla |
| `microservices/web` (`src/**/*.test.ts(x)`, jsdom + IndexedDB simulada) | Cantidades enteras o a granel; cola de cambios (orden, fusión por producto, reintentos, rechazos); debounce; atajos sin foco; elección de interfaz por ancho; ambiente de prueba; Desplegable, Explicación «?», foto ampliada y sacar foto; Productos; Vender; Compras; Administración. Cada interfaz tiene las suyas al lado de sus pantallas |
| `microservices/listas` (pytest) | Los lectores contra muestras anonimizadas (y contra las listas reales de `privado/` cuando existen), el cálculo de costo neto, la API del servicio y su token |

## Convenciones de los datos sembrados

Cada escenario E2E arranca sembrando en la base lo que necesita (usuario, sesión, productos)
y termina verificando en pantalla y en la base. No pasan por Google: insertan la sesión con
un token conocido, guardado hasheado como lo hace la API.

- **Correos:** `e2e-*@ferre.test`.
- **Productos:** `(E2E)` en la descripción.
- **Proveedores:** `(e2e)` en el nombre.
- **Ids fijos** por escenario, para poder limpiar: se borran y se vuelven a crear en cada
  corrida.
- Dentro de cada interfaz corren de a uno, porque comparten la base. La computadora y el
  celular van a la vez, cada uno contra su stack (`tests/e2e.sh`); en el CI, un job por
  interfaz.
- **La base, desde las pruebas:** `psql()` de `tests/e2e/comun/stack.ts`, que va por una
  sola conexión abierta y contesta como `psql -tA`. Lo que se comprueba en la base después de
  una acción va con `expect.poll(() => psql(…))`: el servidor puede no haber guardado todavía.
- **Sin esperas fijas:** se espera a una condición (`expect.poll`, un pedido, lo que guarda el
  dispositivo: `tests/e2e/comun/dispositivo.ts`). `waitForTimeout` queda solo cuando el tiempo
  es parte de lo que se prueba (mantener apretado, dos toques seguidos).
- **`@tiempo`:** las pruebas que miden cuánto tarda algo o dependen del reloj llevan esa
  marca y corren al final, solas.
- El conteo en el celular (07) y el celular del escáner (10) fijan su propia ventana de
  390×844; el escáner abre dos navegadores, laptop y celular, en las dos suites.
- Los scripts de integración usan otra marca: correos `prueba-*@ferre.test` y proveedores
  con `(prueba)` en el nombre.
- Las planillas de muestra están anonimizadas y versionadas en
  `microservices/listas/tests/muestras/`; las listas reales viven en
  `privado/`, que no se sube.
