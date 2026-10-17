# Plan: Ventas de hoy renovada

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-17) · **Maquetas**: variante C (aprobadas el
2026-10-17) · **Decisión técnica**: ninguna que pida un ADR.

## Summary

- **Sin cambios en el servidor.** Las ventas de cualquier día ya llegan con el permiso de «Hoy»
  («Ver las ventas del día»), cada una con su hora, medio, cliente, estado y renglones. Todo lo
  nuevo se calcula en el cliente, en el negocio compartido.
- **El resumen del día (RF-117 a RF-119).** Una función del negocio arma, de una lista de ventas:
  el total, cada medio con su importe y cuántas ventas, ventas, productos (renglones) y ticket
  promedio, sin las anuladas; lo vendido por hora; y la comparación con otra lista de ventas,
  hasta una hora (hoy) o entera (otro día).
- **El día anterior.** La pantalla pide el día que mira y el anterior a ese (el mismo pedido de
  siempre, con otra fecha); la comparación espera a que lleguen los dos.
- **Las ventas cortas (RF-120).** El renglón y su detalle salen de lo que ya llega; abrir y
  cerrar es de la pantalla.
- **Cambiar fecha (RF-121).** El día elegido es de la pantalla; «Volver a hoy» lo limpia.
- **Colores (RF-118).** Cuatro colores nuevos en la paleta compartida, uno por medio, con su fondo
  suave; una clase por medio los aplica al ícono donde aparezca.

## Technical Context

- Cliente web (`microservices/web`): negocio de ventas, las dos pantallas de «Hoy», la paleta, los
  textos compartidos y el ícono de los medios en «Anular», el cobro y «Cómo va el negocio».
- Rendimiento: un día tiene a lo sumo unos cientos de ventas; las cuentas son de una pasada.

## Constitution Check

- Especificación y maquetas aprobadas antes de programar. Cumple.
- La regla (qué suma, qué se compara) una sola vez en el negocio; las pantallas solo muestran. Cumple.

## Seguridad

- **Datos que toca:** las ventas de un día (importes, medios, clientes) que ya muestra «Hoy».
  Nada nuevo se guarda.
- **Permisos:** «Ver las ventas del día» para hoy y para otros días (decisión 111), el mismo
  permiso que ya pide el servidor para cualquier día; el servidor también deja pedir un día a
  quien tiene «Ver las ventas del negocio», que lo usa «Cómo va el negocio» (de antes de 017).
  «Hoy» sigue sin dejar tocar nada.
- **Qué entra desde afuera:** la fecha elegida: el calendario llega hasta hoy y una fecha futura
  escrita a mano no se toma; el servidor rechaza con 400 un día que no esté escrito AAAA-MM-DD.
- **Secretos:** ninguno.
- **Registro de quién hizo qué:** mirar no se registra, como hoy.

## Project Structure

### Documentation (this feature)

`spec.md`, `ux.md`, `plan.md`, `tasks.md`, `checklists/`, `maquetas/`.

### Source Code (repository root)

Cliente: negocio de ventas (el resumen del día), las pantallas «Hoy» del celular y de la
computadora, la paleta y los textos compartidos.

## Complexity Tracking

Sin desvíos.
