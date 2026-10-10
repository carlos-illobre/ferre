# Preguntas abiertas

Reglas de negocio que ninguna fuente define. Salieron el 2026-10-10 al escribir las
especificaciones completas: en vez de inventar una regla, cada vacío quedó como pregunta.
Ese mismo día Carlos respondió las del precio a mano, los actores, los roles, las ramas y
el alcance del rediseño (decisiones 13 a 22).
Son 126. Cada una está marcada en su `spec.md` con `[NEEDS CLARIFICATION]`.

Solo Carlos las puede contestar. Cada respuesta se anota con su fecha en
[docs/decisiones-de-negocio.md](../docs/decisiones-de-negocio.md) y en la sección
Clarifications de la especificación, se escribe la regla donde estaba la marca y la
pregunta se borra de acá. Una especificación no está completa mientras tenga preguntas.

Las que más pesan para el rediseño de la interfaz, que es la prioridad, están al final:
«Facilidad de uso, medible».

### Generales

1. **Lector de códigos.** Un issue viejo hablaba de «lector USB o cámara del celular»; la regla actual dice que el único lector es la cámara del celular, y el código conserva un camino para lector USB. ¿Se quita, o se deja por si algún día se compra un lector?
2. **El conteo abierto.** La regla dice que nada se borra, pero en un conteo sin cerrar lo contado se puede corregir o quitar. ¿Vale tratar el conteo abierto como un borrador y que el histórico empiece al cerrarlo?

### Usuarios y acceso (007)

En esta primera versión todos los usuarios son Administrador y el Administrador puede hacer todo (decisión 18). Qué roles va a haber y qué puede cada uno se define más adelante, y no es una pregunta de esta etapa. Lo que falta:

1. **RF-72.** Si todos son Administrador, cualquiera puede desactivar a cualquier otro, incluido el Dueño; lo único que el sistema impide es desactivarse a uno mismo y quedarse sin ningún Administrador activo. Antes el dueño estaba protegido. ¿Se acepta así para esta versión?
2. **RF-70b.** En una computadora con lector de huella, ¿se puede vincular a mano y entrar con la huella, o la huella es solo del celular?
3. **RF-72.** Una venta cobrada sin conexión por alguien a quien se desactivó antes de reconectar: ¿se registra igual al reconectar, o se rechaza?
4. **RF-74.** Sin internet, ¿«Salir» lleva igual a la pantalla de entrada y la sesión se cierra en el servidor al reconectar, o no se puede salir sin conexión?

### Ventas (003)

**Vender y cobrar**
1. **RF-21.** Si el Vendedor cobra sin elegir cómo paga el cliente, ¿la venta se registra igual (y con qué medio: efectivo por omisión o «sin especificar») o se le exige elegir uno? El relevamiento dice que no tiene que frenar; el backend actual lo exige.

**Ítem libre (RF-22)**
2. Cuando un ítem libre se guarda como producto nuevo, ¿qué precio tiene la próxima vez: el importe tipeado en esa venta, o queda sin precio hasta cargarle costo y margen?
3. ¿Qué puede hacer el Administrador con la lista de ítems libres vendidos: convertir uno en producto, asociarlo a uno existente, marcarlo revisado?

**Ventas del día (RF-23)**
4. Al anular una venta, ¿se pide confirmación? ¿Se pide el motivo, obligatorio u opcional?
5. ¿Hasta cuándo se puede corregir o anular una venta: solo las del día, las de los últimos N días, o cualquiera?
6. Al corregir una venta, ¿solo se cambian cantidad y precio de sus renglones, o también agregar o quitar un renglón, cambiar el medio de pago o el cliente?

**Lo que pidieron y no se vendió (RF-25)**
7. Los motivos, ¿son una lista cerrada (¿cuáles, además de «no había» y «precio»?) o texto libre?
8. ¿Quién consulta lo anotado y cómo lo necesita ver: lista por fecha, o agrupado por producto con cuántas veces se pidió y por qué?
9. Cuando el cliente no lleva, ¿descartar la venta anota siempre la consulta, o hay dos acciones: descartar sin anotar y «No llevó», que anota?

