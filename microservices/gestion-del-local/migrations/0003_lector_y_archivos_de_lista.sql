-- Qué lector del servicio listas-de-proveedores entiende la planilla de cada proveedor
-- (issue #12), y dónde quedó guardado el archivo original de cada lista cargada.
ALTER TABLE proveedor ADD COLUMN lector text;  -- 'ixnova' | 'comodo' | 'tresge' | 'erpa' | NULL (todavía sin lector)
ALTER TABLE lista_importada ADD COLUMN avisos jsonb NOT NULL DEFAULT '[]';
ALTER TABLE lista_importada ADD COLUMN cargada_por uuid REFERENCES usuario(id);
ALTER TABLE lista_importada ADD COLUMN aplicada_por uuid REFERENCES usuario(id);
