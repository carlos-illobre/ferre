# Quickstart: Base del sistema

Cómo se levanta y cómo se prueba. Viene de `README.md`, `docs/TESTING.md` y
`docs/casos-de-prueba-e2e.md`, contrastados con los scripts y los workflows el 2026-10-10.

## Levantarlo

Requisitos: Docker con Compose, Node 22 con pnpm 10, y uv.

```bash
cp .env.example .env
pnpm install
docker compose up -d --build --wait
```

Eso levanta la API en http://localhost (vía el Caddy de desarrollo) y un PostgreSQL local.
Los perfiles del compose (`local`: base propia; `gateway`: Caddy) vienen de
`COMPOSE_PROFILES` en el `.env`; no hace falta pasarlos por línea de comandos. Las
migraciones se aplican solas al arrancar la API.

El cliente web se sirve aparte, como en producción:

```bash
VITE_API_URL=http://localhost pnpm --filter gestion-del-local-web dev
```

`ORIGEN_WEB` del `.env` tiene que coincidir con el origen desde el que se abre el cliente:
`http://localhost:4173` para `vite preview`, que es el valor de `.env.example`, y
`http://localhost:5173` para `dev`. Con el valor de la plantilla, el cliente en modo `dev`
queda bloqueado por CORS hasta cambiarlo.

El ingreso con Google no funciona en local con el `GOOGLE_CLIENT_ID` de la plantilla; el
resto sí. El primer usuario se crea desde el contenedor:

```bash
docker compose exec gestion-del-local node dist/crear-usuario.js correo@gmail.com "Nombre" dueño
```

En pruebas y producción la base es Supabase y el cliente está en GitHub Pages. `master` es
el ambiente de pruebas y `produccion` el de producción; en cada push la máquina se despliega
sola (ADR-012, ADR-013). Pasar a producción: `git push origin master:produccion`. La puesta
en marcha de la máquina está en `deployment/oracle-single/ORACLE.md`.

## Probarlo

Estrategia en ADR-004 y su enmienda del 2026-09-14: las unitarias corren en cada push y son
la red de seguridad del CI; las de punta a punta (E2E) de los caminos principales se lanzan
a mano antes de promover a producción y tras un cambio grande; integración solo sobre lo
estable. Sin compuerta de cobertura ni mutation testing.

```bash
tests/utest.sh               # unitarias, sin nada levantado
node tests/trazabilidad.mjs  # cada escenario de specs/ nombra una prueba que existe
tests/itest.sh --rapido      # paridad de configuración
tests/itest.sh               # integración completa (necesita el stack levantado)
tests/e2e.sh                 # caminos principales, en las dos interfaces (levanta el stack)
```

### Corredores

| Corredor | Qué corre | Necesita |
|---|---|---|
| `tests/utest.sh` | Unitarias del workspace TypeScript (vitest, `pnpm -r test`) y de `listas-de-proveedores` (pytest) | Nada levantado |
| `tests/itest.sh` | Los scripts de `tests/integration/`. `--rapido` saltea los que necesitan el stack | Docker (salvo `--rapido`) |
| `tests/e2e.sh` | Levanta el stack, construye y sirve el cliente web contra esa API (`vite preview` en el puerto 4173) y corre los escenarios Playwright de `tests/e2e/escritorio/` (ventana de 1366×768) y `tests/e2e/celular/` (412×915), en Chromium y de a uno. `--solo <nombre>` repite uno. `CARGA=1` activa además la prueba de carga | Docker, pnpm |
| `node tests/trazabilidad.mjs` | Que cada escenario de aceptación de `specs/*/spec.md` tenga su línea «Prueba:» y que los archivos que nombra existan | Nada |

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

- **Los E2E:** workflow `E2E` (`.github/workflows/e2e.yml`), que se lanza desde la pestaña
  Actions y corre solo los lunes a las 09:00 UTC; o `tests/e2e.sh` en la máquina de
  desarrollo. En el workflow las dos interfaces corren en paralelo, cada una con su stack, y
  cada escenario es un paso del job. Antes de los escenarios corre `tests/itest.sh` completo.
