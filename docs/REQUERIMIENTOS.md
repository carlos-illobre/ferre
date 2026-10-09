# Requerimientos y casos de uso

Qué tiene que hacer el sistema y con qué calidad. Fuente: relato del dueño del 2026-10-08,
más lo que ya estaba escrito en `docs/proceso-actual.md`, `docs/ux.md`, los ADR y el
backlog de GitHub Issues. Las respuestas del dueño a las preguntas abiertas están
incorporadas (sección 7). El 2026-10-09 se revisó contra todo lo que el dueño pidió durante
el desarrollo (sección 8) y el dueño respondió las dudas (sección 7); lo que sigue abierto
está en la sección 9.

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

## 2. Actores y roles

Son dos cosas distintas y no se mezclan.

**Los roles son del sistema: definen qué puede hacer un usuario.** Son tres y un usuario
puede tener varios.

| Rol | Qué puede hacer |
|---|---|
| Administrador | Todo lo referente a administrar: crear usuarios, asignar roles, cerrar sesiones, ver quién hizo qué, ver cómo va el negocio |
| Vendedor | Vender y registrar las ventas |
| Comprador | Recibir la mercadería y registrarla |

Hoy hay un solo empleado y su usuario tiene los tres roles, para que pueda hacer todo. Si
más adelante entra otra persona, se le asignan solo los permisos mínimos y necesarios. El
detalle de qué rol puede qué está en RF-72.

**Los actores son las personas de la vida real.** Se usan en los diagramas y en el relato del
negocio cuando un rol no alcanza para describir el proceso.

| Actor | Quién es | Usa el sistema |
|---|---|---|
| Dueño | Quien administra la ferretería a distancia y decide precios, márgenes y prioridades | Sí, con el rol Administrador |
| Empleado | Quien atiende el local | Sí, con los roles que se le asignen |
| Cliente | Quien compra; unos 20 son clientes importantes con cuenta corriente | No, no tiene rol |
| Proveedor | Unos 50; mandan listas de precios en Excel, PDF o web | No, no tiene rol |

Regla para diagramas, casos de uso y pantallas: siempre que se pueda se nombra el **rol**, no
el actor. Cliente y Proveedor aparecen como actores porque no interactúan con el sistema.

## 3. Requerimientos funcionales

### 3.1 Catálogo y precios

