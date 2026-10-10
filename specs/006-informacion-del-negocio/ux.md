# UX: Información del negocio

Requerimientos de interfaz de la capacidad: qué tiene que poder hacer cada rol, qué
información necesita a la vista y en qué orden, y qué exige la regla en cada interfaz. No
fija un diseño. Las reglas de negocio y sus aclaraciones abiertas están en la
especificación (RF-60 a RF-65); lo que acá depende de una aclaración lo dice.

## Reglas para toda la capacidad

- **En el celular y en la computadora.** Si son dos interfaces o una que se adapta lo
  decide el diseño. En esta versión todos los usuarios son Administrador y ven todo. Todo se puede usar en el celular y en la computadora, con
  la misma información y las mismas palabras. En el celular nada se desplaza hacia el
  costado; en la computadora todo se opera con teclado y se aprovecha el ancho.
- **El Administrador mira a distancia, desde el celular.** Lo del Administrador se piensa
  primero para el celular: los números principales se leen sin tocar nada y sin desplazar.
- **Leer, no cargar.** Salvo el cierre de caja y la carga de gastos, en esta capacidad no se
  tipea nada: abrir y leer.
- **Todo número se toca y se explica.** Al tocarlo (o al enfocarlo y dar Enter en la
  computadora) muestra la cuenta con sus números de origen, y desde ahí se llega a las
  ventas, las compras o los gastos que lo forman.
- **Importes:** en pesos, con punto de miles y sin centavos ($16.000). Un importe en contra
  se distingue por el signo o por un texto, además del color.
- **Fechas:** día/mes/año. Todo período dice desde qué día y hasta qué día cuenta.
- **Palabras:** «cuenta corriente», «costo», «ganancia», «Gastos de la semana», «Cierre de
  caja», «Novedades del día». El lugar donde el Administrador ve cómo va el negocio se
  llama «Negocio».
- **Sin ventanas de confirmación**, salvo para lo que no se puede recuperar.
- **Cada rol ve lo suyo.** Lo que un rol no puede ver no aparece, ni como opción
  deshabilitada.

### Estados que valen para todo bloque de información

| Estado | Qué exige |
|---|---|
| Cargando | Se ve que está cargando, en el lugar donde va a aparecer el número, sin que lo ya cargado se mueva de lugar. Nunca se muestra $0 mientras carga |
| Vacío | Un texto que dice qué pasa y, si corresponde, qué hacer; nunca un bloque que desaparece ni un espacio en blanco |
| Error | En el lugar, en castellano, dice que no se pudo cargar y ofrece reintentar. Un bloque con error no impide leer los demás |
| Sin conexión | Dice que los números se ven cuando vuelva internet. Si se muestran los últimos números recibidos, dicen de qué momento son y no se confunden con los actuales. Al volver la conexión se actualizan solos |
| Éxito | El número aparece o cambia sin recargar; un aviso que no interrumpe confirma lo que se guardó |

## Historia 1: gasto de la semana (Comprador; RF-65)

**Qué tiene que poder hacer el Comprador**

- Ver el gasto de la semana en el mismo lugar donde registra las compras, sin ir a otra parte.
- Ver cuánto se le compró a cada proveedor y en cuántas compras.
- Abrir un proveedor y ver las compras que forman su importe.

**Información, en este orden**

1. El nombre «Gastos de la semana» con el total y el período (desde qué día, hasta qué día).
2. El detalle por proveedor, de mayor a menor importe: nombre, importe y cantidad de compras.
3. Al abrir un proveedor: cada compra con su fecha y su total.

**Reglas**

- El total está a la vista sin tocar nada, en las dos interfaces; el detalle por proveedor
  se alcanza en las dos, con a lo sumo un toque en el celular.
- Al registrar o anular una compra, el total y el detalle cambian sin recargar.
- Una compra anulada no figura en el detalle ni suma.
- El Administrador ve el mismo bloque, con las mismas reglas, dentro de Negocio (historia 2).

**Estados propios**

- Vacío: total $0 y «En la semana no se registraron compras».
- Sin conexión: una compra registrada sin conexión no suma hasta que el servidor la
  confirma; el bloque dice que el gasto se ve cuando vuelva internet.

## Historia 2: tablero de ventas y ganancia (Administrador; RF-60)

**Qué tiene que poder hacer el Administrador**

- Abrir Negocio y leer, sin tocar nada, cómo va el día.
- Cambiar entre el día, la semana y el mes.
- Comparar cada número con el del período anterior.
- Tocar cualquier número y ver de dónde sale.
- Llegar desde ahí a lo demás que dice cómo va el negocio.

**Información, en este orden**

1. El período elegido, con sus fechas. Al abrir, el día.
2. Vendido y ganancia del período: son los dos números principales y los primeros que se leen.
3. Cantidad de ventas y ticket promedio.
4. Junto a cada uno de los cuatro números: el valor del período anterior y la diferencia,
   en pesos y en porcentaje, con la dirección dicha en palabras o con signo («20 % más»).
