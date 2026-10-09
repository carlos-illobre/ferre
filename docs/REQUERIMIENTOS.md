# Requerimientos y casos de uso

Qué tiene que hacer el sistema y con qué calidad. Fuente: relato del dueño del 2026-10-08,
más lo que ya estaba escrito en `docs/proceso-actual.md`, `docs/ux.md`, los ADR y el
backlog de GitHub Issues. Las respuestas del dueño a las preguntas abiertas están
incorporadas (sección 7).

La columna **Estado** dice dónde está cada requerimiento:

- **Hecho:** el issue está cerrado. Falta validarlo en el mostrador (piloto, #21).
- **Pendiente:** está en el backlog, con su issue.
- **Nuevo:** salió del relato del 2026-10-08 y todavía no tiene issue.

## 1. Objetivo

Aumentar las ventas de la ferretería. El primer paso es saber qué se vende, qué hay en
stock, cuánta plata hay invertida y cuánto se gana, reemplazando el cuaderno de ventas y
las listas de precios en Excel por un sistema que no le sume trabajo al empleado.

Prioridad de corto plazo, en este orden:

1. Facilidad de uso: que se use sin manual, en la laptop y en el celular.
2. Alta disponibilidad: que el mostrador nunca se frene por el sistema.
3. Respaldos: que no se pierda ningún dato.
4. Información: guardarla toda y poder verla.

## 2. Actores

| Actor | Quién es | Qué hace |
|---|---|---|
| Empleado | El único empleado del local | Vende, carga compras, cuenta stock, carga listas de precios |
| Dueño | Carlos | Administra a distancia, decide precios y márgenes, revisa resultados |
| Familiar | La madre del dueño | Consulta y opera igual que el dueño |
| Titular | El padre del dueño | Titular del CUIT con el que factura la ferretería; no usa el sistema |
| Proveedor | ~50, externos | Manda listas de precios (Excel, PDF, web); no usa el sistema |
| Cliente importante | ~20, externos | Compra a cuenta corriente, pide presupuestos; no usa el sistema |

Son tres usuarios y por ahora todos ven todo. Los roles (dueño, admin, mostrador) ya
existen; los permisos finos por rol no son prioridad.

## 3. Requerimientos funcionales

### 3.1 Catálogo y precios

| ID | Requerimiento | Estado |
|---|---|---|
| RF-01 | Cargar la lista de precios de un proveedor subiendo el archivo Excel; el sistema reconoce el proveedor, muestra qué cambia (nuevos, cambiados, dados de baja) y actualiza todo al confirmar | Hecho (#12, 4 proveedores) |
| RF-02 | Cargar listas en PDF | Pendiente (#27) |
| RF-03 | Cargar la lista de cualquier proveedor nuevo sin programar un lector a medida | Pendiente (#22, #28) |
| RF-04 | Recibir las listas solas desde el correo del negocio o la web del proveedor | Pendiente (#25, #26) |
| RF-05 | Cada artículo guarda el código de cada proveedor que lo vende. Se empieza con pocos proveedores y se suman de a poco; entre todos pueden superar los 100.000 artículos | Hecho (#6); el volumen grande está sin probar (RNF-08) |
| RF-06 | Un mismo artículo vendido por varios proveedores se une en uno solo; se ve quién lo vende y quién es más barato | Hecho (#29) |
| RF-07 | Buscar un producto por nombre, código o código de barras, sin saber el proveedor, con respuesta instantánea | Hecho (#14) |
| RF-08 | Leer el código de barras con la cámara del celular, también para cargarlo en la laptop | Hecho (#52) |
| RF-09 | Sacarle una foto al producto desde el celular y guardarla en su ficha | Hecho (#54) |
| RF-09b | Encontrar un producto sin código de barras sacándole una foto | Nuevo, segunda versión |
| RF-10 | Precio de venta = costo + margen. El margen se elige con un toque (300 / 200 / 100 / 50 / 25 %) o a mano, y queda guardado por producto | Hecho (#13) |
| RF-11 | Costo comparable entre proveedores: descuentos e IVA aplicados igual para todos | Pendiente (#11) |
| RF-12 | Productos fraccionados (clavos por kilo, cable por metro, líquidos por litro) | Hecho (unidad kg / m / l) |
| RF-13 | Todo número calculado explica de dónde sale | Hecho (#47) |
| RF-14 | Historial de precios por producto y proveedor | Pendiente (#23) |
| RF-15 | Después de cargar una lista, avisar qué productos hay que remarcar | Pendiente (#24) |
| RF-16 | Ayudar a decidir el margen con datos (costos fijos, rotación) en vez de a ojo | Pendiente (#48) |
| RF-17 | Descuentos puntuales de un proveedor que se trasladan al precio de venta mientras duran | Nuevo |
| RF-18 | Buscar proveedores y ver su ficha: datos de contacto, listas cargadas, qué venden | Nuevo |
| RF-19 | El precio de venta siempre se redondea para arriba a múltiplos de $1.000, también en lo que se vende suelto, para no dar vuelto | Hecho |

### 3.2 Ventas

| ID | Requerimiento | Estado |
|---|---|---|
| RF-20 | Registrar una venta en el orden del mostrador: buscar, ver precio, cantidad, cobrar | Hecho (#15) |
| RF-21 | Medios de pago: efectivo, Mercado Pago, tarjeta, cuenta corriente | Hecho (#15) |
| RF-22 | Vender un producto que no está en ninguna lista (ítem libre) y darlo de alta ahí mismo | Hecho (#17) |
| RF-23 | Ver las ventas del día, corregirlas y anularlas | Hecho (#16) |
| RF-24 | Cambio por otro producto: vuelve al stock lo devuelto, sale lo nuevo y se cobra la diferencia | Nuevo |
| RF-24b | Devoluciones con reintegro de plata o saldo a favor, a elección del cliente; plazo a definir | Nuevo, fuera de esta etapa (llega con la venta online) |
| RF-25 | Anotar lo que un cliente pidió y no se vendió, con el motivo (no había, precio) | Hecho en parte (tabla `consulta`); falta la vista |
| RF-26 | Pedidos de clientes sin stock: lista de lo que hay que conseguir, para quién y qué día se le prometió. Hoy no se toma seña y el cliente vuelve ese día; el sistema tiene que mejorar eso (por ejemplo, avisarle cuando llega) | Nuevo |
| RF-27 | Presupuestos: se arman como una venta, no tocan stock, se convierten en venta | Pendiente (#45) |
| RF-28 | Mandar el comprobante de la venta por WhatsApp | Pendiente (#46) |
| RF-29 | Cargar las últimas dos semanas del cuaderno como ventas históricas | Pendiente (#20) |
| RF-30 | Factura electrónica de ARCA (hoy: talonario en papel; la ferretería factura como responsable inscripto con el CUIT del padre del dueño) | Nuevo, fuera de esta etapa |
| RF-31 | Venta online de los productos de la ferretería, con devoluciones (RF-24b) | Nuevo, fuera de esta etapa |

### 3.3 Clientes

| ID | Requerimiento | Estado |
|---|---|---|
| RF-40 | Vender a cuenta corriente a un cliente importante y marcar la venta como pagada | Hecho (#15) |
| RF-41 | Cuenta corriente completa: saldo, pagos parciales, antigüedad de la deuda, resumen para mandar | Pendiente (#43) |
| RF-42 | Buscar clientes importantes y ver su ficha con lo que compraron y lo que deben | Pendiente (#43) |

### 3.4 Compras y stock

| ID | Requerimiento | Estado |
|---|---|---|
| RF-50 | Registrar cada compra a proveedor con su costo real; suma stock | Hecho (#30) |
| RF-51 | Cargar la factura de compra con una foto, sin tipear los renglones | Pendiente (#55) |
| RF-52 | El stock arranca en cero; el empleado carga lo que ya hay de a poco, por sector, con el celular | Hecho (#31) |
| RF-53 | Stock actual y cuánta plata hay invertida | Hecho (#33) |
| RF-54 | Aviso de stock bajo y sugerencia de qué pedir | Pendiente (#35) |
| RF-55 | Armar el pedido a un proveedor | Pendiente (#36) |
| RF-56 | Lo que se les debe a los proveedores y cuándo vence: se paga por adelantado cuando hay descuento, y si no a 30 o 60 días | Nuevo |
| RF-57 | Etiquetas con código de barras para lo que no lo trae de fábrica | Pendiente (#34) |
| RF-58 | Plan de conteo: qué contar primero según lo que más se vende | Pendiente (#32) |

### 3.5 Información para el dueño

| ID | Requerimiento | Estado |
|---|---|---|
| RF-60 | Tablero: ventas y ganancia de hoy, semana y mes; comparación con el período anterior | Pendiente (#39) |
| RF-61 | Lo más vendido y lo que no rota | Pendiente (#39) |
| RF-62 | Cierre de caja diario: efectivo contado contra ventas en efectivo | Pendiente (#40) |
| RF-63 | Novedades del día: resumen de lo que pasó, visible en la app y enviado solo al dueño | Pendiente (#40); la vista en la app es nueva |
| RF-64 | Gastos fijos y resultado mensual | Pendiente (#44) |
| RF-65 | Gasto semanal en compras, sin papel | Hecho (#30) |

### 3.6 Usuarios y registro

| ID | Requerimiento | Estado |
|---|---|---|
| RF-70 | Solo entran usuarios autorizados, con su cuenta de Google o la huella del celular; sin contraseñas | Hecho (#41) |
| RF-71 | Quién hizo qué: cada acción queda con su usuario y se puede consultar | Hecho (#41) |
| RF-72 | Permisos distintos por rol (por ejemplo, ocultar costos al mostrador) | Fuera de esta etapa |

## 4. Requerimientos no funcionales

### 4.1 Facilidad de uso

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-01 | Curva de aprendizaje cero: el empleado vende el primer día sin manual | A validar en el piloto (#21) |
| RNF-02 | Nunca más lento que el cuaderno y la calculadora: una venta de 3 productos en menos de 20 segundos | A validar (#21) |
| RNF-03 | Mínimo esfuerzo manual: no se tipea nada que se pueda sacar de una lista, un código de barras o una foto | Parcial (falta #55, #25) |
| RNF-04 | Celular: la interfaz actual se conserva tal como está | Hecho |
| RNF-05 | Computadora: usa todo el ancho de la pantalla, se ve prolija y se maneja con teclado, sin cambiar nada del celular | **Pendiente, prioridad 1.** El intento del 2026-09-15 (commit `6333c1f`) no conformó |
| RNF-06 | Todo en castellano, con las palabras del mostrador; los errores dicen qué hacer | Hecho (`docs/ux.md`) |
| RNF-07 | Búsqueda y cambio de margen responden en menos de 100 ms | Hecho (#14) |
| RNF-08 | La búsqueda sigue siendo instantánea y funciona sin internet con más de 100.000 artículos, en la notebook vieja | Nuevo, sin probar |

### 4.2 Disponibilidad

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-10 | Sin internet no se nota: buscar y vender funcionan igual y lo pendiente se manda solo al reconectar | Hecho (#18, #37) |
| RNF-11 | Una caída del servidor no frena el mostrador | Hecho (ADR-002) |
| RNF-12 | Aviso al dueño si la API o la base dejan de responder | Pendiente (#19) |
| RNF-13 | Actualizar la versión sin cortar el mostrador ni perder datos | Hecho (ADR-013) |

### 4.3 Respaldos

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-20 | No se pierde ninguna venta: cada una vive en el dispositivo hasta que el servidor la confirma | Hecho (#18) |
| RNF-21 | Copia de la base cada hora, guardada 30 días | **Pendiente** (#19) |
| RNF-22 | Copia semanal cifrada fuera de Oracle y de Supabase | **Pendiente** (#19) |
| RNF-23 | Prueba mensual automática de que la copia se puede restaurar | **Pendiente** (#19) |

### 4.4 Información

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-30 | Nada se borra y los históricos no se pisan: precios, stock y eventos solo suman filas | Hecho (`docs/MODELO.md`) |
| RNF-31 | Cada venta guarda el costo, el margen y el precio de ese momento | Hecho (#47) |

### 4.5 Equipo, costo y seguridad

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-40 | Funciona en la notebook vieja del local (Chrome o Firefox) y en un celular Android, sin instalar nada | Hecho; falta probar en la notebook real |
| RNF-41 | El único lector de códigos es la cámara del celular | Hecho (#52) |
| RNF-42 | Costo de infraestructura cero hasta que el sistema muestre resultados | Hecho (Oracle Always Free, Supabase gratis, GitHub Pages) |
| RNF-43 | HTTPS siempre; sesiones revocables; ningún dato de proveedores en el repositorio | Hecho (`docs/SECURITY.md`) |

## 5. Casos de uso

### CU-01 Vender en el mostrador

- **Actor:** Empleado.
- **Flujo:** busca el producto escribiendo o escaneando → ve costo, margen y precio → le dice
  el precio al cliente → pone la cantidad → elige el medio de pago → listo.
- **Alternativas:**
  - El cliente no acepta: se descarta con una tecla; se puede guardar como consulta (CU-03).
  - El producto no está en ninguna lista: se vende como ítem libre con nombre y precio.
  - El producto no tiene margen: se elige ahí mismo y queda guardado.
  - Es un cliente importante: se cobra a cuenta corriente con su nombre.
  - No hay internet: la venta queda en el dispositivo y se manda sola al reconectar.

### CU-02 Corregir, anular, devolver o cambiar una venta

- **Actor:** Empleado.
- **Flujo:** abre las ventas del día → elige la venta → la corrige o la anula.
- **Alternativa:** cambio por otro producto: vuelve al stock lo devuelto, sale lo nuevo y se
  cobra la diferencia (RF-24). En esta etapa no hay devoluciones de plata.

### CU-03 Anotar lo que pidieron y no se vendió

- **Actor:** Empleado.
- **Flujo:** el cliente pregunta y no compra → un toque guarda producto, precio ofrecido y motivo.
- **Alternativa:** el cliente lo quiere igual: queda como pedido con su nombre, su teléfono y
  el día prometido, y aparece en la lista de cosas para comprar (RF-26).

### CU-04 Actualizar precios con la lista de un proveedor

- **Actor:** Empleado o Dueño.
- **Flujo:** sube el archivo → el sistema reconoce el proveedor → muestra nuevos, cambiados y
  dados de baja → confirma → se actualizan los costos y, con el margen de cada producto, los
  precios de venta.
- **Alternativas:**
  - No reconoce el formato: pregunta de qué proveedor es y aprende (#22).
  - La lista llega sola por mail o por la web del proveedor y queda pendiente de confirmar (#25, #26).
  - Algo se ve mal en la vista previa: se descarta y no cambia nada.

### CU-05 Averiguar quién vende un producto y a cuánto

- **Actor:** Empleado o Dueño.
- **Flujo:** busca el producto → ve todos los proveedores que lo tienen, el costo de cada uno
  y cuál es el más barato.

### CU-06 Registrar una compra a proveedor

- **Actor:** Empleado.
- **Flujo:** llega la mercadería → elige el proveedor → carga los renglones (escaneando,
  buscando o con una foto de la factura, #55) → confirma → sube el stock y queda el costo real.
- **Alternativas:** proveedor sin factura (se carga "sin comprobante"); llegó menos de lo pedido.

### CU-07 Cargar el stock que ya hay, de a poco

- **Actor:** Empleado.
- **Flujo:** elige una estantería → escanea o busca cada producto y pone cuántos hay → cierra
  el conteo → el sistema ajusta el stock y deja explicada cada diferencia.
- **Alternativa:** lo interrumpe un cliente: el conteo queda abierto y lo sigue después.

### CU-08 Ver cómo va el negocio

- **Actor:** Dueño o Familiar, desde cualquier lado.
- **Flujo:** abre Negocio → ve ventas y ganancia del día, plata invertida en stock, lo más
  vendido, stock bajo, pedidos de clientes pendientes y novedades del día.

### CU-09 Vender a cuenta corriente y cobrar la deuda

- **Actor:** Empleado.
- **Flujo:** vende con medio de pago "cuenta corriente" y elige el cliente → cuando el cliente
  paga, busca al cliente y registra el pago (total o parcial, #43).

### CU-10 Hacer un presupuesto

- **Actor:** Empleado.
- **Flujo:** lo arma igual que una venta → lo manda por WhatsApp o PDF → si el cliente acepta,
  lo convierte en venta con un toque (#45).

### CU-11 Decidir qué comprar

- **Actor:** Dueño o Empleado.
- **Flujo:** mira stock bajo y pedidos de clientes → el sistema sugiere cantidades y el
  proveedor más barato → arma el pedido (#35, #36).

### CU-12 Cerrar la caja

- **Actor:** Empleado.
- **Flujo:** al cerrar, tipea el efectivo contado → el sistema muestra la diferencia → el
  resumen del día le llega solo al dueño (#40).

### CU-13 Saber quién hizo qué

- **Actor:** Dueño.
- **Flujo:** abre el registro → filtra por usuario, fecha o tipo de acción.

## 6. Fuera de esta etapa

- Factura electrónica de ARCA (RF-30).
- Devoluciones con reintegro o saldo a favor (RF-24b).
- Buscar un producto por foto (RF-09b): segunda versión.
- Permisos finos por rol (RF-72).
- Venta online (RF-31): la arquitectura deja la puerta abierta (ADR-003), pero no se construye acá.
  Es un negocio aparte del proyecto Tienda online.

## 7. Decisiones del dueño (2026-10-08)

1. **Buscar por foto.** En la primera versión alcanza con escanear el código de barras y
   fotografiar facturas. Encontrar un producto sin código por su foto va en la segunda (RF-09b).
2. **Devoluciones.** En esta versión no hay; sí hay cambios por otro producto (RF-24). Las
   devoluciones llegan con la venta online: reintegro o saldo a favor, según elija el
   cliente. El plazo se define entonces.
3. **Pedidos de clientes sin stock.** No se toma seña: se le dice al cliente qué día va a
   estar y se lo espera. Es el procedimiento actual y se quiere mejorar (RF-26).
4. **Pago a proveedores.** Por adelantado cuando hay descuento; si no, a 30 o 60 días (RF-56).
5. **Redondeo.** Siempre para arriba a múltiplos de $1.000, para no lidiar con vueltos (RF-19).
6. **Tamaño del catálogo.** Entre todos los proveedores puede superar los 100.000 artículos.
   Se empieza con pocos proveedores y se agregan de a poco (RF-05, RNF-08).
