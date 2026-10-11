-- Tickets (RF-80): lo que quien usa el sistema reporta desde la app, un error que encontró
-- o una mejora que se le ocurrió, con texto y hasta cinco fotos o capturas de pantalla.
-- No se borran: se marcan resueltos, con quién, cuándo y una nota, y se pueden reabrir.
CREATE TABLE ticket (
  id              uuid PRIMARY KEY,                 -- lo pone el dispositivo: reenviar no duplica
  tipo            text NOT NULL CHECK (tipo IN ('error', 'mejora')),
  descripcion     text NOT NULL,
  dispositivo     text,                             -- «celular · Chrome»
  version         text,                             -- versión de la app desde la que se escribió
  usuario_id      uuid NOT NULL REFERENCES usuario(id),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  estado          text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'resuelto')),
  resuelto_en     timestamptz,
  resuelto_por    uuid REFERENCES usuario(id),
  nota            text                              -- qué se hizo, al marcarlo resuelto
);
CREATE INDEX ticket_por_fecha ON ticket (creado_en DESC);

CREATE TABLE ticket_foto (
  ticket_id       uuid NOT NULL REFERENCES ticket(id),
  orden           integer NOT NULL,
  archivo         text NOT NULL,                    -- nombre al azar dentro de la carpeta de tickets
  PRIMARY KEY (ticket_id, orden)
);
