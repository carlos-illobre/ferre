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

Debajo de una tarea puede haber notas, con sangría de dos espacios: a qué requerimiento
corresponde y dónde está especificado, cómo está hoy y las aclaraciones que traía su issue.
Las reglas no van acá: van en `specs/`.

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
  Requerimiento RF-11, especificado en specs/002-catalogo-y-precios (historia 4).
  Hoy (comentario del 2026-09-13): el cálculo del costo y la configuración por proveedor están
  hechos; contra la lista real de Comodo, el costo calculado coincide con el que la planilla
  trae precalculado en las 7.096 filas.
  Falta solo el criterio de aceptación que le toca a Carlos: comparar 10 productos elegidos a
  mano contra una factura real.
- [x] T012 Pantalla de carga de lista de precios (depende de T007, T008, T009, T010, T011) (#12)
- [x] T013 Selector de margen por producto (300 / 200 / 100 / 50 / 25 %) con costo visible (depende de T011) (#13)
- [x] T014 Búsqueda instantánea de productos (depende de T007, T008, T009, T010, T013) (#14)
- [x] T015 Pantalla de venta (mostrador) (depende de T005, T013, T014) (#15)
- [x] T016 Ventas del día, corrección y anulación (depende de T015) (#16)
- [x] T017 Producto no encontrado: ítem libre y alta rápida desde la venta (depende de T015) (#17)
- [x] T018 Funcionamiento sin internet desde el navegador (PWA) y sincronización (depende de T003, T006) (#18)
- [x] T019 [agente] Poner la app en la nube y acceder desde laptop y celular sin instalar nada (depende de T003) (#19)
- [ ] T020 [carlos] Cargar las últimas 2 semanas del cuaderno como ventas históricas (depende de T013, T015) (#20)
  Requerimiento RF-29, especificado en specs/003-ventas (historia 15).
  Transcribir el cuaderno se hace fuera del sistema; puede ser con una planilla simple. El
  informe de diferencias se revisa con Carlos y se ajustan los márgenes donde haga falta.
- [ ] T021 [carlos] Prueba piloto de 2 semanas con el empleado (depende de T016, T017, T018, T019, T020, T030, T031, T033) (#21)
  Requerimientos RNF-01 y RNF-02, especificados en specs/001-base-del-sistema (historia 4,
  SC-009 y Assumptions). Cierra el MVP.
  Semana 1: cuaderno y sistema en paralelo. Semana 2: solo sistema, si la semana 1 fue bien.
  Charla corta diaria con el empleado: qué molestó hoy. Cada problema que aparezca se anota como
  tarea (el issue decía «issue con etiqueta ux»; los issues ya no se usan).
- [x] T029 Producto equivalente en varios proveedores (depende de T030) (#29)
- [x] T030 Ingreso de mercadería (compra a proveedor) (depende de T015) (#30)
- [x] T031 Conteo cíclico de stock con el celular (depende de T018, T030) (#31)
- [x] T033 Stock actual y valorización del inventario (depende de T030, T031) (#33)
- [x] T041 Autenticación: solo usuarios autorizados entran; roles dueño y mostrador; auditoría (depende de T006) (#41)
- [x] T047 Todo número calculado muestra de dónde sale (depende de T011, T013) (#47)
- [x] T052 Escanear código de barras con la cámara del celular (depende de T014) (#52)
- [ ] T056 [agente] Corregir una venta ya registrada y ver las ventas de días anteriores (depende de T016) (#56)
  Requerimiento RF-23, especificado en specs/003-ventas (historias 7 y 9, SC-006).
  Hoy: T016 se cerró con la lista de ventas del día y la anulación. Una venta mal cargada solo
  se puede anular y cargar de nuevo. La consulta por día existe en el servidor; falta la
  pantalla. Va en las dos interfaces.
- [ ] T057 [agente] Cuenta corriente: marcar una venta como pagada desde la pantalla (depende de T015) (#57)
  Requerimiento RF-40, especificado en specs/004-clientes (historia 2, SC-004).
  Hoy: el servidor ya permite marcar una venta como pagada, pero ninguna pantalla lo ofrece. Va
  en las dos interfaces.
  Es el mínimo para dejar el cuaderno; la cuenta corriente completa (pagos parciales, saldo,
  antigüedad) es T043.
- [ ] T060 [agente] Precio a mano en la venta: respetarlo tal cual y avisar si no es múltiplo de $1.000 (depende de T015) (#60)
  Requerimientos RF-19 (specs/002-catalogo-y-precios) y RF-20b (specs/003-ventas, historia 3).
  Decisión 16 del 2026-10-10.
  Hoy: el código redondea. $1.500 tipeado a mano se cobra $2.000, en las dos interfaces y en el
  servidor. Alcanza también al ítem libre. Las pruebas de hoy comprueban el redondeo y hay que
  cambiarlas junto con el código.
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
  Requerimiento RNF-12, especificado en specs/001-base-del-sistema (historia 6); ADR-002. Sale
  de T019. Hoy no existe ningún monitor.
  Además de avisar, la consulta diaria evita que la base gratuita de Supabase se pause a los 7
  días sin uso y que Oracle reclame el servidor por inactividad.
  Opciones, a elegir por Carlos: (1) cuenta gratuita en UptimeRobot, Better Stack o similar,
  cada 5 minutos, con aviso al celular; la cuenta la tiene que crear Carlos. (2) Tarea
  programada en GitHub que consulte una vez por día y avise por correo si falla; la puede hacer
  un agente, sin cuenta nueva, y avisa con hasta un día de demora.
  Direcciones a consultar (ya verifican la base): https://ferre-api.duckdns.org/health y
  https://ferre-api-pruebas.duckdns.org/health
- [ ] T092 [agente] [definir] Copias de seguridad de la base: cada hora, semanal fuera del servidor y prueba mensual de restauración (estimación 2d) (#92)
  Requerimientos RNF-21, RNF-22 y RNF-23, especificados en specs/001-base-del-sistema (historia
  5); ADR-002. Sale de T019.
  Hoy: ninguno está construido. No hay ningún script ni tarea de respaldo; los Excel de las
  listas y las fotos de productos viven en un volumen de la máquina, sin copia;
  docs/operacion/DEPLOYMENT.md describe el volcado horario como si estuviera en marcha.
  La alerta cuando la base supera los 350 MB (parte de RNF-12) va junto con el monitor de T091 o
  acá: a definir.
  Por decidir: dónde se guarda la copia semanal externa y quién tiene la clave de cifrado
  (specs/preguntas-abiertas.md, RNF-22).
- [x] T098 [agente] Vender con tres pestañas: Vender, Hoy y Anular (estimación 4h) (#98)
- [x] T099 [agente] Computadora: Pausar y Desvincular no muestran el borde de foco al llegar con las flechas (#99)

## Etapa 2 · Precios automáticos

- [ ] T022 [agente] Importador genérico con detección de formato y mapeo guardado por proveedor (depende de T012) (#22)
  Requerimiento RF-03, especificado en specs/002-catalogo-y-precios (historia 11, SC-013).
  Los 4 lectores del MVP (Comodo, 3GE, ERPA, Ixnova) están hechos a medida: hay que
  reescribirlos sobre el importador genérico sin perder sus pruebas.
- [ ] T023 [agente] Historial de precios por producto y proveedor (depende de T022) (#23)
  Requerimiento RF-14, especificado en specs/002-catalogo-y-precios (historia 14).
- [ ] T024 [agente] Alertas de remarcado tras una importación (depende de T013, T023) (#24)
  Requerimiento RF-15, especificado en specs/002-catalogo-y-precios (historia 15).
  El issue pedía listar los productos con precio manual cuyo margen real quedó por debajo de 25
  %; en el catálogo ya no hay precio a mano. Quedó anotado en specs/preguntas-abiertas.md
  (Catálogo y precios, RF-15).
  Para dar la tarea por buena: cargar la lista de Ixnova y comprobar que aparecen exactamente
  los productos afectados. La impresión de etiquetas depende de T034.
- [ ] T025 [agente] Ingesta automática de listas desde el correo (depende de T022, T012) (#25)
  Requerimiento RF-04, especificado en specs/002-catalogo-y-precios (historia 13); el
  relevamiento está en su research.md.
  El issue proponía conectar la casilla con la API de Gmail o IMAP, y reconocer al proveedor por
  remitente, asunto y nombre de archivo. El relevamiento posterior lo corrigió: el mismo
  vendedor manda listas de dos proveedores desde una casilla, así que se reconoce por el archivo
  y no por el remitente.
  Las listas llegan al Gmail del negocio como adjuntos (Comodo, 3GE, Ixnova, ERPA, Bulones DC,
  Gancedo, Distribuidora City, entre otros). La pantalla para revisar y aplicar es la de T012.
- [ ] T026 [agente] [definir] Relevar proveedores con portal web y construir el primer conector (depende de T022) (#26)
  Requerimiento RF-04, especificado en specs/002-catalogo-y-precios (historia 13, escenarios 5 a
  7 y 10; SC-014).
  Pasos: relevar los 50 proveedores (¿tiene web con precios?, ¿pide usuario?, ¿ofrece
  exportación?) y anotarlo en specs/002-catalogo-y-precios/research.md (el issue decía
  docs/proveedores.md, que se mudó ahí); elegir uno, probablemente Ixnova, y hacer el conector
  que baja la lista y la pasa por el importador genérico; programarlo.
  Hoy (comentario del 2026-09-13): relevados los 4 proveedores del MVP. Ixnova tiene tienda
  mayorista con registro por CUIT y es el candidato al primer conector; 3GE tiene descargas
  detrás del login de cliente; ERPA y Comodo, solo por correo (la tienda de Suprabond es
  minorista). Faltan los demás.
  Antes de automatizar, Carlos tiene que confirmar que el proveedor autoriza el acceso
  automático (pedir usuario o exportación oficial); por eso lleva [definir].
- [ ] T027 [agente] Listas en PDF (depende de T022) (#27)
  Requerimiento RF-02, especificado en specs/002-catalogo-y-precios (historia 12).
  Ejemplo de proveedor que manda PDF: el catálogo y las ofertas de LH. Para dar la tarea por
  buena, al menos un proveedor con PDF tiene que cargarse bien.
  Documentar qué proveedores mandan PDF escaneado. Qué hacer con esos sigue sin decidir
  (specs/preguntas-abiertas.md, RF-02).
  Sugerencia de un tercero en el issue (2026-09-15, no es de Carlos ni está aprobada): separar
  el camino del PDF con texto del que necesita reconocer caracteres o pedir el Excel, y guardar
  en el resultado el tipo de origen y una marca de revisión manual, para distinguir un fallo de
  lectura de la tabla de un archivo sin texto.
- [ ] T028 [agente] Incorporar el resto de los proveedores (de 4 a 50) (depende de T022) (#28)
  Requerimientos RF-03 y RF-05, especificados en specs/002-catalogo-y-precios (historia 11,
  escenario 5).
  Priorizar por volumen de compra: pedirle a Carlos los 15 principales. Cargar de a 5 por
  semana. El que necesite código propio se anota como tarea aparte.
  Para dar la tarea por buena: los 15 proveedores principales cargados y el resto planificado.
- [x] T054 Fotos de productos: cargar desde el celular y guardarlas (#54)

## Etapa 3 · Stock y compras

- [ ] T032 [agente] Clasificación ABC y plan de conteo (depende de T031) (#32)
  Requerimiento RF-58, especificado en specs/005-compras-y-stock (historia 10, SC-013).
- [ ] T034 [agente] Etiquetas con código de barras (depende de T015) (#34)
  Requerimiento RF-57, especificado en specs/005-compras-y-stock (historia 9, SC-012).
- [ ] T035 [agente] Stock mínimo y sugerencia de pedido (depende de T033) (#35)
  Requerimiento RF-54, especificado en specs/005-compras-y-stock (historia 6, SC-010).
- [x] T036 [agente] Pedido a proveedor (depende de T035, T030) (#36)
- [ ] T055 [agente] Compras: cargar la factura con una foto (número y renglones) (#55)
  Requerimiento RF-51, especificado en specs/005-compras-y-stock (historia 5, SC-009).
  No se toma hasta que Carlos decida con qué se lee la foto: un servicio pago choca con el costo
  de $0 (respuesta del 2026-10-11, decisión 32). También falta decidir las facturas de varias
  hojas y en PDF (historia 5, escenario 9).
  Hoy: el ingreso ya pide la foto del comprobante y el número se lee de la foto (RF-50). De esta
  tarea queda solo leer la foto para precargar el ingreso.
  Propuesta técnica del issue, sin aprobar: leerla con un modelo de visión (API de Claude,
  modelo claude-sonnet-5; menos de $0,01 por factura), porque un lector de caracteres clásico
  (Tesseract) lee mal las facturas argentinas (tablas, sellos, fotos torcidas). La clave va en
  el servidor (variable ANTHROPIC_API_KEY), nunca en el cliente; sin clave, el botón no aparece
  y todo sigue a mano.
  Prueba de punta a punta con una imagen de muestra y la respuesta del lector simulada, para no
  depender de la red.
- [ ] T063 [agente] Pedido a proveedor: mandarlo por correo y como PDF (depende de T036) (estimación 1d) (#63)
  Requerimiento RF-55, especificado en specs/005-compras-y-stock (historia 7, escenarios 4, 9 y
  11).
  Hoy: el pedido se manda como texto, por WhatsApp o copiándolo. El correo y el PDF quedaron
  para una tanda posterior (decisión 52 del 2026-10-11).
- [x] T080 [agente] Celular, Depósito: la pestaña Ingreso no abre (estimación 1h) (#80)
- [x] T086 [agente] Las compras recientes salen de Ingreso y van a Cómo va el negocio; revisar que cada pantalla sea de un solo proceso (estimación 4h) (#86)
- [x] T089 [agente] Depósito: cambiar el orden a Inventario, Ingreso, Estanterías, Pedidos (#89)

## Etapa 4 · Administración remota

- [x] T037 Sincronización local ↔ nube tolerante a microcortes (depende de T006, T018) (#37)
- [x] T038 Servidor en la nube (Oracle Cloud Always Free) con TLS (depende de T037) (#38)
- [ ] T039 [agente] Tablero del dueño (depende de T018, T019) (#39)
  Requerimientos RF-60 y RF-61, especificados en specs/006-informacion-del-negocio (historias 2
  y 5, SC-004).
- [ ] T040 [agente] Cierre de caja diario y resumen automático (depende de T016, T018) (#40)
  Requerimientos RF-62 y RF-63, especificados en specs/006-informacion-del-negocio (historias 3
  y 4, SC-006).
- [x] T042 Acceso desde el celular como app (PWA) (depende de T018, T019) (#42)
- [ ] T058 [agente] Quién hizo qué: filtrar por usuario, fecha y tipo de acción (depende de T041) (#58)
  Requerimiento RF-71, especificado en specs/007-usuarios-y-acceso (historia 6).
  Hoy: el servidor ya filtra por usuario, tipo y rango de fechas; la pantalla solo pagina de a
  10. Va en las dos interfaces.
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
- [ ] T101 [agente] [en curso] El vínculo celular–computadora sobrevive al cierre de sesión; un solo botón (Vincular / Separar / Juntar) y Desvincular solo en Más (estimación 1d) (#101)
  Requerimiento RF-77, especificado en specs/007-usuarios-y-acceso (decisión 73).

## Etapa 5 · Clientes y rentabilidad

- [ ] T043 [agente] Clientes importantes con cuenta corriente (depende de T015) (#43)
  Requerimientos RF-41, RF-42 y RF-43, especificados en specs/004-clientes (historias 4, 5 y 6;
  SC-007).
  El mínimo para dejar el cuaderno (marcar una venta como pagada) es T057.
- [ ] T044 [agente] Gastos fijos y resultado mensual (depende de T039) (#44)
  Requerimiento RF-64, especificado en specs/006-informacion-del-negocio (historia 6, SC-007).
- [ ] T045 [agente] Presupuestos para clientes (depende de T043) (#45)
  Requerimiento RF-27, especificado en specs/003-ventas (historia 13, SC-007).
- [ ] T046 [agente] Comprobante de venta por WhatsApp (depende de T015) (#46)
  Requerimiento RF-28, especificado en specs/003-ventas (historia 14, SC-008).
- [ ] T048 [agente] [definir] Costeo por absorción para calcular el precio justo (depende de T044, T047) (#48)
  Requerimiento RF-16, especificado en specs/002-catalogo-y-precios (historia 18).
  Lleva [definir] porque el criterio para repartir los gastos fijos se define con Carlos
  (specs/preguntas-abiertas.md, RF-16).

## Sin etapa

- [x] T097 [agente] Un pedido de Carlos que cambia cómo se ve o se comporta algo se escribe en la documentación antes de programarlo (estimación 1h) (#97)
- [x] T102 [agente] Flujo de siete pasos con compuerta, y las tareas pasan de los issues a tasks.md
- [x] T103 [agente] Pasar a la documentación lo que decían los issues y cerrarlos
- [ ] T104 [agente] Atajo de teclado para todos los botones de la computadora (decisión 77): Carlos eligió letras con Alt; falta que apruebe cómo funciona
