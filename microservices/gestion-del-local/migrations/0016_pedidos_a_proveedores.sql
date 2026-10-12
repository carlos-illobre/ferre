-- Pedidos a proveedores (RF-55, decisión 52): lo que se encargó, a quién, y qué llegó.
-- El pedido se arma como borrador, se manda como texto y el ingreso de mercadería lo va
-- recibiendo, entero o en parte.
ALTER TABLE proveedor ADD COLUMN whatsapp text;

CREATE TABLE pedido (
  id            uuid PRIMARY KEY,
  proveedor_id  uuid NOT NULL REFERENCES proveedor(id),
  estado        text NOT NULL DEFAULT 'borrador'
                CHECK (estado IN ('borrador', 'enviado', 'recibido_parcial', 'recibido', 'cancelado', 'cerrado_incompleto')),
  creado_por    uuid REFERENCES usuario(id),
  enviado_por   uuid REFERENCES usuario(id),
  enviado_en    timestamptz,
  cerrado_por   uuid REFERENCES usuario(id),
  cerrado_en    timestamptz,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  modificado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER pedido_modificado BEFORE UPDATE ON pedido FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();
CREATE INDEX pedido_por_estado ON pedido (estado, creado_en);

CREATE TABLE item_pedido (
  id             uuid PRIMARY KEY,
  pedido_id      uuid NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  orden          integer NOT NULL,
  producto_id    uuid NOT NULL REFERENCES producto(id),
  cantidad       numeric(12,3) NOT NULL CHECK (cantidad > 0),
  -- El costo de la última lista de ese proveedor al armar el pedido; nulo si no lo vende.
  costo_estimado numeric(14,4),
  recibido       numeric(12,3) NOT NULL DEFAULT 0
);
CREATE INDEX item_pedido_por_pedido ON item_pedido (pedido_id, orden);

-- El ingreso que recibió mercadería de un pedido.
ALTER TABLE compra ADD COLUMN pedido_id uuid REFERENCES pedido(id);

-- El permiso nuevo, «Encargar compras», lo trae de arranque el rol Comprador.
INSERT INTO rol_permiso (rol_id, permiso)
SELECT id, 'deposito.pedidos' FROM rol WHERE id = '00000000-0000-4000-8000-0000000000a2'
ON CONFLICT DO NOTHING;
