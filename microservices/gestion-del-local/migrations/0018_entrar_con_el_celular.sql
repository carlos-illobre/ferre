-- Entrar a la computadora con el celular (RF-76, decisión 57). La tabla vinculacion, que había
-- quedado sin uso desde el 2026-10-09, vuelve a usarse. Se le suma la clave con la que la
-- computadora retira su sesión: el código va en el QR, a la vista de cualquiera, y no alcanza
-- para retirar nada; la clave no sale de la computadora que pidió el código.
ALTER TABLE vinculacion ADD COLUMN clave_hash text;
-- Lo que haya quedado de la versión anterior ya está vencido.
DELETE FROM vinculacion;