**Cambios (RF-24)**
10. Si el producto nuevo vale menos que el devuelto, ¿qué pasa con la diferencia a favor del cliente, ya que no se devuelve plata?
11. Para registrar un cambio, ¿hay que encontrar la venta original (y lo devuelto se toma al precio pagado) o alcanza con decir qué producto vuelve, al precio del día? ¿Hay plazo?

**Pedidos de clientes sin stock (RF-26)**
12. Cuando llega la mercadería, ¿qué hace el sistema: avisarle al Vendedor para que llame, armarle un WhatsApp para mandar, o mandarlo solo?
13. ¿Cómo se cierra un pedido: se marca entregado a mano, se cierra solo al venderle ese producto? ¿Se puede cancelar si el cliente no vuelve?

**Presupuestos (RF-27)**
14. ¿Cuántos días vale un presupuesto, quién configura ese plazo y qué pasa cuando venció?
15. Al convertir un presupuesto vigente en venta, ¿se respetan sus precios o se recalculan con los del día?
16. ¿Un presupuesto tiene que llevar cliente, o se puede armar sin cliente?

**Comprobante por WhatsApp (RF-28)**
17. ¿Qué datos del negocio lleva (nombre, dirección, teléfono, CUIT, logo)? ¿Tiene que decir que no es una factura?
18. ¿El Vendedor tipea el teléfono en cada venta, lo elige de sus contactos, o solo se usa el de los clientes importantes?

**Ventas históricas del cuaderno (RF-29)**
19. ¿Qué diferencia entre el precio del cuaderno y el calculado cuenta como «grande» para el informe?
20. Las ventas cargadas del cuaderno, ¿descuentan stock y cuentan en los totales, o son solo para comparar precios?
21. El cuaderno no anota el medio de pago y sus precios no son múltiplos de $1.000: ¿se guardan con el precio tal cual, y con qué medio de pago?

**Etapas posteriores**
22. **RF-24b.** ¿Cuál es el plazo para aceptar una devolución?
23. **RF-30.** Factura electrónica: ¿se factura cada venta o solo cuando el cliente la pide? ¿Qué tipos de comprobante y con qué CUIT y punto de venta?
24. **RF-31.** Venta online: ¿qué productos se publican, a qué precio y cómo paga y recibe el cliente?
25. **RF-32.** ¿Qué controla la licencia en la instalación de otra ferretería: tiene vencimiento, qué pasa cuando vence y quién la renueva?

### Catálogo y precios (002)

**Listas de precios**
1. **RF-01.** ¿Qué es exactamente «dar de baja» un producto que ya no aparece en la lista nueva de su proveedor? ¿Deja de verse en la búsqueda y de poder venderse, o solo deja de tener costo de ese proveedor? ¿Qué pasa si tiene stock, o si lo vende otro proveedor? ¿Vuelve solo si reaparece en una lista posterior?
2. **RF-02.** Cuando un proveedor manda un PDF escaneado (una imagen, sin texto), ¿el sistema tiene que leerlo igual, o alcanza con que avise que no puede y que hay que pedirle el Excel?
3. **RF-04.** ¿Cuánto puede tardar en aparecer una lista desde que llega el correo? Una fuente dice menos de 10 minutos y otra que el correo se revisa cada 15.
4. **RF-04.** Cuando una lista llega sola, ¿por dónde se le avisa al Administrador (dentro de la aplicación, WhatsApp, correo)?
5. **RF-04.** ¿Qué proveedores autorizaron el acceso automático a su portal, o entregan una exportación oficial? Sin esa autorización no se automatiza ninguno.

**Productos de varios proveedores (RF-06)**
6. ¿A partir de cuántos días sin lista nueva deja de valer el costo de un proveedor para elegirlo como el más barato, y a partir de cuántos días se avisa que su lista está vieja? El código usa 120 y 45 días; nadie lo decidió.
7. Cuando una lista nueva deja más barato a un proveedor que no era el que estaba en uso, ¿el costo pasa solo al más barato, o se mantiene el que estaba hasta que alguien lo cambie? Si alguien había elegido el proveedor a mano, ¿se respeta?
8. Al unir dos productos, sus costos, ventas, compras y movimientos de stock históricos pasan a nombre del que se conserva, y vuelven si se separan. ¿Se acepta eso como excepción a «los históricos no se modifican»?

