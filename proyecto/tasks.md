# Tasks: plan de Ferretería

Las tareas del proyecto, por etapa. **Este archivo es la fuente de verdad**: lo lee el
tablero del portafolio, y una tarea existe cuando está escrita acá.

Cada tarea es una línea. Entre corchetes van quién la hace (`[carlos]` o `[agente]`),
la prioridad si no es la normal (`[alta]`, `[baja]`), `[definir]` si antes Carlos
tiene que decidir algo y `[en curso]` mientras se hace. Al final, entre paréntesis, de
qué depende, cuánto lleva y entre qué fechas va:

    - [ ] T041 [carlos] [alta] Llamar al plomero (depende de T040) (estimación 2h) (2026-10-20 a 2026-10-22)

Una tarea nueva lleva el número que sigue al más alto del archivo y va bajo su etapa. Al
terminarla se marca `[x]`; no se borra. El `(#N)` del final es el issue de GitHub del
que salió cada una, el 2026-10-13; los issues ya no se usan.

## Etapa 0 · Base del proyecto

- [x] T001 [definir] Ordenar el repositorio y proteger los datos de proveedores (#1)
- [x] T002 [definir] Decidir stack técnico y arquitectura offline-first (ADR-001) (#2)
- [x] T003 Andamiaje del proyecto: arranque con un comando, tests y CI (depende de T002) (#3)
- [x] T004 Documentar el procedimiento actual del empleado (venta y compra) (#4)
- [x] T005 Principios de diseño de la interfaz (guía UX) (depende de T004) (#5)
- [x] T051 [definir] Separar backend y cliente web en dos servicios; publicar el cliente en GitHub Pages (depende de T003) (#51)
- [x] T053 Ambientes de prueba y producción en la misma máquina, con despliegue desde CI (#53)
- [x] T100 [agente] Poner al día la especificación con todo lo decidido el 12 y 13 de octubre (estimación 3h) (#100)

## Etapa 1 · MVP

- [x] T006 Modelo de datos inicial (depende de T003) (#6)
- [x] T007 Importador Comodo (LISTA GENERAL) (depende de T006) (#7)
- [x] T008 Importador 3GE (depende de T006) (#8)
- [x] T009 Importador ERPA (depende de T006) (#9)
- [x] T010 Importador Ixnova (depende de T006) (#10)
- [ ] T011 [agente] [definir] Definir el costo neto comparable entre proveedores (depende de T007, T008, T009, T010) (#11)
- [x] T012 Pantalla de carga de lista de precios (depende de T007, T008, T009, T010, T011) (#12)
- [x] T013 Selector de margen por producto (300 / 200 / 100 / 50 / 25 %) con costo visible (depende de T011) (#13)
- [x] T014 Búsqueda instantánea de productos (depende de T007, T008, T009, T010, T013) (#14)
- [x] T015 Pantalla de venta (mostrador) (depende de T005, T013, T014) (#15)
- [x] T016 Ventas del día, corrección y anulación (depende de T015) (#16)
- [x] T017 Producto no encontrado: ítem libre y alta rápida desde la venta (depende de T015) (#17)
- [x] T018 Funcionamiento sin internet desde el navegador (PWA) y sincronización (depende de T003, T006) (#18)
- [x] T019 [agente] Poner la app en la nube y acceder desde laptop y celular sin instalar nada (depende de T003) (#19)
- [ ] T020 [carlos] Cargar las últimas 2 semanas del cuaderno como ventas históricas (depende de T013, T015) (#20)
- [ ] T021 [carlos] Prueba piloto de 2 semanas con el empleado (depende de T016, T017, T018, T019, T020, T030, T031, T033) (#21)
- [x] T029 Producto equivalente en varios proveedores (depende de T030) (#29)
- [x] T030 Ingreso de mercadería (compra a proveedor) (depende de T015) (#30)
- [x] T031 Conteo cíclico de stock con el celular (depende de T018, T030) (#31)
- [x] T033 Stock actual y valorización del inventario (depende de T030, T031) (#33)
- [x] T041 Autenticación: solo usuarios autorizados entran; roles dueño y mostrador; auditoría (depende de T006) (#41)
- [x] T047 Todo número calculado muestra de dónde sale (depende de T011, T013) (#47)
- [x] T052 Escanear código de barras con la cámara del celular (depende de T014) (#52)
- [ ] T056 [agente] Corregir una venta ya registrada y ver las ventas de días anteriores (depende de T016) (#56)
- [ ] T057 [agente] Cuenta corriente: marcar una venta como pagada desde la pantalla (depende de T015) (#57)
- [ ] T060 [agente] Precio a mano en la venta: respetarlo tal cual y avisar si no es múltiplo de $1.000 (depende de T015) (#60)
- [x] T061 Adaptar los escenarios de punta a punta a la versión 5 (#61)
- [x] T062 [agente] Escanear el código de barras de un producto para cargárselo, y buscar un producto escaneando (estimación 3h) (#62)
- [x] T065 [agente] La app instalada tiene que actualizarse sola cuando hay cambios (estimación 2h) (#65)
- [x] T066 [agente] Entrada del celular con la disposición de la referencia de Carlos (estimación 2h) (#66)
- [x] T067 [agente] El botón de volver de Android cierra el escáner en vez de salir de la app (estimación 1h) (#67)
- [x] T068 [agente] El botón de volver del celular cierra la ventana abierta (ficha, hojas) en vez de cambiar de pantalla (estimación 1h) (#68)
- [x] T069 [agente] El catálogo del celular tarda unos segundos en mostrarse al recargar: mostrar los primeros y seguir cargando de fondo (estimación 3h) (#69)
- [x] T070 [agente] Al escanear en Vender queda una pantalla verde sin botones (estimación 1h) (#70)
- [x] T071 [agente] En el celular: al entrar, siempre Catálogo; y cada parte del menú abre su primera pestaña (estimación 1h) (#71)
- [x] T076 [agente] El escáner se cierra solo al leer un código, y sin botón Enviar (estimación 1h) (#76)
- [x] T077 [agente] Teclado en la computadora: el menú no mueve la lista, baja hasta Desvincular y Salir, y la derecha entra a las pestañas (estimación 2h) (#77)
- [x] T082 [agente] Celular, Más: botón Volver en cada pantalla para regresar al menú de Más (estimación 1h) (#82)
- [x] T088 [agente] Celular, Más: «Salir» con el mismo aspecto que las demás opciones (#88)
- [ ] T091 [definir] Monitor externo que consulte la API y la base a diario y avise si dejan de responder (estimación 1h) (#91)
- [ ] T092 [agente] [definir] Copias de seguridad de la base: cada hora, semanal fuera del servidor y prueba mensual de restauración (estimación 2d) (#92)
- [x] T098 [agente] Vender con tres pestañas: Vender, Hoy y Anular (estimación 4h) (#98)
- [x] T099 [agente] Computadora: Pausar y Desvincular no muestran el borde de foco al llegar con las flechas (#99)

## Etapa 2 · Precios automáticos

- [ ] T022 [agente] Importador genérico con detección de formato y mapeo guardado por proveedor (depende de T012) (#22)
- [ ] T023 [agente] Historial de precios por producto y proveedor (depende de T022) (#23)
- [ ] T024 [agente] Alertas de remarcado tras una importación (depende de T013, T023) (#24)
- [ ] T025 [agente] Ingesta automática de listas desde el correo (depende de T022, T012) (#25)
- [ ] T026 [agente] [definir] Relevar proveedores con portal web y construir el primer conector (depende de T022) (#26)
- [ ] T027 [agente] Listas en PDF (depende de T022) (#27)
- [ ] T028 [agente] Incorporar el resto de los proveedores (de 4 a 50) (depende de T022) (#28)
- [x] T054 Fotos de productos: cargar desde el celular y guardarlas (#54)

## Etapa 3 · Stock y compras

- [ ] T032 [agente] Clasificación ABC y plan de conteo (depende de T031) (#32)
- [ ] T034 [agente] Etiquetas con código de barras (depende de T015) (#34)
- [ ] T035 [agente] Stock mínimo y sugerencia de pedido (depende de T033) (#35)
- [x] T036 [agente] Pedido a proveedor (depende de T035, T030) (#36)
- [ ] T055 [agente] Compras: cargar la factura con una foto (número y renglones) (#55)
- [ ] T063 [agente] Pedido a proveedor: mandarlo por correo y como PDF (depende de T036) (estimación 1d) (#63)
- [x] T080 [agente] Celular, Depósito: la pestaña Ingreso no abre (estimación 1h) (#80)
- [x] T086 [agente] Las compras recientes salen de Ingreso y van a Cómo va el negocio; revisar que cada pantalla sea de un solo proceso (estimación 4h) (#86)
- [x] T089 [agente] Depósito: cambiar el orden a Inventario, Ingreso, Estanterías, Pedidos (#89)

## Etapa 4 · Administración remota

- [x] T037 Sincronización local ↔ nube tolerante a microcortes (depende de T006, T018) (#37)
- [x] T038 Servidor en la nube (Oracle Cloud Always Free) con TLS (depende de T037) (#38)
- [ ] T039 [agente] Tablero del dueño (depende de T018, T019) (#39)
- [ ] T040 [agente] Cierre de caja diario y resumen automático (depende de T016, T018) (#40)
- [x] T042 Acceso desde el celular como app (PWA) (depende de T018, T019) (#42)
- [ ] T058 [agente] Quién hizo qué: filtrar por usuario, fecha y tipo de acción (depende de T041) (#58)
- [x] T059 [agente] Roles Administrador, Vendedor y Comprador, combinables por usuario (depende de T041) (#59)
- [x] T064 [agente] Permisos «Ver costos», «Anular ventas del día» y «Anular ventas de cualquier día» (estimación 3h) (#64)
- [x] T072 [agente] Entrar a la computadora con el celular: un QR en la entrada, sin paso de confirmar (estimación 1d) (#72)
- [x] T073 [agente] Un solo emparejamiento celular–computadora: nace al entrar y sirve para escanear y para las fotos (estimación 1d) (#73)
- [x] T074 [agente] Usar el celular emparejado como lector de la computadora: pedirlo desde Vender y un lector propio en el celular (estimación 4h) (#74)
- [x] T075 [agente] Espejo celular–computadora: navegación y venta compartidas, con presencia y pausa (estimación 2d) (#75)
- [x] T078 [agente] La ventana de «Vincular el celular» se ve desalineada (#78)
- [x] T079 [agente] Entrada: botón para escanear el código de la computadora desde el celular, y el botón de Google más visible (estimación 1h) (#79)
- [x] T081 [agente] Vincular el celular con la computadora sin salir de la app (estimación 2h) (#81)
- [x] T083 [agente] Entrada de la computadora: el botón de Google con sombra difusa en vez de borde sólido (#83)
- [x] T084 [agente] Entrada del celular: al escanear el código de la computadora pide la huella enseguida, entra y vincula (estimación 2h) (#84)
- [x] T085 [agente] Celular: «Vincular con la computadora» arriba a la derecha en todas las pantallas (y «Desvincular» si ya está vinculado) (estimación 2h) (#85)
- [x] T087 [agente] [alta] Computadora: el botón «Continuar con Google» no funciona (estimación 1h) (#87)
- [x] T090 [agente] Botón de Google: el original, azul y redondeado, sin trucos ni estilos, en celular y computadora (estimación 1h) (#90)
- [x] T093 [agente] Celular: el botón vincular/desvincular a la derecha del encabezado, más chico y cuadrado (estimación 1h) (#93)
- [x] T094 [agente] Vinculados, la navegación es la misma: el celular va a donde está la computadora (estimación 2h) (#94)
- [x] T095 [agente] Computadora: el bloque del espejo en el menú está desalineado (#95)
- [x] T096 [agente] Computadora, Vender: sacar el botón Desvincular que está junto a «Escanear con el celular» (#96)

## Etapa 5 · Clientes y rentabilidad

- [ ] T043 [agente] Clientes importantes con cuenta corriente (depende de T015) (#43)
- [ ] T044 [agente] Gastos fijos y resultado mensual (depende de T039) (#44)
- [ ] T045 [agente] Presupuestos para clientes (depende de T043) (#45)
- [ ] T046 [agente] Comprobante de venta por WhatsApp (depende de T015) (#46)
- [ ] T048 [agente] [definir] Costeo por absorción para calcular el precio justo (depende de T044, T047) (#48)

## Sin etapa

- [x] T097 [agente] Un pedido de Carlos que cambia cómo se ve o se comporta algo se escribe en la documentación antes de programarlo (estimación 1h) (#97)
- [x] T101 [agente] Flujo de siete pasos con compuerta, y las tareas pasan de los issues a tasks.md
