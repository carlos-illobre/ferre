# Plan: Ficha del producto renovada

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-17) · **Maquetas**: variante A (aprobadas el
2026-10-17) · **Decisión técnica**: ninguna que pida un ADR.

## Summary

- **Última lectura del código (RF-112).** Una columna nueva del producto, con la fecha y hora en
  que se cargó o se cambió su código. La pone el dispositivo al leer (para que sin conexión valga
  la hora de la lectura y no la de llegada) y viaja con el código en el mismo cambio del producto.
  El servidor la acepta solo junto con un código, no la deja en el futuro y la borra si se borra
  el código. El catálogo la trae con cada producto.
- **Archivo de origen (RF-115).** Un pedido nuevo al servidor con los datos de la lista de la que
  sale el costo: nombre del archivo, proveedor, fecha y cuántos productos cargó. Lo pide la ficha
  al abrirse y lo recuerda mientras la aplicación está abierta. Sin conexión, la ficha muestra el
  proveedor y la fecha que ya tiene.
- **La cuenta del precio (RF-114).** Una función del negocio compartido arma los renglones de
  «Así se calcula» a partir de la regla de precio que ya existe (costo, margen, IVA, redondeo).
- **Copiar el código (RF-112).** Una función de la plataforma copia un texto; si el navegador no
  deja, la pantalla selecciona el código.
- **Las dos fichas se rehacen** según la maqueta A, con los textos compartidos. El stock usa la
  etiqueta del Catálogo; «Agregar a la venta» usa la regla de 015; la tecla «+» en la ficha de la
  computadora, igual que en la lista.

## Technical Context

- Servidor: `microservices/api` (migración, esquema del cambio de producto, catálogo, listas).
- Cliente: `microservices/web` (negocio compartido, las dos pantallas, textos).
- El cambio de producto ya se manda en cola sin conexión: la hora de la lectura viaja en él.

## Constitution Check

- Especificación y maquetas aprobadas antes de programar. Cumple.
- Una regla, un lugar: la cuenta del precio en el negocio; la hora de la lectura la decide el
  servidor con lo que manda el dispositivo. Cumple.
- Las dos interfaces con las mismas reglas y textos. Cumple.

## Seguridad

- **Datos que toca:** la fecha de la última lectura (dato nuevo, no personal) y los datos de una
  lista de precios (nombre del archivo, proveedor, fecha, cantidad). Nada personal.
- **Permisos:** cargar el código lo puede cualquier usuario con sesión, como hoy (RF-08); la hora
  de la lectura no agrega un permiso. Los datos del archivo de origen piden «Ver costos»
  (`catalogo.costos`), igual que la tarjeta que los muestra. «Agregar a la venta» pide
  `ventas.registrar`, como en el Catálogo.
- **Qué entra desde afuera:** la hora de la lectura llega del dispositivo: se valida que sea una
  fecha y hora, que no esté en el futuro (se toma la del servidor si lo está), que no sea anterior
  al 2026, y que venga con un código. El id de la lista del pedido nuevo se valida; una lista que
  no existe da 404.
- **Secretos:** ninguno.
- **Registro de quién hizo qué:** cambiar el código ya se registra; el registro suma la hora de la
  lectura.

## Project Structure

### Documentation (this feature)

`spec.md`, `ux.md`, `plan.md`, `tasks.md`, `checklists/`, `maquetas/`.

### Source Code (repository root)

- Servidor: una migración; productos (esquema, reglas y datos del cambio, columna en el
  catálogo); listas (ruta, reglas y datos del origen).
- Cliente: negocio del catálogo (la cuenta del precio y el origen de la lista), plataforma
  (copiar), las dos fichas, textos compartidos.

## Complexity Tracking

Sin desvíos.