- **La integración completa** (`tests/itest.sh` sin `--rapido`), que necesita el stack.
- **La prueba de carga** (`CARGA=1 tests/e2e.sh --solo carga`): no está en el workflow. Está
  pensada para correrse en la notebook del local antes del piloto.
- **Lo que no se automatiza:** el escaneo con la cámara real, la instalación como app en el
  celular, la leyenda del ambiente de pruebas y que ninguna pantalla del celular se desplace
  hacia el costado.

## Caminos principales cubiertos por E2E

Cada escenario existe dos veces, con el mismo nombre de archivo: en `tests/e2e/escritorio/`
y en `tests/e2e/celular/`. El detalle de cada caso (precondiciones, pasos y resultado
esperado) está en `docs/casos-de-prueba-e2e.md`.

| Escenario | Archivo | Estado |
|---|---|---|
| La app abre y el servidor responde; cada interfaz carga solo su hoja de estilos | `00-arranque.spec.ts` | Hecho |
| Sin sesión se pide entrar; con sesión el dueño ve la administración; vincular el celular con la huella y entrar con ella | `01-login.spec.ts` | Hecho |
| Cargar una lista de precios y aplicarla | `02-listas.spec.ts` | Hecho |
| Buscar un producto, elegir su margen o tipear otro margen a mano | `03-productos.spec.ts` | Hecho |
| Buscar un producto y registrar una venta; ventas del día; anular; «no llevó» | `04-vender.spec.ts` | Hecho |
| Ingresar mercadería de un proveedor; costo según factura; gasto semanal; anular | `05-compras.spec.ts` | Hecho |
| Ver el stock valorizado, sus movimientos y corregirlo | `06-stock.spec.ts` | Hecho |
| Contar un sector y cerrarlo con ajustes | `07-contar.spec.ts` | Hecho |
| Vender y cambiar un margen sin red, y que llegue todo al volver; la app abre sin red | `08-sin-conexion.spec.ts` | Hecho |
| Carga del navegador: 50.000 productos y 10.000 ventas (solo con `CARGA=1`) | `09-carga.spec.ts` | Hecho; se corre a mano |
| Vincular el celular por QR y que lo escaneado aparezca en la laptop; asociar un código desconocido | `10-escaner.spec.ts` | Hecho (el escaneo con cámara real se prueba a mano) |
| Sugerir un duplicado entre proveedores, unirlo y ver el más barato como preferido; separar | `11-duplicados.spec.ts` | Hecho |
| Cerrar la sesión de otro dispositivo, cerrar la propia (vuelve al login) y Salir | `12-cerrar-sesion.spec.ts` | Hecho |
| El admin administra pero no puede crear, cambiar ni desactivar dueños | `13-admin.spec.ts` | Hecho |

«Hecho» quiere decir que el escenario está escrito; al armar esta línea de base no se
corrieron.

## Verificaciones guardadas como integración

