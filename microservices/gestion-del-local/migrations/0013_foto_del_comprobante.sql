-- Foto del comprobante de una compra (RF-50): en vez de tipear el número de la factura o
-- del remito, se le saca una foto y el número se lee de ahí. La foto se sube antes de
-- registrar la compra (puede venir del celular mientras el ingreso se carga en la
-- computadora), por eso nace sin compra y se le une al registrar.
CREATE TABLE foto_comprobante (
  archivo    text PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuario(id),
  compra_id  uuid REFERENCES compra(id),
  creado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX foto_comprobante_compra ON foto_comprobante (compra_id);
CREATE INDEX foto_comprobante_sueltas ON foto_comprobante (usuario_id, creado_en) WHERE compra_id IS NULL;
