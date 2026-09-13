-- Modelo inicial (issue #6). Reglas:
--  * ids UUID generados en el cliente, para que lo creado sin conexión no choque.
--  * Nada se borra físicamente: se marca (activo, estado).
--  * Dinero: numeric(14,4) para costos (las listas traen 4 decimales), numeric(12,2) para precios de venta.
--  * Los históricos (precio_proveedor, movimiento_stock, evento) nunca se pisan: se agregan filas.

CREATE OR REPLACE FUNCTION tocar_modificado_en() RETURNS trigger AS $$
BEGIN
  NEW.modificado_en := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Quién vende. La configuración de IVA y descuentos es lo que el importador necesita
-- para calcular el costo neto (issue #11): lo que realmente se paga, sin IVA.
CREATE TABLE proveedor (
  id                   uuid PRIMARY KEY,
  nombre               text NOT NULL UNIQUE,
  precios_incluyen_iva boolean NOT NULL DEFAULT false,
  descuento_general    numeric(6,4) NOT NULL DEFAULT 0 CHECK (descuento_general BETWEEN 0 AND 1),
  descuento_contado    numeric(6,4) NOT NULL DEFAULT 0 CHECK (descuento_contado BETWEEN 0 AND 1),
  activo               boolean NOT NULL DEFAULT true,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  modificado_en        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER proveedor_modificado BEFORE UPDATE ON proveedor FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();

-- Cada archivo cargado. Se guarda el original para poder reprocesarlo (issue #12).
CREATE TABLE lista_importada (
  id             uuid PRIMARY KEY,
  proveedor_id   uuid NOT NULL REFERENCES proveedor(id),
  archivo_nombre text NOT NULL,
  archivo_ruta   text,
  fecha_lista    date NOT NULL,
  estado         text NOT NULL CHECK (estado IN ('pendiente', 'aplicada', 'descartada')),
  resumen        jsonb NOT NULL DEFAULT '{}',   -- nuevos, modificados, dados de baja, filas salteadas y por qué
  importada_en   timestamptz,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  modificado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER lista_importada_modificada BEFORE UPDATE ON lista_importada FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();
CREATE INDEX lista_importada_proveedor ON lista_importada (proveedor_id, fecha_lista DESC);

-- Lo que se vende. Al principio hay un producto por renglón de cada lista; unir el mismo
-- artículo de dos proveedores en uno solo es el issue #29 (proveedor_preferido_id).
-- margen_elegido: 300/200/100/50/25 (issue #13) o NULL si nunca se eligió.
CREATE TABLE producto (
  id                     uuid PRIMARY KEY,
  descripcion            text NOT NULL,
  marca                  text,
  codigo_barras          text,
  unidad                 text NOT NULL DEFAULT 'unidad',
  margen_elegido         integer CHECK (margen_elegido IN (300, 200, 100, 50, 25)),
  precio_manual          numeric(12,2) CHECK (precio_manual IS NULL OR precio_manual >= 0),
  proveedor_preferido_id uuid REFERENCES proveedor(id),
  activo                 boolean NOT NULL DEFAULT true,
  creado_en              timestamptz NOT NULL DEFAULT now(),
  modificado_en          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER producto_modificado BEFORE UPDATE ON producto FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();
CREATE INDEX producto_codigo_barras ON producto (codigo_barras) WHERE codigo_barras IS NOT NULL;

-- Histórico de precios por producto y proveedor. Nunca se actualiza: cada lista agrega
-- una fila, y "el costo actual" es la fila más reciente por (producto, proveedor).
-- descuentos: pasos aplicados en orden, para explicar el costo (issue #47),
-- p. ej. [{"tipo":"general","porcentaje":25},{"tipo":"contado","porcentaje":5}].
CREATE TABLE precio_proveedor (
  id                    uuid PRIMARY KEY,
  producto_id           uuid NOT NULL REFERENCES producto(id),
  proveedor_id          uuid NOT NULL REFERENCES proveedor(id),
  lista_importada_id    uuid REFERENCES lista_importada(id),
  codigo_proveedor      text NOT NULL,
  descripcion_proveedor text,
  precio_lista          numeric(14,4) NOT NULL CHECK (precio_lista >= 0),
  descuentos            jsonb NOT NULL DEFAULT '[]',
  costo_neto            numeric(14,4) NOT NULL CHECK (costo_neto >= 0),
  iva                   numeric(5,4) NOT NULL DEFAULT 0.21,
  cantidad_bulto        integer CHECK (cantidad_bulto IS NULL OR cantidad_bulto > 0),
  precio_bulto          numeric(14,4),
  fecha_lista           date NOT NULL,
  creado_en             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX precio_proveedor_por_codigo ON precio_proveedor (proveedor_id, codigo_proveedor, fecha_lista DESC);
CREATE INDEX precio_proveedor_por_producto ON precio_proveedor (producto_id, fecha_lista DESC);

-- Solo los clientes importantes; el cliente de barrio no se carga.
CREATE TABLE cliente (
  id               uuid PRIMARY KEY,
  nombre           text NOT NULL,
  telefono         text,
  cuenta_corriente boolean NOT NULL DEFAULT false,  -- si se le permite comprar a cuenta corriente
  activo           boolean NOT NULL DEFAULT true,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  modificado_en    timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER cliente_modificado BEFORE UPDATE ON cliente FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();

-- Una venta agrupa los renglones del cuaderno de un mismo cliente. dispositivo_id dice
-- desde qué navegador se creó (sincronización, issue #18).
CREATE TABLE venta (
  id             uuid PRIMARY KEY,
  fecha          timestamptz NOT NULL,
  cliente_id     uuid REFERENCES cliente(id),
  medio_pago     text NOT NULL CHECK (medio_pago IN ('efectivo', 'mercado_pago', 'tarjeta', 'cuenta_corriente')),
  total          numeric(12,2) NOT NULL CHECK (total >= 0),
  estado         text NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'anulada')),
  pagada_en      timestamptz,  -- solo cuenta corriente: cuándo el cliente pagó (el "tachar el renglón")
  dispositivo_id text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  modificado_en  timestamptz NOT NULL DEFAULT now(),
  CHECK (medio_pago <> 'cuenta_corriente' OR cliente_id IS NOT NULL)
);
CREATE TRIGGER venta_modificada BEFORE UPDATE ON venta FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();
CREATE INDEX venta_por_fecha ON venta (fecha DESC);
CREATE INDEX venta_cuenta_corriente_pendiente ON venta (cliente_id) WHERE medio_pago = 'cuenta_corriente' AND pagada_en IS NULL;

-- Cada renglón guarda lo necesario para explicar el precio para siempre (issue #47),
-- aunque el costo del producto cambie después. producto_id NULL = ítem libre (issue #17).
CREATE TABLE item_venta (
  id                  uuid PRIMARY KEY,
  venta_id            uuid NOT NULL REFERENCES venta(id),
  orden               integer NOT NULL,
  producto_id         uuid REFERENCES producto(id),
  descripcion         text NOT NULL,
  cantidad            numeric(12,3) NOT NULL CHECK (cantidad > 0),
  costo_neto          numeric(14,4),
  precio_proveedor_id uuid REFERENCES precio_proveedor(id),
  margen_aplicado     integer,
  precio_unitario     numeric(12,2) NOT NULL CHECK (precio_unitario >= 0),
  explicacion         jsonb NOT NULL DEFAULT '{}',
  creado_en           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venta_id, orden)
);
CREATE INDEX item_venta_por_producto ON item_venta (producto_id);

-- Lo que preguntaron y no compraron. Hoy pasa muy seguido y no se anota.
CREATE TABLE consulta (
  id              uuid PRIMARY KEY,
  fecha           timestamptz NOT NULL,
  producto_id     uuid REFERENCES producto(id),
  descripcion     text NOT NULL,
  precio_ofrecido numeric(12,2),
  motivo          text,
  dispositivo_id  text,
  creado_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consulta_por_fecha ON consulta (fecha DESC);

-- Ingreso de mercadería (issue #30). Dos proveedores no emiten factura: 'sin_comprobante'.
CREATE TABLE compra (
  id                 uuid PRIMARY KEY,
  proveedor_id       uuid NOT NULL REFERENCES proveedor(id),
  fecha              date NOT NULL,
  comprobante_tipo   text NOT NULL CHECK (comprobante_tipo IN ('factura', 'remito', 'sin_comprobante')),
  comprobante_numero text,
  total              numeric(12,2) NOT NULL CHECK (total >= 0),
  estado             text NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'anulada')),
  nota               text,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  modificado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER compra_modificada BEFORE UPDATE ON compra FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();
CREATE INDEX compra_por_fecha ON compra (fecha DESC);

CREATE TABLE item_compra (
  id             uuid PRIMARY KEY,
  compra_id      uuid NOT NULL REFERENCES compra(id),
  orden          integer NOT NULL,
  producto_id    uuid NOT NULL REFERENCES producto(id),
  cantidad       numeric(12,3) NOT NULL CHECK (cantidad > 0),
  costo_unitario numeric(14,4) NOT NULL CHECK (costo_unitario >= 0),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (compra_id, orden)
);

-- El stock no es un número: es la suma de movimientos, así se explica de dónde sale
-- igual que un precio. cantidad con signo: compra +, venta -, ajuste por conteo +/-.
CREATE TABLE movimiento_stock (
  id              uuid PRIMARY KEY,
  producto_id     uuid NOT NULL REFERENCES producto(id),
  tipo            text NOT NULL CHECK (tipo IN ('venta', 'compra', 'ajuste')),
  cantidad        numeric(12,3) NOT NULL CHECK (cantidad <> 0),
  referencia_tipo text,   -- 'venta' | 'compra' | 'conteo'
  referencia_id   uuid,
  fecha           timestamptz NOT NULL,
  nota            text,
  creado_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX movimiento_stock_por_producto ON movimiento_stock (producto_id, fecha);

-- Registro de eventos de dominio (ADR-003): alimenta la sincronización de la PWA hoy y a
-- otros servicios mañana. contenido es el evento completo en JSON, versionado por tipo.
CREATE TABLE evento (
  id             uuid PRIMARY KEY,
  tipo           text NOT NULL,
  version        integer NOT NULL DEFAULT 1,
  fecha          timestamptz NOT NULL,
  dispositivo_id text,
  contenido      jsonb NOT NULL,
  creado_en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evento_por_fecha ON evento (creado_en);
CREATE INDEX evento_por_tipo ON evento (tipo, creado_en);
