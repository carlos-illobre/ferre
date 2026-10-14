-- Procesos (specs/011-procesos, ADR-019). Todo en su propio esquema y sin referencias a tablas
-- de otra aplicación: para llevarlo a otra base se copia el esquema entero. Quién hizo cada
-- versión se copia (identificador y nombre) porque el módulo no tiene usuarios.

CREATE TABLE procesos.proceso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 120),
  -- Sube con cada cambio del borrador o del vigente: quien guarda dice sobre cuál dibujó (E41).
  revision integer NOT NULL DEFAULT 1,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX proceso_nombre_unico ON procesos.proceso (lower(nombre));

CREATE TABLE procesos.version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id uuid NOT NULL REFERENCES procesos.proceso (id) ON DELETE CASCADE,
  estado text NOT NULL CHECK (estado IN ('borrador', 'vigente', 'anterior')),
  bpmn text NOT NULL,
  pasos integer NOT NULL CHECK (pasos >= 0),
  hecha_por_id text NOT NULL,
  hecha_por text NOT NULL,
  creada_en timestamptz NOT NULL DEFAULT now(),
  actualizada_en timestamptz NOT NULL DEFAULT now()
);
-- A lo sumo un borrador y un vigente por proceso.
CREATE UNIQUE INDEX version_un_borrador ON procesos.version (proceso_id) WHERE estado = 'borrador';
CREATE UNIQUE INDEX version_un_vigente ON procesos.version (proceso_id) WHERE estado = 'vigente';
CREATE INDEX version_por_proceso ON procesos.version (proceso_id, actualizada_en DESC);
