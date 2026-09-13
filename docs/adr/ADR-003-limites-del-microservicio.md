# ADR-003: Este repo es el microservicio de mostrador; se integra por API y eventos

**Estado:** Aceptado
**Fecha:** 2026-09-13

---

## Contexto

El dueño quiere pensar este proyecto como un microservicio que luego se integrará con
otros que aún no existen, por ejemplo uno de ventas online. Hoy no hay nada más que este
sistema, y separar de más ahora tiene costo sin beneficio.

## Opciones consideradas

### 1. Separar desde el inicio en varios servicios (catálogo, ventas, stock)
Mejor aislamiento, pero triplica la infraestructura para un local con un empleado, y los
límites entre catálogo, precios y stock todavía no se conocen bien. Una separación
equivocada es más cara de deshacer que una tardía de hacer.

### 2. Un monolito sin contrato público
Lo más rápido hoy. Descartado: la integración futura obligaría a abrir la base de datos a
otros servicios o a rehacer la API.

### 3. Un servicio de mostrador con contrato público y eventos, más el importador aparte (elegida)
Un deployable de negocio con límites explícitos, preparado para que el próximo servicio se
enganche sin tocar este.

## Decisión

- Este repositorio contiene **dos servicios**: `mostrador` (catálogo, precios, stock,
  ventas, compras del local) e `importador` (lectura de listas de proveedores). Cada uno
  autocontenido: su Dockerfile, su build, su suite.
- `mostrador` expone una **API HTTP documentada con OpenAPI**. Es la única forma de leer o
  escribir sus datos desde afuera. **Ningún otro servicio accede a su base de datos.**
- `mostrador` publica **eventos de dominio** (venta registrada, compra ingresada, stock
  ajustado, precio cambiado) en una tabla de eventos con formato JSON versionado. Hoy los
  consume la propia app (sincronización y auditoría); mañana un broker o un servicio de
  ventas online los lee desde ahí. Se elegirá broker cuando exista un segundo consumidor.
- Los identificadores son UUID generados en el cliente, para que un pedido creado en otro
  servicio o sin conexión no colisione.
- Autenticación entre servicios: token de servicio en la API desde el primer día, aunque el
  único cliente sea la PWA.

## Consecuencias

### Positivas
- Un servicio de ventas online futuro consulta catálogo y stock por API y publica pedidos
  como eventos, sin tocar este repo más que para agregar un consumidor.
- El registro de eventos es además la auditoría y la base de la sincronización offline.

### Negativas
- Mantener OpenAPI y versionado de eventos cuesta desde el día uno, cuando todavía no hay
  otro consumidor.

### Lo que no cambia
Un solo docker-compose levanta todo; el empleado ve una sola aplicación.

## Cuándo revisar esta decisión

- Cuando aparezca el segundo consumidor de eventos: elegir broker.
- Si `mostrador` crece hasta que catálogo y ventas cambien por motivos distintos y a ritmos
  distintos: separarlos, con la tabla de eventos como costura.

## Referencias

ADR-001. Skill `microservicios-base`.
