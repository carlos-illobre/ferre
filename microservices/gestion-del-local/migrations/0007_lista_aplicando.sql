-- Aplicar una lista corre en segundo plano con progreso (miles de filas contra Supabase):
-- estado intermedio 'aplicando'.
ALTER TABLE lista_importada DROP CONSTRAINT lista_importada_estado_check;
ALTER TABLE lista_importada ADD CONSTRAINT lista_importada_estado_check CHECK (estado IN ('pendiente', 'aplicando', 'aplicada', 'descartada'));
