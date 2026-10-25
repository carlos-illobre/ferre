-- Quién hizo qué pasa a Auditoría (specs/027): Comercial anota cada evento en su bandeja de salida
-- y el kit lo entrega. Auditoría arranca vacía (decisión de Carlos), así que la tabla de eventos se va.
-- Lo único que Comercial leía de ella era el registro de cada unión de productos, para poder
-- separarlos: pasa a su propia tabla, con las uniones que ya había.
CREATE TABLE union_de_productos (
  id         uuid PRIMARY KEY,
  conservar  uuid NOT NULL REFERENCES producto(id),
  absorbido  uuid NOT NULL REFERENCES producto(id),
  -- Qué se movió de un producto al otro (filas por tabla, renglones borrados, datos de antes).
  registro   jsonb NOT NULL,
  hecha_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX union_por_absorbido ON union_de_productos (absorbido, hecha_en);

INSERT INTO union_de_productos (id, conservar, absorbido, registro, hecha_en)
SELECT id, (contenido->>'conservar')::uuid, (contenido->>'absorber')::uuid,
       contenido - 'conservar' - 'absorber' - 'sugerencia' - 'manual', fecha
  FROM evento
 WHERE tipo = 'producto.unido' AND contenido ? 'movidos';

DROP TABLE evento;
