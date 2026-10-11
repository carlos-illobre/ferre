-- Anomalías (RF-59): cada vez que lo que dice el sistema no coincide con lo que hay en la
-- realidad, queda anotado, a modo de auditoría. La primera: se vendió un producto que según
-- el sistema no tenía stock. El stock no baja de cero por una venta; lo que faltaba se anota acá.
CREATE TABLE anomalia (
  id          uuid PRIMARY KEY,
  tipo        text NOT NULL CHECK (tipo IN ('venta_sin_stock')),
  producto_id uuid NOT NULL REFERENCES producto(id),
  usuario_id  uuid REFERENCES usuario(id),
  venta_id    uuid REFERENCES venta(id),
  cantidad    numeric(12,3) NOT NULL CHECK (cantidad > 0),
  detalle     text NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX anomalia_por_fecha ON anomalia (creado_en DESC);
