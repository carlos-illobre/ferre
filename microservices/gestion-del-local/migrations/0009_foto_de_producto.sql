-- Foto del producto (URL). La carga de fotos llega con su propio issue; por ahora se puede
-- fijar por la API y se muestra en Productos.
ALTER TABLE producto ADD COLUMN foto_url text;
