# Tasks: El front, por capas y en piezas chicas

Cada etapa se sube con todas las pruebas en verde y sin cambiar nada a la vista (plan, «Etapas»).

## Tareas

- [x] T001 Mediciones y reglas: ESLint con los límites (`microservices/web/eslint.config.js`), `jscpd` (`.jscpd.json`) y las capas de ADR-028 en `.dependency-cruiser.cjs`, cada uno con la lista de lo que hoy no cumple, en `pnpm test` del CI
- [ ] T002 `app/` y la raíz de `src/`: el arranque a `app/` y cada archivo suelto a su capa (lo de specs/022 y specs/023, cuando terminen) (depende de T001). Hecho: el arranque y la elección de interfaz en `app/`; la conexión, el almacenamiento, la sesión y la huella en `datos/`; el catálogo, las unidades y la lista de permisos en `negocio/`; el ambiente en `plataforma/`. Falta: `espejo` y `puesto` (después de specs/023), `rutas` y `formato` (con el marco, T011)
- [x] T003 `ui/` única: las piezas de las dos interfaces juntas, un solo juego de íconos (incluye T138 de `proyecto/tasks.md`) y la paleta con las variables de tamaño de cada interfaz (depende de T001; no necesita los cuatro archivos que esperan). Hecho: un solo ícono (Lucide) y, en `ui/`, el aviso de abajo, la pantalla de «Listo», los segmentos, el contador, el buscador, el botón y la ventana nativa. La hoja (ventana en la computadora, hoja de abajo en el celular) se junta en la etapa de cada capacidad, con sus estilos (T004 a T011), para no rehacer dos veces los estilos que dependen de ella
- [ ] T004 Ventas: negocio detrás de un hook, lo común en `pantallas/comun/ventas/` (entre otras, la ventana de «Venta registrada», que hoy está en cada interfaz, y la hoja, junta en `ui/`), pantallas en piezas chicas con CSS Modules (depende de T003). Va: Vender de la computadora en `pantallas/compu/ventas/`, 30 piezas con su `.module.css`, igual a la vista (capturas de antes y después); en el negocio, la búsqueda de la venta, el celular que escanea y quitar con «Deshacer», para las dos interfaces. Las hojas globales cargan después que los módulos: donde un módulo pisa una clase global lleva una clase más
- [ ] T005 Catálogo (productos, listas, duplicados), como T004 (depende de T003)
- [ ] T006 Depósito (stock, contar, ingreso, pedidos), como T004 (depende de T003)
- [ ] T007 Compras, como T004 (depende de T003)
- [ ] T008 Negocio y usuarios (resumen, usuarios, roles, quién hizo qué), como T004 (depende de T003)
- [ ] T009 Anomalías y para revisar, como T004 (depende de T003)
- [ ] T010 Mejoras y errores, configuración y sistema, como T004 (depende de T003)
- [ ] T011 Entrada, vínculo y el marco (menú, pestañas, Más), como T004 (depende de T003)
- [ ] T012 Teclado: `plataforma/teclado/` ejecuta la tabla de teclas de cada pantalla, con T147 de `proyecto/tasks.md` (depende de T004 a T011)
- [ ] T013 Cierre: la lista de excepciones vacía, ADR-018 y `001/ux.md` al día con las carpetas, y la documentación de `tests/capturas/` (depende de T012)
- [ ] T014 Revisión independiente (paso 7) (depende de T013)