| Script | Verifica | Por qué se guardó |
|---|---|---|
| `paridad_env.sh` | Todos los `.env*` declaran las mismas variables; el compose no interpola ninguna sin declarar | Es la que atrapa el error más caro y corre en segundos |
| `health.sh` | Cada servicio responde 200 en `/health` con el stack arriba | Primera verificación después de cualquier despliegue |
| `migraciones.sh` | Todas las migraciones aplicadas y existen las doce tablas del modelo inicial | Verifica el arranque real de la API contra la base |
| `listas.sh` | Alta de proveedores, carga con detección automática, vista previa, aplicación, reaplicar no duplica, descartar, archivo irreconocible; la lista real de Ixnova si está en `privado/` | Es el circuito completo de precios (#7 a #12) contra los dos servicios |
| `autenticacion.sh` | 401 sin sesión, 403 por rol, alta de usuario, auditoría, cierre de sesión | Es la puerta de todo; se prueba sin Google sembrando sesiones |

## Unitarias

Corren en cada push (`pnpm test` en el job `typescript`, `tests/utest.sh` en la máquina).
Cada pedido del dueño que cambia un comportamiento trae la suya.

| Dónde | Qué cubre |
|---|---|
| `libraries/calculo-de-precios` | Redondeo para arriba a $1.000, precio de venta con margen de botón o tipeado, explicación paso a paso, margen real de un precio a mano, búsqueda (orden de palabras, acentos, códigos, velocidad con 50.000 productos) |
| `microservices/gestion-del-local` (`src/**/*.test.ts`, base simulada en `src/pruebas/base-falsa.ts`) | Validaciones y permisos de las rutas: margen entero, unidad, foto (subida, servida sin sesión, nombres raros), Excel original de una lista, auditoría paginada, roles (admin no toca dueños), ventas (validación, reenvío sin duplicar, ítems con precio/margen/explicación, stock), unir y separar productos, orden de migraciones |
| `clientes/gestion-del-local-web` (`src/**/*.test.ts(x)`, jsdom + IndexedDB simulada) | Cantidades enteras o a granel; cola de cambios (orden, fusión por producto, reintentos, rechazos); debounce; atajos sin foco; elección de interfaz por ancho; ambiente de prueba; Desplegable, Explicación «?», foto ampliada y sacar foto; Productos; Vender; Compras; Administración. Cada interfaz tiene las suyas al lado de sus pantallas |
| `microservices/listas-de-proveedores` (pytest) | Los lectores contra muestras anonimizadas (y contra las listas reales de `privado/` cuando existen), el cálculo de costo neto, la API del servicio y su token |

## Convenciones de los datos sembrados

Cada escenario E2E arranca sembrando en la base lo que necesita (usuario, sesión, productos)
y termina verificando en pantalla y en la base. No pasan por Google: insertan la sesión con
un token conocido, guardado hasheado como lo hace la API.

- **Correos:** `e2e-*@ferre.test`.
- **Productos:** `(E2E)` en la descripción.
- **Proveedores:** `(e2e)` en el nombre.
- **Ids fijos** por escenario, para poder limpiar: se borran y se vuelven a crear en cada
  corrida.
- Corren de a uno (`workers: 1`) porque comparten la base del compose.
- El conteo en el celular (07) y el celular del escáner (10) fijan su propia ventana de
  390×844; el escáner abre dos navegadores, laptop y celular, en las dos suites.
- Los scripts de integración usan otra marca: correos `prueba-*@ferre.test` y proveedores
  con `(prueba)` en el nombre.
- Las planillas de muestra están anonimizadas y versionadas en
  `microservices/listas-de-proveedores/tests/muestras/`; las listas reales viven en
  `privado/`, que no se sube.

## Diferencias encontradas con los documentos de origen

- `docs/casos-de-prueba-e2e.md`, caso 00: dice que `/health` responde `ok: true` y `db: ok`;
  el escenario solo comprueba que la respuesta sea exitosa.
- `docs/casos-de-prueba-e2e.md`, sección «Celular (se prueba a mano)»: describe la interfaz
  anterior (menú «Más», barra que titila «de azul a rojo») y dice que los escenarios corren
  solo en escritorio; desde ADR-014 hay una suite de celular.
- `docs/TESTING.md`: `migraciones.sh` «verifica que las tablas del modelo existen»; comprueba
  solo las doce de la primera migración.
- `09-carga.spec.ts` mide una base IndexedDB propia (`ferre-carga`) y una búsqueda escrita en
  la prueba, no la base ni la búsqueda de la app; la búsqueda de la app se mide en
  `libraries/calculo-de-precios/src/busqueda.test.ts`.
- `README.md` no avisa que hay que cambiar `ORIGEN_WEB` para usar el cliente en modo `dev`
  (lo dice `docs/DEPLOYMENT.md`).