**Códigos y fotos**
9. **RF-08.** Si un código de barras desconocido se quiere asociar a un producto, pero ese código ya lo tiene otro, ¿se rechaza, se pasa al producto nuevo, o se sugiere que los dos son el mismo artículo?
10. **RF-09b.** Para buscar por foto, ¿contra qué se compara la foto: contra las que el local ya sacó de cada producto, contra las del catálogo del proveedor, o reconociendo lo que dice el envase?

**Costos, márgenes y precios**
11. **RF-11.** La regla del costo del 2026-09-13 (lista − descuento general − descuento por contado − ofertas vigentes, sin IVA) figura como no cerrada. ¿Queda aprobada tal cual? ¿Las ofertas que trae la planilla bajan el costo mientras duran?
12. **RF-15.** ¿A partir de qué porcentaje de suba del costo hay que avisar para revisar el producto, y quién puede cambiar ese porcentaje?
13. **RF-15.** ¿«Remarcar» es cambiar el precio escrito en la estantería de todo producto cuyo precio de venta cambió? ¿Hay algún otro caso que tenga que aparecer en el aviso?
14. **RF-16.** ¿Con qué criterio se reparten los gastos fijos entre los productos: por unidad vendida, por valor vendido, por rotación o por familia?
15. **RF-17.** ¿Cómo se entera el sistema de un descuento puntual: lo trae la lista como oferta, lo carga alguien a mano, o las dos cosas? ¿Hasta cuándo vale cuando el proveedor no dice la fecha de fin? ¿El precio de venta baja siempre, o solo si alguien lo aprueba?

**Proveedores**
16. **RF-18.** ¿Qué datos de contacto de un proveedor hay que guardar (vendedor, teléfono, WhatsApp, correo, dirección, CUIT, usuario de su portal) y quién puede verlos y cambiarlos?

### Compras y stock (005)

**Ingreso de mercadería (RF-50)**
1. Sin internet, ¿el ingreso tiene que quedar guardado en el dispositivo y mandarse solo al volver la conexión, como una venta, o alcanza con avisar que necesita internet y conservar lo cargado?
2. Si por error se carga dos veces la misma factura (mismo proveedor y número), ¿el sistema avisa, lo impide o lo deja pasar?
3. Al anular una compra, ¿el motivo es obligatorio u opcional?
4. Al anular una compra que había cambiado el costo de un producto, ¿el costo vuelve al anterior o queda el de la factura anulada?

**Stock y su valor (RF-53)**
5. El valor del inventario se pidió «por familia, por proveedor y general», y las etiquetas «en lote por familia», pero el catálogo no define familias. ¿Qué es una familia, de dónde sale y quién la asigna?
6. Cuando un producto lo venden varios proveedores, ¿con qué costo se valoriza su stock (última compra, el más barato, el habitual) y en el total de qué proveedor se suma?

**Conteo (RF-52)**
7. El conteo «funciona sin internet»: además de contar cada producto, ¿también tienen que poder hacerse sin conexión crear una estantería, empezar el conteo y cerrarlo?
8. Si un conteo queda abierto varios días y hubo ventas o compras de un producto ya contado, ¿la diferencia se calcula contra el stock del momento en que se contó o del momento del cierre?

**Factura por foto (RF-51)**
9. La computadora no tiene cámara: ¿la foto se carga eligiendo un archivo, se saca con el celular vinculado, o las dos?
10. ¿Hay que poder cargar facturas de varias hojas y facturas en PDF, o alcanza con una foto por compra?

