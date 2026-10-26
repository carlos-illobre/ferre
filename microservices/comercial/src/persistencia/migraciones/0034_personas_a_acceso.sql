-- Quién es cada uno y qué puede pasa a Acceso (specs/029). Comercial recibe a la persona de la
-- puerta en cada pedido y no guarda personas: lo que muestra con nombre guarda el nombre del
-- momento (029-E10), completado acá con los nombres de hoy antes de borrar los usuarios.
ALTER TABLE pedido ADD COLUMN enviado_por_nombre text, ADD COLUMN cerrado_por_nombre text;
UPDATE pedido p SET enviado_por_nombre = COALESCE(u.nombre, u.email) FROM usuario u WHERE u.id = p.enviado_por;
UPDATE pedido p SET cerrado_por_nombre = COALESCE(u.nombre, u.email) FROM usuario u WHERE u.id = p.cerrado_por;
ALTER TABLE anomalia ADD COLUMN usuario_nombre text;
UPDATE anomalia a SET usuario_nombre = COALESCE(u.nombre, u.email) FROM usuario u WHERE u.id = a.usuario_id;

-- Las columnas que dicen quién hizo algo quedan como identificadores, sin clave foránea: la persona
-- vive en Acceso.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tabla, c.conname
      FROM pg_constraint c
     WHERE c.contype = 'f'
       AND c.confrelid IN ('usuario'::regclass, 'sesion'::regclass)
       AND c.conrelid NOT IN ('usuario'::regclass, 'sesion'::regclass, 'usuario_rol'::regclass, 'credencial'::regclass,
                              'vinculacion'::regclass, 'puesto'::regclass, 'cambio_apartado'::regclass)
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tabla, r.conname);
  END LOOP;
END $$;

-- Los códigos que mandaba el celular por el vínculo viejo (0005): ya no los usa nada.
DROP TABLE codigo_escaneado;
DROP TABLE cambio_apartado, puesto, vinculacion, credencial, sesion, usuario_rol, rol_permiso, rol, usuario;
DROP TYPE metodo_apartado, decision_de_apartado;
DELETE FROM configuracion WHERE clave IN ('vinculo.dias', 'celular.pregunta_segundos', 'sesion.recordar_segundos');
