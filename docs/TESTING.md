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
| Cargar una lista de precios y aplicarla | pendiente | Issue #12 |
| Buscar un producto y registrar una venta | pendiente | Issue #15 |
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

## Unitarias

Se escriben donde probar a mano sería más lento: el cálculo de precios y su explicación
(`calculo-de-precios`), los lectores de listas (`listas-de-proveedores`). Hoy: el `/health` de `listas-de-proveedores` y el
orden de archivos del corredor de migraciones.
