-- Los eventos de todos los servicios (specs/027, contrato v1: docs/auditoria/contrato-v1.md).
-- Solo suman filas (RNF-30): un evento no se cambia ni se borra, ni siquiera desde la base.

CREATE TABLE auditoria.evento (
  id uuid PRIMARY KEY,
  servicio text NOT NULL,
  tipo text NOT NULL,
  fecha timestamptz NOT NULL,
  quien_id text,
  quien_nombre text,
  dispositivo text,
  titulo text NOT NULL,
  detalle text,
  grupo text NOT NULL,
  importancia text NOT NULL CHECK (importancia IN ('normal', 'revisar', 'anulacion')),
  referencias jsonb NOT NULL DEFAULT '[]',
  contenido jsonb NOT NULL DEFAULT '{}',
  recibido_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evento_fecha ON auditoria.evento (fecha DESC, id DESC);
CREATE INDEX evento_quien ON auditoria.evento (quien_id, fecha DESC);
CREATE INDEX evento_grupo ON auditoria.evento (grupo, fecha DESC);

CREATE FUNCTION auditoria.solo_suma() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Los eventos de auditoría no se cambian ni se borran';
END $$;
CREATE TRIGGER evento_solo_suma BEFORE UPDATE OR DELETE ON auditoria.evento
  FOR EACH ROW EXECUTE FUNCTION auditoria.solo_suma();