**Stock bajo y pedidos (RF-54, RF-55)**
11. ¿Cómo se calculan el stock mínimo y la cantidad a pedir a partir de las ventas de los últimos 90 días? ¿Cambia según el proveedor (lo que tarda en entregar, si vende por caja cerrada)?
12. ¿Cómo llega el aviso de stock bajo: una marca en la aplicación, o además se manda en las novedades del día?
13. Los productos que nunca se contaron ni se compraron, ¿figuran como stock bajo, o quedan afuera del aviso hasta su primer conteo o compra?
14. ¿Un pedido necesita la aprobación del Administrador antes de mandarse al proveedor? ¿Todos, o solo los que superan un monto?
15. El pedido que recibe el proveedor, ¿muestra el costo de cada renglón y el total, o solo código, descripción y cantidad?
16. ¿Se puede cancelar un pedido ya enviado, y cerrar uno recibido en parte cuyo resto no va a llegar?

**Deuda con proveedores (RF-56)**
17. ¿Quién decide si una compra es a 30 o a 60 días: es fijo por proveedor o se elige en cada compra? ¿Desde qué fecha se cuenta el plazo?
18. El descuento por pagar por adelantado, ¿de cuánto es y dónde se carga? ¿Baja el costo de los productos de esa compra, o solo el importe a pagar?
19. ¿Hay pagos parciales a proveedores? ¿Hay que anotar con qué se pagó?
20. ¿El sistema tiene que avisar antes de que venza una deuda? ¿Con cuántos días y a quién?

**Etiquetas (RF-57)**
21. ¿Con qué se imprimen: una impresora de etiquetas (¿cuál, de qué medida?), hojas A4 autoadhesivas, o las dos?
22. ¿Se imprimen solo para los productos sin código de fábrica, o también para los que lo traen, para tener el precio a la vista?

**Plan de conteo (RF-58)**
23. ¿Con qué se ordena para clasificar: costo × unidades vendidas, costo × stock, o solo unidades vendidas? ¿Con las ventas de qué período? El índice dice «lo que más se vende» y el issue «lo que más vale».
24. Los A cubren el 70-80 % del valor; ¿dónde está el corte entre B y C?
25. «Qué toca contar», ¿lista productos sueltos o estanterías?

**Roles en esta capacidad (RF-72)**

### Clientes (004)

**RF-40: vender a cuenta corriente, marcar pagada y alta de clientes**
1. ¿Existen clientes importantes con condición «contado», a los que no se les vende a cuenta corriente? Si existen, ¿el sistema impide cobrarles a cuenta corriente, solo avisa, o no los ofrece al elegir el cliente?
2. ¿Una venta en efectivo, Mercado Pago o tarjeta puede llevar el nombre de un cliente importante, para que figure en su ficha? ¿O el cliente solo se anota en las ventas a cuenta corriente?
3. Cuando el cliente paga una venta a cuenta corriente, ¿se anota con qué pagó? ¿Esa plata cuenta en la caja del día en que pagó (RF-62)?
4. Si una venta se marca como pagada por error, ¿se puede deshacer? ¿Quién puede y hasta cuándo?
5. ¿Se puede anular una venta a cuenta corriente que el cliente ya pagó? Si se puede, ¿qué pasa con la plata?
6. ¿Un cliente nuevo queda habilitado para cuenta corriente por omisión, o hay que habilitarlo aparte?
7. ¿Puede haber dos clientes con el mismo nombre? Si no, ¿el sistema lo impide o solo avisa?
8. ¿Qué datos lleva un cliente además de nombre y teléfono (CUIT, dirección, nombre del negocio, notas)? ¿Alguno más es obligatorio?

**RF-42: búsqueda y ficha**
9. ¿Se puede desactivar un cliente que todavía debe? Si se puede, ¿su deuda sigue figurando?
10. ¿La ficha muestra cuánta ganancia deja el cliente? Si la muestra, ¿de qué período y qué rol puede verla?

**RF-41: cuenta corriente completa**
11. ¿El pago parcial se aplica a una venta en particular, o a la cuenta del cliente en general (baja el saldo y cancela primero las ventas más viejas)? Con pagos parciales, ¿se sigue pudiendo marcar una venta entera como pagada?
12. ¿El pago tiene que ser múltiplo de $1.000 como las ventas? ¿Puede pagar de más y quedar con saldo a favor?
13. ¿Cómo se mide la antigüedad de la deuda: días desde la venta sin pagar más vieja, o saldo repartido en tramos (hasta 30, hasta 60, más de 60 días)? ¿Desde cuántos días una deuda está atrasada?
14. ¿Qué lleva el resumen de cuenta (solo saldo, ventas sin pagar, productos, pagos), de qué período, y cómo se manda por WhatsApp (texto, imagen o PDF)?
15. ¿Cómo se carga lo que cada cliente ya debía en el cuaderno: un saldo inicial por cliente, o renglón por renglón con su fecha original?

