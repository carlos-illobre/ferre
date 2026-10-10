# Requerimientos de interfaz: Clientes

Qué tiene que poder hacer cada rol en cada recorrido de [spec.md](spec.md) y qué exige la
regla en cada interfaz. No fija un diseño: cualquier diseño que cumpla esto vale.

## Reglas que valen para todos los recorridos

- **En el celular y en la computadora.** Cada recorrido se hace completo en los dos, con la
  misma marca y las mismas palabras; si son dos interfaces o una que se adapta lo decide el
  diseño (constitución, principio III).
- **Roles.** En esta versión todos los usuarios son Administrador y pueden hacer todo; el
  rol que nombra cada historia dice quién hace ese trabajo en el local.
- **Computadora:** todo se opera con teclado, de punta a punta; el mouse nunca es la única
  forma. El foco siempre se ve y, al terminar una acción, vuelve al lugar desde donde se
  sigue trabajando.
- **Celular:** todo se alcanza con una mano, con el pulgar; nada se desplaza hacia el
  costado; lo que se toca tiene tamaño de dedo.
- **El orden es el del mostrador:** la cuenta corriente no cambia el orden de la venta
  (buscar, precio, cantidad, cobro). Elegir el cliente es parte del cobro.
- **Nada obligatorio que el cuaderno no tenga.** De un cliente, lo único obligatorio es el
  nombre.
- **Sin ventanas de confirmación**, salvo para lo que no se puede recuperar.
- **Los avisos van en el lugar**, en castellano, dicen qué hacer y desaparecen solos al
  corregir la causa.
- **Todo número calculado se puede tocar** y explica de dónde sale, con los números de
  origen: lo que debe un cliente, su saldo, el precio que se le cobra.
- **Lo que tarda muestra su avance.** Buscar un cliente responde en menos de 100 ms.
- **Sin conexión no se nota:** elegir el cliente, cobrar, marcar como pagada, registrar un
  pago y buscar un cliente se usan igual. Lo que todavía no confirmó el servidor se
  distingue sin alarmar y se manda solo.

## Textos que son regla

- Se dice **«cuenta corriente»**, nunca «fiado» ni «crédito».
- Se dice **«cliente»** para el cliente importante; el cliente de barrio no aparece en
  ningún texto como algo a cargar.
- Lo que debe un cliente se dice con el verbo **«debe»** y el monto; quien no debe nada
  está **«al día»**.
- La acción sobre una venta se llama **marcar como pagada**; el estado de la venta es
  **«pagada»** o **«sin pagar»**.
- Los montos van en pesos, con el signo y el punto de miles ($15.000).
- En los textos se nombra el rol (Administrador, Vendedor, Comprador), no la persona.

## Historia 1: cobrar una venta a cuenta corriente (Vendedor)

**Tiene que poder:** elegir «Cuenta corriente» entre los medios de pago, elegir el cliente,
cambiarlo antes de cobrar, y cobrar.

**Necesita a la vista, en este orden:**

1. Los medios de pago, con «Cuenta corriente» como uno más.
2. Al elegirla, los clientes importantes activos, ordenados por nombre, cada uno con lo que
   debe o con que está al día.
3. El cliente elegido, junto al medio de pago, mientras la venta sigue abierta.
4. Al cobrar, la confirmación con «Cuenta corriente» y el nombre del cliente.
5. En las ventas del día, la venta con «Cuenta corriente» y el nombre del cliente.

**Computadora:** elegir «Cuenta corriente», recorrer la lista de clientes, elegir uno y
cobrar se hace sin soltar el teclado.

**Celular:** elegir «Cuenta corriente» lleva directo a elegir el cliente, sin un paso
intermedio; la lista y el botón de cobrar quedan al alcance del pulgar.

**Estados:**

- *Vacío:* si no hay clientes cargados, dice que todavía no hay clientes con cuenta
  corriente y cómo cargar uno.
- *Cargando:* la lista de clientes guardada en el dispositivo se muestra de inmediato; no
  se espera al servidor para poder elegir.
- *Error:* cobrar sin cliente no registra la venta y avisa en el lugar que hay que elegir
  el cliente; en el celular, además, vuelve a ofrecer la lista. El aviso se va solo al
  elegir el cliente o al cambiar el medio de pago.
- *Sin conexión:* se elige entre los clientes guardados y se cobra igual; lo que debe cada
  cliente incluye las ventas cobradas en ese dispositivo que el servidor todavía no confirmó.
- *Éxito:* la confirmación nombra al cliente y la venta siguiente arranca sin cliente.

## Historia 2: marcar como pagada una venta a cuenta corriente (Vendedor)

**Tiene que poder:** encontrar al cliente, ver sus ventas sin pagar y marcar una como pagada con una sola acción.

**Necesita a la vista, en este orden:**

1. Los clientes que deben, cada uno con el total que debe.
2. De un cliente, sus ventas sin pagar: fecha, total y productos, uno por renglón.
3. En cada venta, la acción de marcarla como pagada.
4. Después de marcarla, lo que el cliente sigue debiendo.

**Computadora:** recorrer clientes y ventas y marcar una como pagada se hace con teclado.

**Celular:** marcar como pagada es un toque sobre la venta, al alcance del pulgar.

**Estados:**

- *Vacío:* si nadie debe nada, lo dice.
- *Cargando:* muestra lo guardado en el dispositivo y avisa si todavía se está actualizando.
- *Error:* si el servidor rechaza la marca porque la venta ya estaba pagada o anulada, la
  lista se actualiza y lo explica en el lugar, sin frenar el trabajo.
