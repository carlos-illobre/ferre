-- El vínculo entre un celular y una computadora es de los dos dispositivos y del usuario, no
-- de la sesión (decisión 73): al salir queda dormido y se reactiva cuando el mismo usuario
-- vuelve a entrar en ese dispositivo. Cada navegador se identifica con un valor propio, que
-- guarda él y no se borra al salir.
ALTER TABLE sesion ADD COLUMN dispositivo_id text;
ALTER TABLE puesto ADD COLUMN usuario_id uuid REFERENCES usuario(id);
ALTER TABLE puesto ADD COLUMN compu_dispositivo text;
ALTER TABLE puesto ADD COLUMN celular_dispositivo text;
CREATE INDEX puesto_por_dispositivo ON puesto (usuario_id, compu_dispositivo, celular_dispositivo);

-- Lo que el negocio configura desde la aplicación. Empieza con los días que dura el vínculo.
CREATE TABLE configuracion (
  clave          text PRIMARY KEY,
  valor          text NOT NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
INSERT INTO configuracion (clave, valor) VALUES ('vinculo.dias', '30');
