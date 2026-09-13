# Pruebas

Estrategia en [ADR-004](adr/ADR-004-estrategia-de-pruebas.md): E2E de los caminos
principales como red de seguridad; unitarias solo donde aceleran; integración solo sobre
lo estable. Sin compuerta de cobertura ni mutation testing.

## Corredores

| Corredor | Qué corre | Necesita |
|---|---|---|
| `tests/e2e.sh` | Levanta el stack, construye y sirve el cliente web contra esa API, corre los escenarios Playwright de `tests/e2e/escenarios/`. `--solo <nombre>` repite uno. | Docker, pnpm |
| `tests/utest.sh` | Unitarias del workspace TypeScript (vitest) y de `listas-de-proveedores` (pytest) | Nada |
| `tests/itest.sh` | Scripts de `tests/integration/`. `--rapido` saltea los que necesitan el stack. | Docker (salvo `--rapido`) |

## Caminos principales cubiertos por E2E

| Escenario | Archivo | Estado |
|---|---|---|
| La app abre y el servidor responde | `00-arranque.spec.ts` | Hecho |
| Sin sesión se pide entrar; con sesión el dueño ve la administración | `01-login.spec.ts` | Hecho |
| Cargar una lista de precios y aplicarla | `02-listas.spec.ts` | Hecho |
| Buscar un producto, elegir su margen y fijar un precio a mano | `03-productos.spec.ts` | Hecho |
| Buscar un producto y registrar una venta; ventas del día; anular; "no llevó" | `04-vender.spec.ts` | Hecho |
| Ingresar mercadería de un proveedor | pendiente | Issue #30 |
| Contar un sector y ajustar stock | pendiente | Issue #31 |
| Ver el stock valorizado | pendiente | Issue #33 |

Cada issue de esa lista agrega su escenario antes de cerrarse.

## Verificaciones guardadas como integración

| Script | Verifica | Por qué se guardó |
|---|---|---|
| `paridad_env.sh` | Todos los `.env*` declaran las mismas variables; el compose no interpola ninguna sin declarar | Es la que atrapa el error más caro y corre en segundos |
| `health.sh` | Cada servicio responde 200 en `/health` con el stack arriba | Primera verificación después de cualquier despliegue |
| `migraciones.sh` | Todas las migraciones aplicadas y las tablas del modelo existen | Verifica el arranque real de la API contra la base |
| `listas.sh` | Alta de proveedores, carga con detección automática, vista previa, aplicación, reaplicar no duplica, descartar, archivo irreconocible; la lista real de Ixnova si está en `privado/` | Es el circuito completo de precios (#7 a #12) contra los dos servicios |
| `autenticacion.sh` | 401 sin sesión, 403 por rol, alta de usuario, auditoría, login por QR de punta a punta, cierre de sesión | Es la puerta de todo; se prueba sin Google sembrando sesiones |

## Unitarias

Se escriben donde probar a mano sería más lento: el cálculo de precios y su explicación
(`calculo-de-precios`), los lectores de listas (`listas-de-proveedores`). Hoy: el precio de
venta con su redondeo y explicación, el margen real de un precio manual, la búsqueda (orden
de palabras, acentos, códigos, velocidad con 50.000 productos), los cuatro lectores contra
muestras anonimizadas (y contra las listas reales de `privado/` cuando existen), el cálculo
de costo neto, la API del servicio de listas, y el orden de archivos del corredor de
migraciones.
