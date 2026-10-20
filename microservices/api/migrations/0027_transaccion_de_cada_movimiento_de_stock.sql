-- La descarga a mano para trabajar sin conexión (specs/018, historia 5): «Actualizar» trae solo el
-- stock de los productos que se movieron desde la descarga anterior. Cada movimiento anota la
-- transacción que lo hizo; quien lee guarda el «xmin» de su foto y la próxima vez lee desde ahí
-- (como cambio_de_producto, migración 0026). Los movimientos que ya estaban quedan con la
-- transacción de esta migración: son anteriores a cualquier descarga.
ALTER TABLE movimiento_stock ADD COLUMN transaccion xid8 NOT NULL DEFAULT pg_current_xact_id();
CREATE INDEX movimiento_stock_transaccion ON movimiento_stock (transaccion);