**RF-43: precio distinto por cliente**
16. ¿El precio distinto lo decide la persona en el momento, a mano en el renglón, o lo calcula el sistema desde una condición guardada en la ficha (descuento o lista propia)?
17. Si lo calcula el sistema: ¿cómo se traducen «la cantidad que compra» y «lo rápido que paga» en un precio? ¿O el Administrador fija el descuento de cada cliente a ojo?
18. ¿El precio distinto vale solo cuando compra a cuenta corriente, o también cuando paga en el momento?

### Información del negocio (006)

**RF-60: tablero de ventas y ganancia**
1. ¿La «semana» y el «mes» son de calendario (lunes a domingo; del 1 al último día) o móviles (últimos 7 y últimos 30 días)? ¿Se puede mirar un período anterior, o solo el que está en curso?
2. ¿Contra qué se compara cada período? El día: ¿contra el día anterior o contra el mismo día de la semana anterior? La semana y el mes en curso, que están incompletos: ¿contra el período anterior entero o hasta el mismo día?
3. Un ítem libre se vende sin costo conocido. ¿Entra en la ganancia como ganancia total, con ganancia cero, o queda afuera y se muestra aparte?
4. Una venta a cuenta corriente, ¿cuenta en lo vendido y en la ganancia el día en que se vendió, o recién cuando el cliente paga?

**RF-61: lo más vendido y lo que no rota**
5. ¿«Lo más vendido» se ordena por unidades, por plata vendida o por ganancia? ¿De qué período? ¿Cuántos productos se muestran?
6. ¿«Lo que no rota» incluye solo productos con stock? Un producto que entró hace menos de 90 días y nunca se vendió, ¿figura como sin rotación?

**RF-62: cierre de caja**
7. ¿La caja arranca el día con un fondo de cambio? ¿Entra o sale efectivo que no es una venta (pagos a proveedores, retiros, gastos chicos, cobros de cuenta corriente)? Si pasa, ¿hay que anotarlos para que la diferencia los tenga en cuenta?
8. Antes de tipear lo contado, ¿el Vendedor puede ver cuánto efectivo espera el sistema, o se le muestra recién después de cerrar?
9. ¿Hay un solo cierre por día? Si el Vendedor se equivocó, ¿puede cerrar de nuevo? Una venta en efectivo registrada o anulada después del cierre, ¿cambia la diferencia de ese día o pasa al siguiente?

**RF-63: novedades del día**
10. ¿Por dónde se envía el resumen: WhatsApp, correo, o los dos? El envío no puede tener costo.
11. ¿Cuál es la «hora de cierre»: una hora fija (¿cuál?) o el momento en que el Vendedor cierra la caja? Si es fija y la caja no se cerró, ¿el resumen sale igual avisando? ¿Se envía los días en que el local no abre?
12. ¿Qué alertas trae el resumen? Por ejemplo: diferencia de caja, ventas anuladas, stock bajo, ventas con precio a mano, pedidos prometidos para el día.

**RF-64: gastos y resultado mensual**
13. Un gasto fijo (alquiler, sueldo), ¿se carga una vez y se repite cada mes, o se carga mes a mes?
14. Además de los fijos, ¿qué gastos variables hay que poder cargar (fletes, comisiones de Mercado Pago y de la tarjeta)? ¿Las comisiones se cargan a mano o las calcula el sistema?
15. Para el punto de equilibrio, ¿qué margen se usa (el del mes en curso, el promedio de los últimos meses) y entre cuántos días se reparte (qué días abre el local)?
16. El resultado tiene que cerrar con el del contador «dentro de un margen razonable». ¿Cuánta diferencia es aceptable, y contra qué número se compara (con o sin IVA, solo lo facturado o todo lo vendido)?