| ID | Requerimiento | Estado |
|---|---|---|
| RF-01 | Cargar la lista de precios de un proveedor subiendo el archivo Excel; el sistema reconoce el proveedor, muestra qué cambia (nuevos, cambiados, dados de baja) y actualiza todo al confirmar. Nada se guarda hasta confirmar y se puede descartar | Hecho (#12, 4 proveedores) |
| RF-01b | Desde la ficha de un producto, bajar el Excel original de la lista de la que salió su costo | Hecho |
| RF-02 | Cargar listas en PDF | Pendiente (#27) |
| RF-03 | Cargar la lista de cualquier proveedor nuevo sin programar un lector a medida | Pendiente (#22, #28) |
| RF-04 | Recibir las listas solas desde el correo del negocio o la web del proveedor | Pendiente (#25, #26) |
| RF-05 | Cada artículo guarda el código de cada proveedor que lo vende. Se empieza con pocos proveedores y se suman de a poco; entre todos pueden superar los 100.000 artículos | Hecho (#6); el volumen grande está sin probar (RNF-08) |
| RF-06 | Un mismo artículo vendido por varios proveedores se une en uno solo; se ve quién lo vende y quién es más barato. El sistema sugiere los duplicados, también se unen a mano, y dos productos unidos se pueden volver a separar | Hecho (#29) |
| RF-07 | Buscar un producto por nombre, código o código de barras, sin saber el proveedor, con respuesta instantánea | Hecho (#14) |
| RF-08 | Leer el código de barras con la cámara del celular, también para cargarlo en la laptop: el celular se vincula a la laptop leyendo un QR y lo que escanea aparece en la pantalla de la laptop | Hecho (#52) |
| RF-09 | Sacarle una foto al producto desde el celular y guardarla en su ficha. La foto chica se amplía al tocarla y desde ahí se puede sacar otra para reemplazarla | Hecho (#54) |
| RF-09b | Encontrar un producto sin código de barras sacándole una foto | Nuevo, segunda versión |
| RF-10 | Precio de venta = costo + margen. El margen se elige con un toque (300 / 200 / 100 / 50 / 25 %) o a mano, y queda guardado por producto. En el catálogo, «a mano» es un porcentaje, no un precio | Hecho (#13) |
| RF-11 | Costo comparable entre proveedores: descuentos e IVA aplicados igual para todos | Pendiente (#11) |
| RF-12 | Productos fraccionados (clavos por kilo, cable por metro, líquidos por litro). Lo que se vende por unidad lleva cantidades enteras; lo fraccionado, hasta un decimal | Hecho (unidad kg / m / l) |
| RF-13 | Todo número calculado explica de dónde sale | Hecho (#47) |
| RF-14 | Historial de precios por producto y proveedor | Pendiente (#23) |
| RF-15 | Después de cargar una lista, avisar qué productos hay que remarcar | Pendiente (#24) |
| RF-16 | Ayudar a decidir el margen con datos (costeo por absorción: costos fijos, rotación) en vez de a ojo | Pendiente (#48) |
| RF-17 | Descuentos puntuales de un proveedor que se trasladan al precio de venta mientras duran | Nuevo |
| RF-18 | Buscar proveedores y ver su ficha: datos de contacto, listas cargadas, qué venden | Nuevo |
| RF-19 | Toda venta es múltiplo de $1.000, porque no hay billetes chicos para dar vuelto. El precio de venta se redondea para arriba a $1.000 y cada renglón de la venta también: lo que se vende suelto (medio kilo, 1,5 metros) y el precio puesto a mano | Hecho |

### 3.2 Ventas

| ID | Requerimiento | Estado |
|---|---|---|
| RF-20 | Registrar una venta en el orden del mostrador: buscar, ver precio, cantidad, cobrar | Hecho (#15) |
| RF-20b | En la venta, el margen de un producto se elige o cambia ahí mismo, y el precio de un renglón se puede poner a mano (un importe) solo para esa venta | Hecho (#15) |
| RF-21 | Medios de pago: efectivo, Mercado Pago, tarjeta, cuenta corriente | Hecho (#15) |
| RF-22 | Vender un producto que no está en ninguna lista (ítem libre) y darlo de alta ahí mismo | Hecho (#17) |
| RF-23 | Ver las ventas del día, corregirlas y anularlas. Cada venta muestra sus productos, uno por renglón | Hecho en parte (#16): ver y anular. Falta corregir una venta y ver días anteriores (#56) |
| RF-24 | Cambio por otro producto: vuelve al stock lo devuelto, sale lo nuevo y se cobra la diferencia | Nuevo |
| RF-24b | Devoluciones con reintegro de plata o saldo a favor, a elección del cliente; plazo a definir | Nuevo, fuera de esta etapa (llega con la venta online) |
| RF-25 | Anotar lo que un cliente pidió y no se vendió, con el motivo (no había, precio) | Hecho en parte (tabla `consulta`); falta la vista |
| RF-26 | Pedidos de clientes sin stock: lista de lo que hay que conseguir, para quién y qué día se le prometió. Hoy no se toma seña y el cliente vuelve ese día; el sistema tiene que mejorar eso (por ejemplo, avisarle cuando llega) | Nuevo |
| RF-27 | Presupuestos: se arman como una venta, no tocan stock, se convierten en venta | Pendiente (#45) |
| RF-28 | Mandar el comprobante de la venta por WhatsApp | Pendiente (#46) |
| RF-29 | Cargar las últimas dos semanas del cuaderno como ventas históricas | Pendiente (#20) |
| RF-30 | Factura electrónica de ARCA (hoy: talonario en papel; la ferretería factura como responsable inscripto con el CUIT de un familiar) | Nuevo, fuera de esta etapa |
| RF-31 | Venta online de los productos de la ferretería, con devoluciones (RF-24b) | Nuevo, fuera de esta etapa |
| RF-32 | Ofrecer el sistema a otras ferreterías con licencia de uso. Cada ferretería tiene su propia instalación, con su base de datos y su motor independientes: los datos de dos negocios nunca comparten base (proyecto Consultoría) | Nuevo, fuera de esta etapa |

### 3.3 Clientes

| ID | Requerimiento | Estado |
|---|---|---|
| RF-40 | Vender a cuenta corriente a un cliente importante y marcar la venta como pagada | Hecho en parte (#15): se vende a cuenta corriente. Falta la pantalla para marcarla pagada (#57) |
| RF-41 | Cuenta corriente completa: saldo, pagos parciales, antigüedad de la deuda, resumen para mandar | Pendiente (#43) |
| RF-42 | Buscar clientes importantes y ver su ficha con lo que compraron y lo que deben | Pendiente (#43) |
| RF-43 | Precio distinto para un cliente importante según la cantidad que compra y lo rápido que paga | Pendiente (#43) |

### 3.4 Compras y stock

| ID | Requerimiento | Estado |
|---|---|---|
| RF-50 | Registrar cada compra a proveedor con su costo real; suma stock. Con factura, con remito o sin comprobante (hay proveedores que no facturan). Las compras recientes se abren para ver sus renglones y se pueden anular | Hecho (#30) |
| RF-51 | Cargar la factura de compra con una foto, sin tipear los renglones | Pendiente (#55) |
| RF-52 | El stock arranca en cero; lo que ya hay se carga de a poco, por sector, con el celular. Un conteo interrumpido queda abierto y se retoma | Hecho (#31) |
| RF-53 | Stock actual y cuánta plata hay invertida. El stock de cada producto muestra los movimientos que lo explican y se puede corregir a mano, con el motivo | Hecho (#33) |
| RF-54 | Aviso de stock bajo y sugerencia de qué pedir | Pendiente (#35) |
| RF-55 | Armar el pedido a un proveedor | Pendiente (#36) |
| RF-56 | Lo que se les debe a los proveedores y cuándo vence: se paga por adelantado cuando hay descuento, y si no a 30 o 60 días | Nuevo |
| RF-57 | Etiquetas con código de barras para lo que no lo trae de fábrica | Pendiente (#34) |
| RF-58 | Plan de conteo: qué contar primero según lo que más se vende | Pendiente (#32) |

### 3.5 Información del negocio

| ID | Requerimiento | Estado |
|---|---|---|
| RF-60 | Tablero: ventas y ganancia de hoy, semana y mes; comparación con el período anterior | Pendiente (#39) |
| RF-61 | Lo más vendido y lo que no rota | Pendiente (#39) |
| RF-62 | Cierre de caja diario: efectivo contado contra ventas en efectivo | Pendiente (#40) |
| RF-63 | Novedades del día: resumen de lo que pasó, visible en la app y enviado solo a los Administradores | Pendiente (#40); la vista en la app es nueva |
| RF-64 | Gastos fijos y resultado mensual | Pendiente (#44) |
| RF-65 | Gasto semanal en compras, sin papel | Hecho (#30) |

### 3.6 Usuarios y registro

| ID | Requerimiento | Estado |
|---|---|---|
| RF-70 | Solo entran usuarios autorizados, con su cuenta de Google o la huella del celular; sin contraseñas ni códigos QR. Se autoriza a alguien cargando su correo de Google desde la app; quien no está autorizado ve «no autorizado» | Hecho (#41) |
| RF-70b | Vincular el celular a la cuenta para entrar con la huella, sin Google. La app lo ofrece sola la primera vez que se entra con Google desde un celular (como las apps de los bancos) y nunca en la computadora; también se vincula y se quita desde Negocio | Hecho (ADR-011) |
| RF-71 | Quién hizo qué: cada acción queda con su usuario y se puede consultar, de a 10 por página, filtrando por usuario, fecha y tipo de acción | Hecho en parte (#41): consulta paginada. Faltan los filtros (#58) |
| RF-72 | Permisos por rol, con los tres roles de la sección 2 (Administrador, Vendedor, Comprador). Un usuario puede tener varios; cada pantalla y cada operación exige el rol que corresponde; nunca queda el sistema sin un Administrador | Pendiente (#59) |
| RF-73 | Roles de hoy, hasta que llegue RF-72: «dueño», «admin» (igual al dueño, salvo crear, modificar o desactivar usuarios dueño) y «mostrador» (vende, compra, cuenta y carga listas, pero no administra). Cada usuario tiene uno solo | Hecho (#41) |
| RF-74 | Ver las sesiones abiertas en cada dispositivo y cerrarlas a distancia; cerrar la propia vuelve a la pantalla de entrada | Hecho (#41) |

## 4. Requerimientos no funcionales

### 4.1 Facilidad de uso

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-01 | Curva de aprendizaje cero: un Vendedor nuevo vende el primer día sin manual | A validar en el piloto (#21) |
| RNF-02 | Nunca más lento que el cuaderno y la calculadora: una venta de 3 productos en menos de 20 segundos | A validar (#21) |
| RNF-03 | Mínimo esfuerzo manual: no se tipea nada que se pueda sacar de una lista, un código de barras o una foto | Parcial (falta #55, #25) |
| RNF-04 | Celular: la interfaz actual se conserva tal como está; es la que se carga en pantallas de menos de 900 px. Sigue el diseño de `mockups/Ferre iOS.html` (reglas en `docs/ux.md`), se parece a una app nativa y ninguna pantalla se desplaza hacia el costado | Hecho |
| RNF-05 | Computadora: usa todo el ancho de la pantalla, se ve prolija y se maneja con teclado, sin cambiar nada del celular. Es una interfaz propia: tablas, menú completo y atajos de teclado, con la misma paleta y la misma marca que el celular (ADR-014) | **A validar** por el dueño. Desde el 2026-10-09 la computadora vuelve al layout de tablas anterior al rediseño, a toda la pantalla y con la paleta nueva |
| RNF-06 | Todo en castellano, con las palabras del mostrador; los errores dicen qué hacer. Nombres que se entienden solos: «cuenta corriente» y no «fiado» («cc.» solo donde no entra), «estantería» y no «góndola» | Hecho (`docs/ux.md`) |
| RNF-07 | Búsqueda y cambio de margen responden en menos de 100 ms | Hecho (#14) |
| RNF-09 | Lo que tarda muestra su avance (barra de progreso al aplicar una lista); los avisos desaparecen solos al corregir la causa; lo que se puede tocar parece un botón; los paneles plegables arrancan abiertos y se abren y cierran con animación | Hecho (`docs/ux.md`) |
| RNF-08 | La búsqueda sigue siendo instantánea y funciona sin internet con más de 100.000 artículos, en la notebook vieja | Nuevo, sin probar |

### 4.2 Disponibilidad

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-10 | Sin internet no se nota: buscar y vender funcionan igual y lo pendiente se manda solo al reconectar | Hecho (#18, #37) |
| RNF-11 | Una caída del servidor no frena el mostrador | Hecho (ADR-002) |
| RNF-12 | Aviso a los Administradores si la API o la base dejan de responder | Pendiente (#19) |
| RNF-13 | Actualizar la versión sin cortar el mostrador ni perder datos | Hecho (ADR-013) |

### 4.3 Respaldos

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-20 | No se pierde ninguna venta ni ningún cambio (margen, ajuste de stock, conteo): cada uno vive en el dispositivo hasta que el servidor lo confirma, aunque se recargue la página o se corte internet. Las ventas confirmadas quedan además 7 días en el dispositivo | Hecho (#18, ADR-002) |
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
| RNF-40 | Funciona en la notebook vieja del local (Chrome o Firefox) y en un celular Android, sin instalar nada. En el celular se puede agregar a la pantalla de inicio como una app, sin pasar por la tienda | Hecho (#42); falta probar en la notebook real |
| RNF-41 | El único lector de códigos es la cámara del celular | Hecho (#52) |
| RNF-42 | Costo de infraestructura cero hasta que el sistema muestre resultados | Hecho (Oracle Always Free, Supabase gratis, GitHub Pages) |
| RNF-43 | HTTPS siempre; sesiones revocables; ningún dato de proveedores ni secreto en el repositorio, que es público: lo sensible vive en `privado/`, que no se sube | Hecho (`docs/SECURITY.md`) |
| RNF-44 | En el servidor la app corre con un usuario propio sin privilegios de administrador y no publica puertos a internet: sale por el proxy compartido de la máquina | Hecho (ADR-013) |

### 4.6 Arquitectura y forma de trabajo

| ID | Requerimiento | Estado |
|---|---|---|
| RNF-50 | El servidor está separado de la pantalla: la misma API la consume la web y la podrá consumir una app Android. El sistema es un microservicio que se integrará con otros (venta online, RF-31). Los servicios se llaman por lo que resuelven del negocio | Hecho (ADR-003, ADR-010) |
| RNF-51 | Cada problema con la tecnología que mejor lo resuelve; en caso de duda o empate, TypeScript | Hecho (ADR-001) |
| RNF-52 | Importa la disponibilidad, no la escala: tres usuarios y unas 200 ventas por día | Hecho (ADR-002) |
| RNF-53 | Dos ambientes: pruebas, que se actualiza solo con cada cambio, y producción, que se actualiza cuando el dueño lo pide | Hecho (ADR-012, ADR-013) |
| RNF-54 | El ambiente de pruebas se distingue a simple vista: la barra titila y dice «Ambiente de prueba»; producción no muestra nada de eso | Hecho |
| RNF-55 | Pruebas automáticas: las unitarias corren en cada cambio y todo cambio de comportamiento trae la suya; las de punta a punta cubren los caminos principales y se corren a mano. Sin mutation testing ni meta de cobertura | Hecho (ADR-004) |
| RNF-56 | Cada decisión técnica queda escrita con su porqué (un ADR) y la documentación se mantiene al día con el código | Hecho (`docs/adr/`) |

## 5. Casos de uso

### CU-01 Vender en el mostrador

- **Rol:** Vendedor.
- **Flujo:** busca el producto escribiendo o escaneando → ve costo, margen y precio → le dice
  el precio al cliente → pone la cantidad → elige el medio de pago → listo.
- **Alternativas:**
  - El cliente no acepta: se descarta con una tecla; se puede guardar como consulta (CU-03).
  - El producto no está en ninguna lista: se vende como ítem libre con nombre y precio.
  - El producto no tiene margen: se elige ahí mismo y queda guardado.
  - Es un cliente importante: se cobra a cuenta corriente con su nombre.
  - Se vende suelto o el precio se pone a mano: el renglón se redondea para arriba a $1.000 (RF-19).
  - No hay internet: la venta queda en el dispositivo y se manda sola al reconectar.

### CU-02 Corregir, anular, devolver o cambiar una venta

- **Rol:** Vendedor.
- **Flujo:** abre las ventas del día → elige la venta → la corrige o la anula (corregir es #56;
  hoy se anula y se carga de nuevo).
- **Alternativa:** cambio por otro producto: vuelve al stock lo devuelto, sale lo nuevo y se
  cobra la diferencia (RF-24). En esta etapa no hay devoluciones de plata.

### CU-03 Anotar lo que pidieron y no se vendió

- **Rol:** Vendedor.
- **Flujo:** el cliente pregunta y no compra → un toque guarda producto, precio ofrecido y motivo.
- **Alternativa:** el cliente lo quiere igual: queda como pedido con su nombre, su teléfono y
  el día prometido, y aparece en la lista de cosas para comprar (RF-26).

### CU-04 Actualizar precios con la lista de un proveedor

- **Rol:** Comprador.
- **Flujo:** sube el archivo → el sistema reconoce el proveedor → muestra nuevos, cambiados y
  dados de baja → confirma → se actualizan los costos y, con el margen de cada producto, los
  precios de venta.
- **Alternativas:**
  - No reconoce el formato: pregunta de qué proveedor es y aprende (#22).
  - La lista llega sola por mail o por la web del proveedor y queda pendiente de confirmar (#25, #26).
  - Algo se ve mal en la vista previa: se descarta y no cambia nada.

### CU-05 Averiguar quién vende un producto y a cuánto

- **Rol:** Vendedor o Comprador.
- **Flujo:** busca el producto → ve todos los proveedores que lo tienen, el costo de cada uno
  y cuál es el más barato.

### CU-06 Registrar una compra a proveedor

- **Rol:** Comprador.
- **Flujo:** llega la mercadería → elige el proveedor → carga los renglones (escaneando,
  buscando o con una foto de la factura, #55) → confirma → sube el stock y queda el costo real.
- **Alternativas:** proveedor sin factura (se carga "sin comprobante"); llegó menos de lo pedido.

### CU-07 Cargar el stock que ya hay, de a poco

- **Rol:** Comprador.
- **Flujo:** elige una estantería → escanea o busca cada producto y pone cuántos hay → cierra
  el conteo → el sistema ajusta el stock y deja explicada cada diferencia.
- **Alternativa:** lo interrumpe un cliente: el conteo queda abierto y lo sigue después.

### CU-08 Ver cómo va el negocio

- **Rol:** Administrador, desde cualquier lado.
- **Flujo:** abre Negocio → ve ventas y ganancia del día, plata invertida en stock, lo más
  vendido, stock bajo, pedidos de clientes pendientes y novedades del día.

### CU-09 Vender a cuenta corriente y cobrar la deuda

- **Rol:** Vendedor.
- **Flujo:** vende con medio de pago "cuenta corriente" y elige el cliente → cuando el cliente
  paga, busca al cliente y marca la venta como pagada (#57) o registra un pago parcial (#43).

### CU-10 Hacer un presupuesto

- **Rol:** Vendedor.
- **Flujo:** lo arma igual que una venta → lo manda por WhatsApp o PDF → si el cliente acepta,
  lo convierte en venta con un toque (#45).

### CU-11 Decidir qué comprar

- **Rol:** Comprador.
- **Flujo:** mira stock bajo y pedidos de clientes → el sistema sugiere cantidades y el
  proveedor más barato → arma el pedido (#35, #36).

### CU-12 Cerrar la caja

- **Rol:** Vendedor.
- **Flujo:** al cerrar, tipea el efectivo contado → el sistema muestra la diferencia → el
  resumen del día les llega solo a los Administradores (#40).

### CU-13 Saber quién hizo qué

- **Rol:** Administrador.
- **Flujo:** abre el registro → filtra por usuario, fecha o tipo de acción (los filtros son #58;
  hoy se recorre de a 10 por página).

## 6. Fuera de esta etapa

- Factura electrónica de ARCA (RF-30).
- Devoluciones con reintegro o saldo a favor (RF-24b).
- Buscar un producto por foto (RF-09b): segunda versión.
- Permisos finos por rol (RF-72).
- Venta online (RF-31): la arquitectura deja la puerta abierta (ADR-003), pero no se construye acá.
  Es un negocio aparte del proyecto Tienda online.
- Licenciar el sistema a otras ferreterías (RF-32).

## 7. Decisiones del dueño

### Decisiones del 2026-10-08

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

### Decisiones del 2026-10-09

7. **Vuelto.** No hay billetes chicos: toda venta tiene que ser múltiplo de $1.000. Además
   del precio, se redondea para arriba cada renglón de la venta (RF-19).
8. **Roles y actores.** Los permisos se dan por rol: Administrador, Vendedor y Comprador,
   combinables. Los actores (Dueño, Empleado, Cliente, Proveedor) son las personas reales y
   se usan solo donde el rol no alcanza para describir el proceso (sección 2, RF-72).
9. **Dos interfaces.** La de celular queda como está. La de computadora vuelve al layout de
   tablas anterior al rediseño, con la paleta y la marca del celular (RNF-05, ADR-014).
10. **Entrar leyendo un QR.** Se quita: se entra con Google o con la huella (RF-70).
11. **Otras ferreterías.** Cada una con su instalación y su base de datos propias (RF-32).
12. **Lo que estaba marcado «Hecho» y no lo estaba del todo** pasa a «Hecho en parte» con su
    issue: corregir ventas (#56), marcar pagada una cuenta corriente (#57) y filtrar quién
    hizo qué (#58).

## 8. Revisión del 2026-10-09

Se comparó este documento con todo lo que el dueño pidió durante el desarrollo (2026-09-13
al 2026-09-15). Lo que faltaba se agregó:

- **Requerimientos nuevos en el documento, ya construidos:** RF-01b, RF-20b, RF-70b, RF-73,
  RF-74, RNF-09, RNF-44 y la sección 4.6 (RNF-50 a RNF-56).
- **Requerimiento que faltaba y sigue pendiente:** RF-43, precio distinto para clientes
  importantes según cantidad y velocidad de pago (relato del 2026-09-13; está en el alcance
  de #43).
- **Detalle sumado a requerimientos que ya estaban:** RF-01, RF-06, RF-08, RF-09, RF-10,
  RF-12, RF-16, RF-23, RF-50, RF-52, RF-53, RF-70, RF-71, RNF-04, RNF-06, RNF-20, RNF-40,
  RNF-43.
- **Sección 6:** se sumó RF-32, que estaba marcado fuera de esta etapa pero no figuraba.

No se cambió ningún estado ni se quitó nada.

## 9. Preguntas abiertas

Las contradicciones encontradas el 2026-10-09 quedaron resueltas (sección 7). Sigue abierto
esto; el agente que toque uno de estos puntos pregunta antes de avanzar.

1. **Qué rol puede qué (RF-72, #59).** Están definidos administrar (Administrador), vender
   (Vendedor) y recibir mercadería (Comprador). Falta decidir quién puede: cargar listas de
   precios, elegir márgenes, contar stock, unir duplicados, ver costos, ver las ventas del día
   y anular ventas. Los casos de uso de la sección 5 ponen listas, conteo y pedidos en el
   Comprador como propuesta, sin confirmar.
2. **El quinto actor.** El dueño habló de cinco actores y nombró cuatro: Dueño, Empleado,
   Cliente y Proveedor. Falta saber cuál es el quinto, o si son cuatro.
3. **Precio a mano que no es múltiplo de $1.000.** Hoy se redondea para arriba como todo lo
   demás: $1.500 tipeado a mano se cobra $2.000, y la pantalla lo explica. Si el precio a
   mano tiene que respetarse tal cual, RF-19 necesita esa excepción.
