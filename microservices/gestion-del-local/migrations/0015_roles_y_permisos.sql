-- Permisos fijos y roles armados por el negocio (RF-72, RF-75, ADR-017). Un rol es un nombre
-- con un grupo de permisos; un usuario tiene uno o más roles. La lista de permisos válidos
-- vive en el código (src/permisos.ts), por eso rol_permiso.permiso es texto libre.
CREATE TABLE rol (
  id          uuid PRIMARY KEY,
  nombre      text NOT NULL,
  descripcion text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rol_nombre_unico ON rol (lower(nombre));
CREATE TABLE rol_permiso (
  rol_id  uuid NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
  permiso text NOT NULL,
  PRIMARY KEY (rol_id, permiso)
);
CREATE TABLE usuario_rol (
  usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  rol_id     uuid NOT NULL REFERENCES rol(id),
  PRIMARY KEY (usuario_id, rol_id)
);
CREATE INDEX usuario_rol_por_rol ON usuario_rol (rol_id);

-- Los cinco roles con los que arranca el sistema (decisión 50). Se pueden cambiar desde la app.
INSERT INTO rol (id, nombre, descripcion) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'Vendedor', 'Registra las ventas'),
  ('00000000-0000-4000-8000-0000000000a2', 'Comprador', 'Encarga las compras a los proveedores, carga sus listas y une duplicados'),
  ('00000000-0000-4000-8000-0000000000a3', 'Recepción', 'Recibe la mercadería, registra su entrada, cuenta las estanterías y corrige el stock'),
  ('00000000-0000-4000-8000-0000000000a4', 'Administrador', 'Autoriza usuarios y les asigna roles'),
  ('00000000-0000-4000-8000-0000000000a5', 'Gerente', 'Ve los números del negocio y fija los márgenes');
INSERT INTO rol_permiso (rol_id, permiso) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'ventas.registrar'), ('00000000-0000-4000-8000-0000000000a1', 'ventas.ver'), ('00000000-0000-4000-8000-0000000000a1', 'ventas.anular'),
  ('00000000-0000-4000-8000-0000000000a2', 'catalogo.listas'), ('00000000-0000-4000-8000-0000000000a2', 'catalogo.duplicados'), ('00000000-0000-4000-8000-0000000000a2', 'deposito.compras'),
  ('00000000-0000-4000-8000-0000000000a3', 'deposito.ingresos'), ('00000000-0000-4000-8000-0000000000a3', 'deposito.compras'), ('00000000-0000-4000-8000-0000000000a3', 'deposito.stock'), ('00000000-0000-4000-8000-0000000000a3', 'negocio.anomalias'),
  ('00000000-0000-4000-8000-0000000000a4', 'admin.usuarios'), ('00000000-0000-4000-8000-0000000000a4', 'admin.roles'), ('00000000-0000-4000-8000-0000000000a4', 'admin.sesiones'), ('00000000-0000-4000-8000-0000000000a4', 'negocio.actividad'),
  ('00000000-0000-4000-8000-0000000000a5', 'negocio.numeros'), ('00000000-0000-4000-8000-0000000000a5', 'catalogo.margenes'), ('00000000-0000-4000-8000-0000000000a5', 'ventas.ver'), ('00000000-0000-4000-8000-0000000000a5', 'ventas.anular'),
  ('00000000-0000-4000-8000-0000000000a5', 'deposito.compras'), ('00000000-0000-4000-8000-0000000000a5', 'negocio.anomalias'), ('00000000-0000-4000-8000-0000000000a5', 'negocio.actividad');

-- Los usuarios que ya existen reciben los cinco roles: el día del cambio nadie pierde acceso.
INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r;

-- usuario.rol queda como dato viejo, sin uso: ya no se le exige un valor.
ALTER TABLE usuario ALTER COLUMN rol DROP NOT NULL;
ALTER TABLE usuario DROP CONSTRAINT usuario_rol_check;
