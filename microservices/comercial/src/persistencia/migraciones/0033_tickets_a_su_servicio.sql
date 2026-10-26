-- Los tickets pasan a su propio servicio, con su base y sus fotos (specs/028). Arranca vacío
-- (Carlos): acá se borran las tablas y sus tipos. Las fotos viejas de la carpeta de archivos se
-- borran a mano en la máquina (docs/operacion/DEPLOYMENT.md).
DROP TABLE ticket_foto;
DROP TABLE ticket;
DROP TYPE tipo_de_ticket;
DROP TYPE estado_de_ticket;