- *Sin conexión:* la venta se marca igual, deja de figurar como deuda en ese dispositivo y
  se distingue que el servidor todavía no la confirmó.
- *Éxito:* la venta deja la lista de sin pagar y el total del cliente baja a la vista.

Si marcar como pagada pide confirmación o se puede deshacer depende de una pregunta abierta
de la historia 2 de la especificación.

## Historia 3: dar de alta un cliente importante

**Tiene que poder:** cargar un cliente escribiendo solo el nombre, agregar el teléfono si
quiere, y guardarlo.

**Necesita a la vista:** el nombre como primer dato y único obligatorio, marcado como tal;
el teléfono como opcional; después de guardar, el cliente disponible para venderle.

**Computadora:** se carga y se guarda con teclado; el foco arranca en el nombre.

**Celular:** el teclado del teléfono no tapa el botón de guardar; el campo del teléfono
abre el teclado numérico.

**Estados:**

- *Vacío:* donde se listan los clientes, si no hay ninguno, dice para qué sirve cargar un
  cliente y ofrece cargarlo.
- *Cargando:* guardar muestra su avance y no deja guardar dos veces.
- *Error:* sin nombre, avisa en el campo que el nombre es obligatorio y no guarda.
- *Éxito:* el cliente aparece cargado, al día.

## Historia 4: buscar un cliente y ver su ficha (Vendedor, Administrador)

**Tiene que poder:** buscar por parte del nombre, abrir la ficha, ver lo que el cliente
compró y lo que debe, y, con permiso, cambiar sus datos o desactivarlo.

**Necesita a la vista, en este orden:**

1. La búsqueda, con los resultados mientras escribe: nombre y lo que debe.
2. En la ficha: nombre y teléfono, condición (contado o cuenta corriente) y condición de
   precio.
3. Lo que debe, con las ventas que lo componen.
4. Lo que compró, de lo más nuevo a lo más viejo: fecha, total, si está pagada o sin pagar,
   y los productos de cada venta, uno por renglón.

**Computadora:** buscar, recorrer los resultados, abrir la ficha y volver a la búsqueda se
hace con teclado.

**Celular:** la ficha se lee de arriba hacia abajo; lo que debe queda arriba, sin tener que
desplazarse para verlo.

**Estados:**

- *Vacío:* sin clientes cargados, ofrece cargar uno; una búsqueda sin resultados dice que
  no hay clientes con ese nombre; un cliente sin compras lo dice en su ficha.
- *Cargando:* la ficha muestra los datos guardados en el dispositivo y avisa si las compras
  todavía se están trayendo.
- *Error:* si no se pueden traer las compras, lo dice en el lugar y ofrece reintentar; los
  datos del cliente y lo que debe siguen a la vista.
- *Sin conexión:* la búsqueda y los datos del cliente funcionan igual.
- *Éxito:* un cambio de datos se ve aplicado en la ficha sin recargar.

Desactivar un cliente no borra nada: sus ventas y su ficha se conservan.

## Historia 5: llevar la cuenta corriente completa (Vendedor, Administrador)

**Tiene que poder:** el Vendedor, registrar un pago de un cliente; el Administrador, ver
quién debe, cuánto y desde cuándo, y generar el resumen de un cliente para mandarlo por
WhatsApp.

**Necesita a la vista, en este orden:**

1. Los clientes con saldo, cada uno con su saldo y la antigüedad de su deuda.
2. De un cliente: su saldo, que se puede tocar para ver las ventas y los pagos que lo
   componen.
3. Al registrar un pago: el saldo antes, el monto que se carga y el saldo que queda.
4. El resumen de cuenta antes de mandarlo.

**Computadora:** registrar un pago es escribir el monto y confirmar con teclado.

**Celular:** el monto se carga con teclado numérico; mandar el resumen abre WhatsApp con el
resumen listo, sin copiar y pegar.

**Estados:**

- *Vacío:* si ningún cliente tiene saldo, lo dice; un cliente sin pagos lo dice en su cuenta.
- *Cargando:* generar el resumen muestra su avance.
- *Error:* un monto inválido se avisa en el campo y dice qué monto vale.
- *Sin conexión:* el pago se registra igual y se distingue que el servidor todavía no lo
  confirmó.
- *Éxito:* el saldo nuevo queda a la vista apenas se registra el pago.

Cómo se muestra la antigüedad, qué lleva el resumen y a qué se aplica un pago dependen de
preguntas abiertas de la historia 5 de la especificación.

## Historia 6: cobrarle a un cliente importante su precio (Vendedor)

**Tiene que poder:** venderle al cliente a su precio sin salir de la venta ni cambiar su
orden, y saber por qué ese precio.

**Necesita a la vista:** en cada renglón, el precio que se le cobra a ese cliente,
distinguible del precio de mostrador; al tocarlo, la explicación con el precio de mostrador
y la condición del cliente; el total, con el aviso de RF-19 si un precio puesto a mano lo
deja sin ser múltiplo de $1.000.

**Computadora:** ver la explicación del precio se hace con teclado, como cualquier otro
número calculado.

**Celular:** la explicación se abre con un toque sobre el precio y se cierra con otro.

**Estados:**

- *Sin conexión:* el precio del cliente se aplica igual, con lo guardado en el dispositivo.
- *Éxito:* la venta registrada conserva el precio cobrado.

Si el precio lo pone la persona a mano o lo calcula el sistema es una pregunta abierta de
la historia 6 de la especificación; de eso depende qué se ve antes de elegir el cliente.
