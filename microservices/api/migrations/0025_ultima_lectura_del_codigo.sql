-- La última lectura del código de barras de un producto (specs/016, RF-112): cuándo se cargó o se
-- cambió por última vez. La pone el dispositivo al leer; sin dato, el código se cargó antes.
ALTER TABLE producto ADD COLUMN codigo_leido_en timestamptz;