5. Novedades del día (historia 4).
6. Gasto de la semana en compras (historia 1).
7. Lo más vendido y lo que no rota (historia 5).
8. Plata invertida en stock, stock bajo, pedidos de clientes sin entregar y listas de
   precios sin aplicar: cada uno con su número y la forma de llegar a su detalle, con las
   reglas de su capacidad (RF-53, RF-54, RF-26, RF-01).

**Reglas**

- En el celular, los puntos 1 a 4 se leen sin desplazar; el resto, desplazando hacia abajo.
- En la computadora, los puntos 1 a 4 y al menos el nombre y el número de cada uno de los
  demás bloques entran sin desplazar; se cambia de período con el teclado.
- Los números del día están a la vista en menos de 2 segundos en el celular. Cada bloque
  carga por separado: uno lento no demora a los principales.
- Cambiar de período no pierde el lugar ni vuelve al principio.
- La ganancia se explica con lo vendido y el costo de lo vendido, y desde ahí se llega a
  las ventas del período con su precio y su costo.
- Qué fechas abarca «la semana» y «el mes», y contra qué se compara, dependen de las
  aclaraciones de RF-60; la interfaz siempre muestra las fechas de los dos períodos que
  compara.

**Estados propios**

- Vacío (día sin ventas): vendido $0, 0 ventas, ganancia $0 y «Todavía no se registraron
  ventas en el día». El ticket promedio no muestra un número.
- Período anterior sin ventas: «En el período anterior no hubo ventas», sin porcentaje.
- Sin el rol Administrador: Negocio no ofrece el tablero.

## Historia 3: cierre de caja (Vendedor; RF-62)

**Qué tiene que poder hacer el Vendedor**

- Cerrar la caja desde donde vende, sin buscar la opción.
- Tipear un solo dato: el efectivo contado.
- Ver la diferencia apenas cierra, y de dónde sale.

**Información, en este orden**

1. De qué día es el cierre.
2. El lugar para tipear el efectivo contado, con el foco puesto y, en el celular, el
   teclado de números abierto.
3. La acción de cerrar la caja.
4. Después de cerrar: el efectivo contado, el efectivo esperado y la diferencia, que es el
   dato principal y dice en palabras hacia qué lado es: «$2.000 de menos en la caja»,
   «$3.000 de más en la caja» o «La caja cierra justa».
5. Al tocar la diferencia: cuántas ventas en efectivo hubo, cuánto suman y cuánto se contó.

**Reglas**

- En la computadora se cierra la caja completo con el teclado: tipear y Enter.
- Cerrar la caja no pide confirmación; el resultado queda a la vista hasta que el Vendedor
  sale.
- El cierre no frena el mostrador: desde el resultado se vuelve a vender con un toque o una
  tecla.
- La diferencia no se presenta como una acusación ni como un error de la app: es un dato.
- Si el efectivo esperado se muestra antes de tipear, si se puede cerrar más de una vez y
  si hay otros movimientos de efectivo para anotar dependen de las aclaraciones de RF-62.

**Estados propios**

- Error de carga: importe vacío o que no es un importe de cero o más → en el lugar,
  «Tipeá el efectivo que contaste»; no se guarda nada y lo tipeado no se pierde.
- Sin conexión: el cierre se acepta, queda guardado en el dispositivo y se ve que está sin
  enviar; se manda solo al volver internet y recién entonces muestra la diferencia, que
  necesita todas las ventas del día.
- Éxito: aviso de que la caja quedó cerrada, con el resultado a la vista.
- Error del servidor: el importe tipeado no se pierde y se reintenta solo.

## Historia 4: novedades del día (Administrador; RF-63)

**Qué tiene que poder hacer el Administrador**

- Recibir el resumen del día sin abrir la app y entenderlo sin abrirla.
- Ver las novedades del día dentro de Negocio.
- Ir a las novedades de un día anterior.

**Información, en este orden** (la misma en el mensaje y en la app)

1. El día.
2. Total vendido y cantidad de ventas.
3. Lo cobrado por cada medio de pago: efectivo, Mercado Pago, tarjeta y cuenta corriente.
4. Diferencia de caja, con el efectivo contado y el esperado; si la caja no se cerró, lo dice.
5. Ítems libres vendidos: descripción, cantidad y precio de cada uno.
6. Alertas (las que defina la aclaración de RF-63).

**Reglas**

- El mensaje enviado se lee entero en la pantalla de un celular, es texto simple en
  castellano y trae la forma de abrir las novedades de ese día en la app.
- Lo que necesita atención (una diferencia de caja, una alerta) va antes que lo de rutina
  dentro de su bloque y se distingue sin depender del color.
