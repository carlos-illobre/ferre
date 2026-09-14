-- Conteo cíclico por sectores (issue #31). Nunca se hizo un recuento y no se puede cerrar
-- el local: se cuenta de a un sector por vez, con el celular, y al cerrar el sector las
-- diferencias contra el stock teórico se aplican como ajustes explicados.

CREATE TABLE sector (
  id            uuid PRIMARY KEY,
  nombre        text NOT NULL UNIQUE,
  orden         integer NOT NULL DEFAULT 0,
  activo        boolean NOT NULL DEFAULT true,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  modificado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER sector_modificado BEFORE UPDATE ON sector FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();

-- Dónde vive cada producto. Se asigna al contarlo: lo que se cuenta en un sector, es de ese sector.
ALTER TABLE producto ADD COLUMN sector_id uuid REFERENCES sector(id);
CREATE INDEX producto_por_sector ON producto (sector_id) WHERE sector_id IS NOT NULL;

CREATE TABLE conteo (
  id          uuid PRIMARY KEY,
  sector_id   uuid NOT NULL REFERENCES sector(id),
  estado      text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  abierto_en  timestamptz NOT NULL DEFAULT now(),
  abierto_por uuid REFERENCES usuario(id),
  cerrado_en  timestamptz,
  cerrado_por uuid REFERENCES usuario(id),
  resumen     jsonb NOT NULL DEFAULT '{}'   -- al cerrar: contados, ajustados, sin contar, diferencia total
);
-- Un solo conteo abierto por sector.
CREATE UNIQUE INDEX conteo_abierto_por_sector ON conteo (sector_id) WHERE estado = 'abierto';

CREATE TABLE renglon_conteo (
  id               uuid PRIMARY KEY,
  conteo_id        uuid NOT NULL REFERENCES conteo(id),
  producto_id      uuid NOT NULL REFERENCES producto(id),
  cantidad_contada numeric(12,3) NOT NULL CHECK (cantidad_contada >= 0),
  contado_en       timestamptz NOT NULL DEFAULT now(),
  contado_por      uuid REFERENCES usuario(id),
  UNIQUE (conteo_id, producto_id)
);
