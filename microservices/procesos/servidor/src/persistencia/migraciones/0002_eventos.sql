-- Lo que se hizo en Procesos, con quién (specs/026, E10): lo anota el módulo en su propia base, en
-- la misma transacción que el cambio. Quién se copia (identificador y nombre en ese momento)
-- porque el módulo no tiene usuarios.

CREATE TABLE procesos.evento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  usuario_id text NOT NULL,
  usuario_nombre text NOT NULL,
  contenido jsonb NOT NULL
);
CREATE INDEX evento_fecha ON procesos.evento (fecha);