- En la app, cada número se toca y lleva a su origen: las ventas del día, el cierre de
  caja, el ítem libre.
- Se pasa al día anterior y al siguiente sin volver a Negocio; en la computadora, con el
  teclado.

**Estados propios**

- Vacío: «En el día no se registraron ventas».
- Día en curso: los números son los del momento, y se dice que el día no terminó.

## Historia 5: lo más vendido y lo que no rota (Administrador; RF-61)

**Qué tiene que poder hacer el Administrador**

- Ver de un vistazo los productos que más se venden.
- Ver los productos que llevan 90 días sin venderse.
- Abrir un producto de cualquiera de las dos listas y ver de dónde sale el dato.

**Información, en este orden**

1. Lo más vendido: el período que abarca y los productos en orden, cada uno con su nombre
   y cuánto se vendió (la medida depende de la aclaración de RF-61).
2. Lo que no rota: cada producto con su nombre, la fecha de su última venta (o que nunca
   se vendió) y su stock.
3. Al abrir un producto: las ventas que forman el número, o su último movimiento.

**Reglas**

- Las dos listas se distinguen sin ambigüedad: una es lo que conviene tener, la otra es
  plata parada.
- Las cantidades van en la unidad del producto; lo fraccionado, con hasta un decimal.
- Una lista larga no obliga a desplazar para llegar a la otra: se ven primero los
  principales de cada una y el resto se pide.
- En la computadora las listas son tablas que se recorren con el teclado.

**Estados propios**

- Sin ventas en el período: «Todavía no hay ventas para mostrar».
- Nada sin rotación: «No hay productos sin rotación».

## Historia 6: gastos y resultado mensual (Administrador; RF-64)

**Qué tiene que poder hacer el Administrador**

- Cargar un gasto con tres datos: concepto, importe y mes.
- Corregir un gasto o darlo de baja, y ver quién lo cambió y cuándo.
- Ver el resultado del mes y de dónde sale.
- Comparar los últimos 12 meses.
- Ver cuánto hay que vender por día para cubrir los gastos.

**Información, en este orden**

1. El mes elegido. Al abrir, el mes en curso.
2. El resultado del mes, que es el dato principal, dicho en palabras hacia qué lado es («a
   favor», «en contra»).
3. La cuenta: vendido, costo de lo vendido, ganancia bruta, gastos, resultado.
4. Los gastos del mes: concepto e importe de cada uno, y el total.
5. El punto de equilibrio: cuánto hay que vender por día, con su cuenta al tocarlo.
6. Los últimos 12 meses: el resultado de cada uno, comparables de un vistazo, con la
   posibilidad de elegir un mes y ver su cuenta.

**Reglas**

- La comparación de los 12 meses se lee también sin el gráfico: cada mes tiene su importe
  en texto, y a favor y en contra no se distinguen solo por el color.
- En el celular, la comparación de los 12 meses entra en el ancho de la pantalla.
- Cargar un gasto en la computadora se resuelve con el teclado; en el celular, el importe
  abre el teclado de números.
- El concepto se elige entre los ya usados o se escribe uno nuevo, para no tipear dos veces
  lo mismo.
- Dar de baja un gasto no lo borra: sigue en el historial, así que no pide confirmación.
- El mes en curso dice que está incompleto.

**Estados propios**

- Mes sin gastos cargados: muestra la ganancia bruta y «Este mes no tiene gastos cargados»,
  con la forma de cargar el primero.
- Mes sin ventas: ganancia bruta $0 y el resultado igual a los gastos, en contra.
- Error de carga de un gasto: en el lugar, dice qué dato corregir («Poné el importe del
  gasto»); lo tipeado no se pierde.
- Éxito: el gasto aparece en la lista y el resultado cambia sin recargar.
- Sin conexión: dice que el resultado se ve cuando vuelva internet y, si se intenta
  cargar un gasto, lo tipeado no se pierde.

## Textos que son regla

| Texto | Dónde | Por qué |
|---|---|---|
| «Gastos de la semana» | Nombre del gasto semanal en compras | Es el nombre del papel que reemplaza |
| «Negocio» | Lugar donde el Administrador ve cómo va el negocio | Nombre del caso de uso |
| «Novedades del día» | Resumen diario, en la app y en el mensaje | RF-63 |
| «Cierre de caja», «efectivo contado» | Historia 3 | RF-62 |
| «cuenta corriente» | Medio de pago, en todos lados | Constitución, principio IX: nunca «fiado» |
| «costo», «ganancia» | Tablero y resultado | Constitución, principio IX: palabras del mostrador |
| Rol y no persona: «Administrador», «Vendedor», «Comprador» | Donde se nombre quién | Constitución, principio IX |

Los demás textos entre comillas de este documento fijan qué tiene que decir el mensaje, no
su redacción exacta.
