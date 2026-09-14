-- Rol admin: los permisos del dueño salvo tocar usuarios dueño (crear, cambiar, desactivar
-- o dar ese rol).
ALTER TABLE usuario DROP CONSTRAINT usuario_rol_check;
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_check CHECK (rol IN ('dueño', 'admin', 'mostrador'));