**RF-65: gasto semanal en compras**
17. ¿La «semana» del gasto son los últimos 7 días o la semana de calendario? ¿Hay que poder ver semanas anteriores?

### Base del sistema: requerimientos no funcionales (001)

**Sin conexión y sincronización**
1. **RNF-20, RNF-10.** Cuando una venta o un cambio hecho sin conexión es rechazado por el servidor al reconectar, ¿dónde queda y quién lo resuelve? Por ejemplo: una lista «No se pudieron enviar» que ve el Vendedor, o un aviso a los Administradores.
2. **RNF-10.** Si dos dispositivos cambian lo mismo sin conexión (por ejemplo, el margen de un producto), ¿qué valor queda?
3. **RNF-10.** Cuando un dispositivo con conexión cambia algo, ¿en cuánto tiempo como máximo lo ve otro dispositivo conectado: al instante, en un minuto, al reabrir la app?
4. **RNF-20.** Los 7 días de ventas en cada dispositivo sirven para rellenar un hueco si se restaura una copia vieja. ¿El dispositivo reenvía solo lo que le falta al servidor, o lo dispara el Administrador a mano?

**Respaldos y disponibilidad**
5. **RNF-21.** Los Excel originales de las listas y las fotos de productos son archivos, no filas de la base, y ninguna decisión dice dónde se guardan. Como la máquina no puede guardar datos, ¿dónde viven y entran en las copias?
6. **RNF-21.** ¿Las copias se hacen solo de la base de producción, o también de la de pruebas?
7. **RNF-21, RNF-52.** Con una copia por hora se pueden perder hasta 60 minutos de lo que no son ventas (compras, listas aplicadas, usuarios). ¿Se acepta? Si se pierde la máquina, ¿en cuánto tiempo como máximo tiene que estar el servidor andando de nuevo?
8. **RNF-22.** ¿Dónde se guarda la copia semanal cifrada (por ejemplo, un Google Drive del negocio), cuántas semanas se conserva y quién guarda la clave?
9. **RNF-23.** ¿Qué copia se restaura en la prueba mensual y qué diferencia con la base viva se acepta, dado que la base sigue recibiendo ventas?
10. **RNF-12.** ¿Por dónde les llega el aviso a los Administradores cuando el servidor no responde (correo, WhatsApp, notificación) y en cuánto tiempo como máximo? ¿Por ese mismo medio se avisa cuando falla una copia?
11. **RNF-30.** ADR-002 manda sacar de la base los eventos de más de un año. ¿Se acepta, o «quién hizo qué» se consulta para siempre desde la app?
12. **RNF-53.** Pruebas y producción se publican en el mismo sitio y el navegador les da el mismo almacenamiento. Si alguien abre los dos en un dispositivo, ¿sesión, catálogo y cambios por enviar tienen que estar separados por ambiente?

**Facilidad de uso, medible**
13. **RNF-01.** ¿Cuántas veces puede pedir ayuda un Vendedor nuevo en su primer día para dar el requerimiento por cumplido?
14. **RNF-02.** ¿Desde qué momento hasta cuál se cuentan los 20 segundos de una venta de 3 productos, y vale para la notebook, el celular o los dos?
15. **RNF-04.** El sistema visual pide letra mínima de 18 px en el celular y la interfaz actual usa textos más chicos. ¿Cuál vale?
16. **RNF-05, RNF-04.** «Alto contraste» no dice cuánto. ¿Se toma el mínimo habitual de accesibilidad (4,5 a 1 entre texto y fondo)?
17. **RNF-08.** ¿Hasta cuántos artículos hay que garantizar la búsqueda instantánea (100.000, 150.000, 200.000), y también en el celular o solo en la notebook?
18. **RNF-09.** ¿A partir de cuánto tiempo una operación tiene que mostrar su avance? ¿Vale 1 segundo?
19. **RNF-40.** La notebook del local tiene Windows 11; ¿cuáles son su marca, su modelo, su memoria y su resolución, y qué celular Android se usa? Sin eso se toma una pantalla de 1366×768.
