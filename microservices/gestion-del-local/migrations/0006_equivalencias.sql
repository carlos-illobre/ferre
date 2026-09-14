-- Un mismo artículo en varios proveedores (issue #29). Las sugerencias se calculan al
-- aplicar listas; el dueño confirma o rechaza; unir conserva ventas, stock y precios.
CREATE TABLE equivalencia_sugerida (
  id            uuid PRIMARY KEY,
  producto_a    uuid NOT NULL REFERENCES producto(id),
  producto_b    uuid NOT NULL REFERENCES producto(id),
  motivo        text NOT NULL CHECK (motivo IN ('codigo_barras', 'descripcion')),
  estado        text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'unida', 'rechazada')),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  resuelto_en   timestamptz,
  resuelto_por  uuid REFERENCES usuario(id),
  CHECK (producto_a < producto_b),
  UNIQUE (producto_a, producto_b)
);
CREATE INDEX equivalencia_pendiente ON equivalencia_sugerida (estado) WHERE estado = 'pendiente';

-- Un producto absorbido por otro queda inactivo y apunta al que lo reemplaza.
ALTER TABLE producto ADD COLUMN reemplazado_por uuid REFERENCES producto(id);
