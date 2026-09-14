# Pruebas

Estrategia en [ADR-004](adr/ADR-004-estrategia-de-pruebas.md) y su enmienda del
2026-09-14: **las unitarias corren en cada push** y son la red de seguridad del CI; los
E2E de los caminos principales se lanzan a mano (workflow "E2E" en Actions, o
`tests/e2e.sh` en la máquina) antes de promover a producción y tras un cambio grande;
integración solo sobre lo estable. Sin compuerta de cobertura ni mutation testing.

## Corredores

| Corredor | Qué corre | Necesita |
|---|---|---|
| `tests/e2e.sh` | Levanta el stack, construye y sirve el cliente web contra esa API, corre los escenarios Playwright de `tests/e2e/escenarios/`. `--solo <nombre>` repite uno. En GitHub: workflow "E2E", a mano o los lunes. | Docker, pnpm |
| `tests/utest.sh` | Unitarias del workspace TypeScript (vitest) y de `listas-de-proveedores` (pytest) | Nada |
| `tests/itest.sh` | Scripts de `tests/integration/`. `--rapido` saltea los que necesitan el stack. | Docker (salvo `--rapido`) |

## Caminos principales cubiertos por E2E

El detalle de cada caso (precondiciones, pasos y resultado esperado) está en
[casos-de-prueba-e2e.md](casos-de-prueba-e2e.md).

| Escenario | Archivo | Estado |
|---|---|---|
| La app abre y el servidor responde | `00-arranque.spec.ts` | Hecho |
| Sin sesión se pide entrar; con sesión el dueño ve la administración | `01-login.spec.ts` | Hecho |
| Cargar una lista de precios y aplicarla | `02-listas.spec.ts` | Hecho |
| Buscar un producto, elegir su margen o tipear otro margen a mano | `03-productos.spec.ts` | Hecho |
| Buscar un producto y registrar una venta; ventas del día; anular; "no llevó" | `04-vender.spec.ts` | Hecho |
| Ingresar mercadería de un proveedor; costo según factura; gasto semanal; anular | `05-compras.spec.ts` | Hecho |
| Contar un sector desde el celular y cerrarlo con ajustes | `07-contar.spec.ts` | Hecho |
| Vender y cambiar un margen sin red, y que llegue todo al volver; la app abre sin red | `08-sin-conexion.spec.ts` | Hecho |
| Carga del navegador: 50.000 productos y 10.000 ventas (solo con `CARGA=1`) | `09-carga.spec.ts` | Hecho |
| Vincular el celular por QR y que lo escaneado aparezca en la laptop; asociar un código desconocido | `10-escaner.spec.ts` | Hecho (el escaneo con cámara real se prueba a mano) |
| Sugerir un duplicado entre proveedores, unirlo y ver el más barato como preferido | `11-duplicados.spec.ts` | Hecho |
| Cerrar la sesión de otro dispositivo, cerrar la propia (vuelve al login) y Salir | `12-cerrar-sesion.spec.ts` | Hecho |
| El admin administra pero no puede crear, cambiar ni desactivar dueños | `13-admin.spec.ts` | Hecho |
| Ver el stock valorizado, sus movimientos y corregirlo | `06-stock.spec.ts` | Hecho |

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

Corren en cada push (`pnpm test` en el job `typescript`, `tests/utest.sh` en la máquina).
Cada pedido del dueño que cambia un comportamiento trae la suya.

| Dónde | Qué cubre |
|---|---|
| `libraries/calculo-de-precios` | Redondeo para arriba a $1.000, precio de venta con margen de botón o tipeado, explicación paso a paso, margen real de un precio a mano, búsqueda (orden de palabras, acentos, códigos, velocidad con 50.000 productos) |
| `microservices/gestion-del-local` (`src/**/*.test.ts`, base simulada en `src/pruebas/base-falsa.ts`) | Validaciones y permisos de las rutas: margen entero, unidad, foto (subida, servida sin sesión, nombres raros), Excel original de una lista, auditoría paginada, roles (admin no toca dueños), ventas (validación, reenvío sin duplicar, ítems con precio/margen/explicación, stock), unir y separar productos, orden de migraciones |
| `clientes/gestion-del-local-web` (`src/**/*.test.tsx`, jsdom + IndexedDB simulada) | Cantidades enteras o a granel; cola write-ahead (orden, fusión por producto, reintentos, rechazos); debounce; atajos sin foco; Desplegable, Explicación "?", foto ampliada y sacar foto; Productos (precio, memoria del margen, otro margen en %, carga de a 30, bajar lista, varios proveedores); Vender (precio, cantidades, unidad guardada, a mano por renglón, avisos que se van solos, cobro, Ventas de hoy plegables, No llevó); Compras (cantidades, compras recientes desplegables, registrar); Administración (auditoría paginada, admin sin tocar dueños, sesiones) |
| `microservices/listas-de-proveedores` (pytest) | Los lectores contra muestras anonimizadas (y contra las listas reales de `privado/` cuando existen), el cálculo de costo neto, la API del servicio |
