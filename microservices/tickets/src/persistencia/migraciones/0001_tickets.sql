-- Los tickets: errores y mejoras que reporta quien usa el sistema, con sus fotos (specs/028,
-- RF-80, RF-81). Arrancan vacíos (Carlos). Quién lo cargó y quién lo resolvió se guardan con su
-- nombre de ese momento: Tickets no consulta a otro servicio.
CREATE TYPE tickets.tipo_de_ticket AS ENUM ('error', 'mejora');
CREATE TYPE tickets.estado_de_ticket AS ENUM ('abierto', 'resuelto');

CREATE TABLE tickets.ticket (
  id                   uuid PRIMARY KEY,                -- lo pone el dispositivo: un reenvío no se guarda dos veces
  tipo                 tickets.tipo_de_ticket NOT NULL,
  descripcion          text NOT NULL,
  dispositivo          text,
  version              text,
  usuario_id           text NOT NULL,
  usuario_nombre       text NOT NULL,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  estado               tickets.estado_de_ticket NOT NULL DEFAULT 'abierto',
  resuelto_en          timestamptz,
  resuelto_por_id      text,
  resuelto_por_nombre  text,
  nota                 text
);
CREATE INDEX ticket_por_fecha ON tickets.ticket (creado_en DESC);

CREATE TABLE tickets.ticket_foto (
  ticket_id  uuid NOT NULL REFERENCES tickets.ticket(id),
  orden      integer NOT NULL,
  archivo    text NOT NULL,                             -- nombre al azar dentro de la carpeta de fotos
  PRIMARY KEY (ticket_id, orden)
);
