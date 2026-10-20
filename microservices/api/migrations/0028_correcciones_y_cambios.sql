-- Corregir y cambiar una venta (specs/019, ADR-024). La venta queda con sus valores vigentes y
-- cada corrección guarda una foto de antes y después; un renglón quitado se marca, no se borra. Un
-- cambio une la venta original con lo que volvió y lo que se llevó. La plata de cada diferencia es
-- un movimiento de dinero del día en que pasó; en cuenta corriente lleva al cliente y suma a su deuda.

CREATE TABLE correccion_venta (
  id             uuid PRIMARY KEY,
  venta_id       uuid NOT NULL REFERENCES venta(id),
  usuario_id     uuid REFERENCES usuario(id),
  dispositivo_id text,
  fecha          timestamptz NOT NULL,
  antes          jsonb NOT NULL,
  despues        jsonb NOT NULL,
  diferencia     numeric(12,2) NOT NULL,
  resuelta       text NOT NULL CHECK (resuelta IN ('cobrada', 'devuelta', 'cuenta_corriente', 'sin_diferencia')),
  creado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX correccion_venta_por_venta ON correccion_venta (venta_id);

ALTER TABLE item_venta ADD COLUMN quitado_por uuid REFERENCES correccion_venta(id);
ALTER TABLE item_venta ADD COLUMN devuelto numeric(12,3) NOT NULL DEFAULT 0 CHECK (devuelto >= 0);
ALTER TABLE item_venta ADD CONSTRAINT item_venta_devuelto_no_supera CHECK (devuelto <= cantidad);

CREATE TABLE cambio (
  id             uuid PRIMARY KEY,
  venta_id       uuid NOT NULL REFERENCES venta(id),
  usuario_id     uuid REFERENCES usuario(id),
  dispositivo_id text,
  fecha          timestamptz NOT NULL,
  diferencia     numeric(12,2) NOT NULL,
  resuelto       text NOT NULL CHECK (resuelto IN ('cobrado', 'devuelto', 'cuenta_corriente', 'sin_diferencia')),
  creado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cambio_por_venta ON cambio (venta_id);
CREATE INDEX cambio_por_fecha ON cambio (fecha DESC);

CREATE TABLE cambio_renglon (
  id              uuid PRIMARY KEY,
  cambio_id       uuid NOT NULL REFERENCES cambio(id),
  lado            text NOT NULL CHECK (lado IN ('vuelve', 'se_lleva')),
  item_venta_id   uuid REFERENCES item_venta(id),
  producto_id     uuid REFERENCES producto(id),
  descripcion     text NOT NULL,
  cantidad        numeric(12,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric(12,2) NOT NULL CHECK (precio_unitario >= 0),
  margen_aplicado integer,
  fallado         boolean NOT NULL DEFAULT false,
  CHECK (lado <> 'vuelve' OR item_venta_id IS NOT NULL)
);
CREATE INDEX cambio_renglon_por_cambio ON cambio_renglon (cambio_id);

CREATE TABLE movimiento_dinero (
  id            uuid PRIMARY KEY,
  fecha         timestamptz NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('cobro_diferencia', 'devolucion')),
  medio_pago    text NOT NULL CHECK (medio_pago IN ('efectivo', 'mercado_pago', 'tarjeta', 'cuenta_corriente')),
  cliente_id    uuid REFERENCES cliente(id),
  importe       numeric(12,2) NOT NULL CHECK (importe <> 0),
  venta_id      uuid NOT NULL REFERENCES venta(id),
  correccion_id uuid REFERENCES correccion_venta(id),
  cambio_id     uuid REFERENCES cambio(id),
  usuario_id    uuid REFERENCES usuario(id),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  CHECK (medio_pago <> 'cuenta_corriente' OR cliente_id IS NOT NULL),
  CHECK ((correccion_id IS NULL) <> (cambio_id IS NULL))
);
CREATE INDEX movimiento_dinero_por_fecha ON movimiento_dinero (fecha DESC);
CREATE INDEX movimiento_dinero_cuenta_corriente ON movimiento_dinero (cliente_id) WHERE medio_pago = 'cuenta_corriente';

ALTER TABLE movimiento_stock DROP CONSTRAINT movimiento_stock_tipo_check;
ALTER TABLE movimiento_stock ADD CONSTRAINT movimiento_stock_tipo_check CHECK (tipo IN ('venta', 'compra', 'ajuste', 'correccion', 'cambio'));
ALTER TABLE anomalia DROP CONSTRAINT anomalia_tipo_check;
ALTER TABLE anomalia ADD CONSTRAINT anomalia_tipo_check CHECK (tipo IN ('venta_sin_stock', 'devuelto_fallado'));
