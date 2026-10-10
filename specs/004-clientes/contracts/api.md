# API: Clientes

Todas piden sesión válida (sin sesión, 401 «Hay que iniciar sesión») y ninguna exige un rol
en particular.

| Método | Ruta | Rol que exige | Para qué sirve |
|---|---|---|---|
| GET | `/clientes` | Cualquiera con sesión | Lista los clientes activos, ordenados por nombre: `id`, `nombre`, `telefono`, `cuenta_corriente` y `deuda` (suma de sus ventas a cuenta corriente confirmadas y sin pagar) |
| POST | `/clientes` | Cualquiera con sesión | Crea un cliente. Cuerpo: `nombre` (obligatorio), `telefono` y `cuenta_corriente` (opcionales; `cuenta_corriente` vale `true` si no viene). Sin nombre: 400 «Hace falta el nombre del cliente». Responde 201 con el cliente y `deuda: "0"`. Registra el evento `cliente.creado` |
| POST | `/ventas` | Cualquiera con sesión | Registra una venta (capacidad de ventas). Lo que toca a clientes: acepta `cliente_id`; con `medio_pago: "cuenta_corriente"` y sin `cliente_id` responde 400 «Una venta a cuenta corriente necesita el cliente» |
| GET | `/ventas` | Cualquiera con sesión | Ventas de un día (capacidad de ventas). Lo que toca a clientes: cada venta trae `cliente` (el nombre, o nulo) y `pagada_en` |
| POST | `/ventas/:id/pagar` | Cualquiera con sesión | Marca como pagada una venta a cuenta corriente (pone `pagada_en`). Si la venta no es a cuenta corriente, está anulada o ya se pagó: 409 «La venta no es a cuenta corriente, está anulada o ya se pagó». Responde 204 y registra el evento `venta.pagada` |
