# Feature Specification: Descarga eficiente

**Feature Branch**: `018-descarga-eficiente`

**Created**: 2026-10-20

**Status**: Borrador, para que Carlos la apruebe

**Input**: Carlos, el 2026-10-20, después del aviso de Supabase del 18/10 (la organización pasó
el tope del plan gratuito: 6,45 de 5 GB de datos que salen de la base y 1,51 de 1 GB de
registros; desde el 18/11 puede restringir la base): «hacé que sea eficiente, no tiene por qué
descargar todo de la base, que descargue solo lo que necesita, siempre paginado».

**Lo que pasa hoy** (medido en el código el 2026-10-20):

- Cada dispositivo vuelve a pedir el catálogo entero (unos once mil productos, cada uno con sus
  proveedores y costos: alrededor de 10 MB) cada vez que se abre una pantalla con productos y
  pasó un minuto, aunque no haya cambiado nada.
- El celular que no guarda datos, con la opción de arranque «Bajar el catálogo al abrir»,
  baja el catálogo entero cada vez que se abre la aplicación.
- El stock de todos los productos y todos los clientes se piden en cada pantalla.
- El chequeo de salud del servidor consulta la base cada 10 segundos y, como la conexión se
  cierra a los 10 segundos sin uso, casi siempre abre una nueva: cada conexión deja varios
  registros en la base. Se suma en los dos ambientes, pruebas y producción.

**Lo que muestra el panel de Supabase** (capturas de Carlos, 2026-10-20):

- Datos que salen de la base: casi nada del 6 al 9/10; picos los días de mucho uso (2,6 GB el
  11/10, unos 900 MB el 13/10, 750 MB el 17/10, 600 MB el 19/10) y unos 100 MB los días
  tranquilos. Sigue al uso de la aplicación, no a un reloj: es el catálogo que se vuelve a bajar.
- Registros: parejos, unos 105 MB por día todos los días, también los días sin uso. Es algo que
  corre solo a ritmo fijo: el chequeo de salud con su conexión nueva cada 10 segundos.

## Clarifications

### Session 2026-10-20

- Q: ¿Se descarga todo o solo lo necesario? → A: Solo lo necesario y siempre de a páginas (Carlos).
- Q: ¿Hacen falta los registros de la base? → A: No (Carlos): el sistema no tiene que generar registros que nadie usa.
- Q: ¿El chequeo de salud tiene que mirar la base? → A: No (Carlos): dice si el servidor anda, sin consultar la base.
- Q: El celular que no guarda datos, ¿cómo busca de arranque? → A: [NEEDS CLARIFICATION: hoy arranca en «Bajar el catálogo al abrir», que baja todo en cada apertura. ¿Pasa a arrancar en «Buscar en el servidor», se saca la opción de bajar todo, o queda como está?]

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El catálogo se actualiza con lo que cambió (Priority: P1)

La computadora, y el celular que guarda datos, tienen el catálogo entero para vender sin
conexión (RNF-10). Lo bajan entero una sola vez, de a páginas; después piden solo lo que
cambió desde la última vez.

**Why this priority**: Es casi todo el consumo de hoy.

**Independent Test**: Con el catálogo ya bajado, abrir pantallas durante una hora sin que
nadie cambie nada y medir que lo que llega del servidor es mínimo; cambiar el margen de un
producto en otro dispositivo y ver que llega solo ese.

**Acceptance Scenarios**:

