-- Celular que escanea, laptop que muestra (issue #52). Un "puesto" es una laptop con
-- sesión abierta; el celular se vincula leyendo un QR y desde ahí cada código que escanea
-- llega a ese puesto.
CREATE TABLE puesto (
  id                  uuid PRIMARY KEY,
  sesion_id           uuid NOT NULL REFERENCES sesion(id),   -- la sesión de la laptop
  codigo_hash         text NOT NULL UNIQUE,                 -- código de un solo uso del QR
  nombre              text,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  vinculado_en        timestamptz,
  celular_sesion_id   uuid REFERENCES sesion(id),
  expira_en           timestamptz NOT NULL
);
CREATE INDEX puesto_por_sesion ON puesto (sesion_id);

CREATE TABLE codigo_escaneado (
  id           uuid PRIMARY KEY,
  puesto_id    uuid NOT NULL REFERENCES puesto(id),
  codigo       text NOT NULL,
  creado_en    timestamptz NOT NULL DEFAULT now(),
  entregado_en timestamptz
);
CREATE INDEX codigo_escaneado_pendiente ON codigo_escaneado (puesto_id, creado_en) WHERE entregado_en IS NULL;
