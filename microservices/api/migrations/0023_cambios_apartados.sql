-- Lo apartado (specs/014-cambios-apartados, ADR-021): lo que una persona hizo sin conexión y no
-- llegó al servidor antes de que la desactivaran. Se guarda tal como estaba en la cola del
-- dispositivo (método, ruta y cuerpo) y no se aplica hasta que alguien lo acepta. La sesión y
-- el número de orden de la cola son únicos juntos: el mismo cambio no se guarda dos veces.
CREATE TABLE cambio_apartado (
  id            uuid PRIMARY KEY,
  usuario_id    uuid NOT NULL REFERENCES usuario(id),
  sesion_id     uuid NOT NULL REFERENCES sesion(id),
  orden         bigint NOT NULL,
  tipo          text NOT NULL,
  metodo        text NOT NULL CHECK (metodo IN ('POST', 'PUT', 'PATCH', 'DELETE')),
  ruta          text NOT NULL,
  cuerpo        jsonb,
  hecho_en      timestamptz NOT NULL,
  llegado_en    timestamptz NOT NULL DEFAULT now(),
  decision      text CHECK (decision IN ('aceptado', 'descartado')),
  decidido_por  uuid REFERENCES usuario(id),
  decidido_en   timestamptz,
  error         text,
  UNIQUE (sesion_id, orden)
);
CREATE INDEX cambio_apartado_pendiente ON cambio_apartado (llegado_en) WHERE decision IS NULL;