1. **E01** **Given** un dispositivo con el catálogo ya bajado y nada cambiado en el servidor, **When** se abre una pantalla con productos y pasó el minuto, **Then** pregunta qué cambió y no llega ningún producto; la respuesta pesa menos de 2 KB.
2. **E02** **Given** otro dispositivo cambió el margen, el código o la foto de un producto, **When** se actualiza, **Then** llega solo ese producto y se ve con el cambio.
3. **E03** **Given** se aplicó una lista de precios que cambió el costo de 3.000 productos, **When** se actualiza, **Then** llegan esos 3.000, de a páginas, y no los demás.
4. **E04** **Given** un producto se unió a otro (duplicados), se separó o se dio de baja, **When** se actualiza, **Then** el dispositivo lo saca, lo devuelve o lo cambia como en el servidor, sin bajar el resto.
5. **E05** **Given** un proveedor cambió de nombre, **When** se actualiza, **Then** llegan los productos que lo muestran, con el nombre nuevo.
6. **E06** **Given** un dispositivo sin nada guardado (primera vez, o después de borrar lo guardado), **When** se abre, **Then** baja el catálogo de a páginas: los primeros enseguida y el resto atrás, como hoy.
7. **E07** **Given** la primera bajada se corta a la mitad (sin conexión, se cierra la aplicación), **When** vuelve, **Then** sigue desde la página donde quedó, sin volver a empezar.
8. **E08** **Given** una versión nueva cambia la forma de calcular los precios, **When** el dispositivo se actualiza, **Then** vuelve a bajar todo una vez, de a páginas, para que ningún precio quede calculado a la vieja.

---

### User Story 2 - El stock y los clientes, también solo lo que cambió (Priority: P1)

**Why this priority**: Hoy se piden enteros en cada pantalla.

**Independent Test**: Vender un producto y ver que al actualizarse llega el stock de ese
producto y no el de los once mil.

**Acceptance Scenarios**:

1. **E09** **Given** el stock ya bajado, **When** se vende, se ingresa mercadería, se ajusta o se cuenta un producto en cualquier dispositivo y otro se actualiza, **Then** a ese otro le llega solo el stock de los productos que se movieron.
2. **E10** **Given** nada se movió, **When** se abre una pantalla, **Then** no llega ningún stock ni ningún cliente.
3. **E11** **Given** se da de alta, se cambia o se da de baja un cliente, **When** se actualiza otro dispositivo, **Then** le llega solo ese cliente.
4. **E12** **Given** quien no tiene «Ver el dinero invertido», **When** le llega el stock, **Then** llegan las cantidades sin el valor, como hoy (RF-99).

---

### User Story 3 - Buscar en el servidor, de a páginas (Priority: P2)

El celular que no guarda datos y busca en el servidor recibe los resultados de a páginas: los
primeros enseguida y los siguientes al llegar al final de la lista.

**Why this priority**: Hoy trae como mucho 60 y no deja ver más; con páginas trae lo que se
mira.

**Independent Test**: Buscar «tornillo» (cientos de resultados), ver los primeros, bajar hasta
el final y ver que llegan los siguientes.

**Acceptance Scenarios**:

1. **E13** **Given** una búsqueda con 300 resultados, **When** se busca, **Then** llegan los primeros 50, en el mismo orden que hoy.
2. **E14** **Given** los primeros 50 a la vista, **When** se llega al final de la lista, **Then** llegan los 50 siguientes, con «Cargando más…» mientras tanto; al final, ninguno más.
3. **E15** **Given** un código escaneado, **When** se lo busca en el servidor, **Then** llega solo el producto de ese código, como hoy.
4. **E16** **Given** sin conexión a mitad de la lista, **When** se llega al final, **Then** dice que hace falta internet para ver más y deja reintentar; lo ya traído se sigue viendo.

---

### User Story 4 - Comprobar que el servidor anda no llena de registros la base (Priority: P1)

Los registros de la base no se usan (Carlos, 2026-10-20). Lo que corre solo, a ritmo fijo, no
abre conexiones nuevas a cada rato ni hace que la base anote algo cada pocos segundos.

**Why this priority**: Los registros pasan el tope todos los días, haya uso o no.

**Independent Test**: Con el servidor quieto una hora, contar cuántas conexiones nuevas a la
base se abrieron.

**Acceptance Scenarios**:

