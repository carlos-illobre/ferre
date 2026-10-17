# Plan: Catálogo para vender

**Spec**: [spec.md](spec.md) (aprobada el 2026-10-17) · **Maquetas**: variante B (aprobadas el
2026-10-17) · **Decisión técnica**: [ADR-022](../../docs/adr/ADR-022-la-venta-en-curso-vive-fuera-de-la-pantalla-vender.md)

## Summary

Sin cambios en el servidor ni en la base: todo es del cliente web, en las dos interfaces.

- **La venta en curso sale de Vender (ADR-022).** Un estado del negocio compartido
  (`src/negocio/ventas/`) con los renglones, el medio y el cliente, y la regla de agregar que hoy
  está en la venta (cantidad 1, suma si ya está). La venta de Vender lo usa en lugar de su
  propio estado. El espejo de la venta se engancha una vez desde cada aplicación.
- **Agregar desde el Catálogo (RF-108).** Celular y computadora llaman a la misma función del
  negocio. El aviso breve y el número en Vender del menú leen la venta compartida. En la
  computadora, la tecla «+» agrega el producto elegido. Solo con permiso de vender
  (`ventas.registrar`).
- **Stock (RF-107).** El catálogo ya tiene en memoria el stock de cada producto (se baja siempre,
  también buscando en el servidor). Una función compartida arma el texto: la cantidad con la
  abreviatura de su unidad («u.», «m», «kg», «l»), o «Sin stock» si es 0, negativo o no está.
  «Stock bajo» queda para RF-54.
- **Filtros (RF-109).** Una regla compartida filtra la lista ya buscada por disponibilidad y por
  marca. Las marcas salen del catálogo en memoria, sin repetir mayúsculas y minúsculas
  («3M» y «3m» son una); buscando en el servidor, de los resultados. El estado de los filtros
  es de la pantalla y no se guarda.
- **Pestañas y buscador (RF-110).** El alto mínimo de las pestañas del celular y los textos del
  buscador, en `textos.ts` (largo en la computadora, corto en el celular).
- **Interfaz.** Según las maquetas aprobadas: en el celular, tarjetas separadas por 1 px, nombre
  en negrita y mayúsculas, etiqueta de stock arriba del nombre, margen en verde y «Agregar»
  secundario (36 px, decisión 104) debajo del precio; filtros en una hoja. En la computadora,
  la columna Stock con la etiqueta, «Agregar» debajo del precio de venta y «Filtros» con panel.

## Technical Context

- Cliente web (React, Vite) de `microservices/web`; el negocio compartido en `src/negocio/`, las
  pantallas en `src/pantallas/celular/` y `src/pantallas/compu/` (ADR-018).
- Rendimiento: sin filtros, la búsqueda trae de a tramos, como siempre. Con filtros puestos o
  abiertos se toma todo lo encontrado (con la búsqueda vacía, el catálogo entero, hasta 11.000) y
  se filtra una vez por cambio de búsqueda, de filtro o de stock; las marcas salen de eso mismo.
  Es un recorrido de la lista en memoria: no se midió con 11.000 (SC-004 queda por medir, en
  `proyecto/estado.yml`).
- Sin conexión: agregar no habla con el servidor; la venta se cobra como siempre (cola).

## Constitution Check

- I. La regla está en `spec.md`; el código la sigue.
- III. Mismas reglas y textos en las dos interfaces; el texto del buscador, resumido en el celular.
- IV. Agregar funciona sin internet.
- VI. Una prueba por escenario, que lo nombra (`015-E01`…).
- VII. Ver «Seguridad».

## Seguridad

- **Datos que toca:** el catálogo y el stock que el dispositivo ya tiene, y la venta en curso en
  memoria. Ningún dato personal nuevo; nada se guarda nuevo en el dispositivo ni en el servidor.
- **Permisos:** «Agregar» (botón y tecla «+») solo para quien tiene `ventas.registrar`. Esconderlo
  es comodidad: la regla la sigue haciendo el servidor, que rechaza registrar una venta a quien
  no tiene ese permiso, como hoy. Los filtros y el stock los ve cualquiera con sesión, como el
  Catálogo.
- **Qué entra desde afuera:** nada nuevo. Lo que se escribe en el buscador de marcas solo filtra
  la lista en el dispositivo; no viaja al servidor.
- **Secretos:** ninguno.
- **Registro de quién hizo qué:** sin cambios: la venta se registra al cobrar, con quién y desde
  qué dispositivo, como hoy. Agregar a la venta no es un hecho que se registre (tampoco lo es
  agregar en Vender).

## Project Structure

### Documentation (this feature)

```text
specs/015-catalogo-para-vender/
├── spec.md, ux.md, plan.md, tasks.md
├── maquetas/      # variante B aprobada; A y C de registro
└── checklists/
```

### Source Code (repository root)

```text
microservices/web/src/
├── negocio/ventas/        # la venta en curso compartida, agregar, el espejo de la venta
├── negocio/catalogo/      # (nuevo) el texto del stock y los filtros, compartidos
├── pantallas/textos.ts    # textos del buscador, de «Agregar», del aviso y de los filtros
├── pantallas/celular/     # Catálogo (tarjetas, filtros en hoja), menú con número
└── pantallas/compu/       # Productos (columna Stock, «Agregar», tecla +, panel de filtros), menú
```

## Complexity Tracking

Sin desvíos de la constitución.
