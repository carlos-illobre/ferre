-- El margen se elige con los botones (300/200/100/50/25) o se tipea cualquier porcentaje
-- entero a mano. Ya no existe el "precio a mano" absoluto: lo que se fija a mano es el
-- margen y el precio siempre sale del costo, redondeado para arriba a múltiplos de $1.000.
ALTER TABLE producto DROP CONSTRAINT IF EXISTS producto_margen_elegido_check;
ALTER TABLE producto ADD CONSTRAINT producto_margen_elegido_check CHECK (margen_elegido IS NULL OR (margen_elegido > 0 AND margen_elegido <= 10000));
ALTER TABLE producto DROP COLUMN IF EXISTS precio_manual;