1. **E17** **Given** el servidor andando y sin uso, **When** pasa una hora, **Then** no hizo ninguna consulta a la base ni abrió ninguna conexión nueva.
2. **E18** **Given** el servidor andando, **When** se mira su salud, **Then** dice que anda y qué versión es, sin consultar la base; el despliegue sigue volviendo a la versión anterior si la nueva no arranca (RNF-13).
3. **E19** **Given** la base no responde, **When** alguien usa la aplicación, **Then** el pedido falla con el aviso de siempre y el mostrador sigue sin conexión (RNF-11); la salud del servidor no lo dice.

### Edge Cases

- Dos cambios del mismo producto entre dos actualizaciones: llega una vez, con el último.
- Un cambio hecho en este dispositivo que todavía no se mandó: sigue encima de lo que llega,
  como hoy, hasta que el servidor lo confirma.
- Un dispositivo que estuvo días sin abrirse: pide lo que cambió desde la última vez, aunque
  sean miles, de a páginas; no hace falta volver a bajar todo.
- El reloj del dispositivo está mal: no importa, la marca de «hasta dónde tengo» la da el
  servidor, no el dispositivo.
- Un dispositivo de una versión vieja que todavía pide el catálogo entero: el servidor se lo
  sigue dando, de a páginas, hasta que se actualiza.

## Requirements *(mandatory)*

### Functional Requirements

- **RF-122**: El dispositivo que guarda el catálogo lo baja entero una sola vez, de a páginas, y
  si se corta sigue donde quedó. Después pide solo lo que cambió desde su última actualización
  (productos cambiados, nuevos, unidos, separados o dados de baja), de a páginas. Cuándo se
  pregunta no cambia: al abrir una pantalla si pasó un minuto, o enseguida si algo lo cambió en
  el servidor (enmienda del 2026-10-12 de 009).
- **RF-123**: El stock y los clientes se actualizan igual: solo los que cambiaron.
- **RF-124**: Buscar en el servidor (RF-85) trae de a 50 resultados y los siguientes al llegar al
  final de la lista.
- **RF-125**: Ver si el servidor anda no consulta la base (Carlos, 2026-10-20). Nada de lo que corre
  solo, a ritmo fijo, consulta la base ni abre conexiones nuevas; las que se abren para atender
  pedidos se reutilizan.

### Non-Functional Requirements

- **RNF-62**: Con el uso de hoy, los dos ambientes juntos usan menos de la mitad de lo que permite
  el plan gratuito de la base por mes: menos de 2,5 GB de datos que salen de la base y menos de
  0,5 GB de registros. Lo mide Carlos en el panel de uso de Supabase un mes después de subirlo.

### Key Entities

- **Marca de actualización**: hasta qué cambio del servidor tiene cada dispositivo, por catálogo,
  stock y clientes. La da el servidor y la guarda el dispositivo. No es un dato del negocio.

## Success Criteria *(mandatory)*

- **SC-001**: Una actualización sin cambios pesa menos de 2 KB (hoy, unos 10 MB).
- **SC-002**: Después del cambio de un producto, llega un producto.
- **SC-003**: El consumo mensual queda bajo RNF-62.
- **SC-004**: Vender, buscar y escanear siguen igual de rápidos, con y sin conexión.

## Assumptions

- La computadora y el celular que guarda datos siguen teniendo el catálogo entero en el
  dispositivo: lo exige vender sin conexión (RNF-10, RNF-11). «Solo lo necesario» es, para
  ellos, bajar una vez y después solo lo que cambia.
- Las páginas son de 500 productos para bajar y actualizar, y de 50 resultados para buscar.
- Los demás pedidos (ventas del día, listas, auditoría) ya vienen por día o de a páginas y no
  cambian.
- Sin el chequeo, la base de pruebas puede pasar 7 días sin consultas si nadie la usa, y Supabase
  la pausa. Lo resuelve el monitor diario que ya está en el plan (RNF-12, T091), no el chequeo.
- Supabase no deja apagar sus registros en el plan gratuito; se bajan dejando de generarlos.
  Si después de subirlo siguen parejos y altos, Carlos mira en el panel qué registro se repite
  y se anota aparte.
