-- La base de Acceso (specs/029): quién es cada uno y qué puede. Arranca nueva (Carlos): las
-- personas se vuelven a autorizar; la primera, con el comando de siempre. Es lo que tenía
-- Comercial (migraciones 0002, 0015 a 0024, 0030 y 0031), tal como estaba al mudarse.

CREATE OR REPLACE FUNCTION tocar_modificado_en() RETURNS trigger AS $$
BEGIN
  NEW.modificado_en := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Las personas autorizadas: entran con Google (su correo) o con la huella.
CREATE TABLE usuario (
  id             uuid PRIMARY KEY,
  email          text NOT NULL UNIQUE,
  nombre         text NOT NULL,
  rol            text,
  activo         boolean NOT NULL DEFAULT true,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  modificado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER usuario_modificado BEFORE UPDATE ON usuario FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();

-- Los roles los arma el negocio con los permisos fijos del sistema (RF-75, ADR-017).
CREATE TABLE rol (
  id           uuid PRIMARY KEY,
  nombre       text NOT NULL,
  descripcion  text,
  creado_en    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rol_nombre_unico ON rol (lower(nombre));

CREATE TABLE rol_permiso (
  rol_id   uuid NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
  permiso  text NOT NULL,
  PRIMARY KEY (rol_id, permiso)
);

CREATE TABLE usuario_rol (
  usuario_id  uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  rol_id      uuid NOT NULL REFERENCES rol(id),
  PRIMARY KEY (usuario_id, rol_id)
);
CREATE INDEX usuario_rol_por_rol ON usuario_rol (rol_id);

-- Cada sesión abierta, en un dispositivo. El token se guarda como hash.
CREATE TABLE sesion (
  id              uuid PRIMARY KEY,
  usuario_id      uuid NOT NULL REFERENCES usuario(id),
  token_hash      text NOT NULL UNIQUE,
  dispositivo     text,
  creada_en       timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_en   timestamptz NOT NULL DEFAULT now(),
  expira_en       timestamptz NOT NULL,
  revocada_en     timestamptz,
  dispositivo_id  text
);
CREATE INDEX sesion_por_usuario ON sesion (usuario_id) WHERE revocada_en IS NULL;

-- Las huellas (passkeys): la clave pública de cada celular vinculado.
CREATE TABLE credencial (
  id              text PRIMARY KEY,
  usuario_id      uuid NOT NULL REFERENCES usuario(id),
  clave_publica   bytea NOT NULL,
  contador        bigint NOT NULL DEFAULT 0,
  transportes     text[] NOT NULL DEFAULT '{}',
  dispositivo     text,
  creada_en       timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_en   timestamptz,
  revocada_en     timestamptz
);
CREATE INDEX credencial_por_usuario ON credencial (usuario_id) WHERE revocada_en IS NULL;

-- La entrada a la computadora con el código que lee el celular.
CREATE TABLE vinculacion (
  id                 uuid PRIMARY KEY,
  codigo_hash        text NOT NULL UNIQUE,
  dispositivo        text,
  creada_en          timestamptz NOT NULL DEFAULT now(),
  expira_en          timestamptz NOT NULL,
  aprobada_en        timestamptz,
  aprobada_por       uuid REFERENCES usuario(id),
  sesion_id          uuid REFERENCES sesion(id),
  retirada_en        timestamptz,
  clave_hash         text,
  celular_sesion_id  uuid REFERENCES sesion(id)
);

-- El vínculo entre una computadora y un celular (023).
CREATE TABLE puesto (
  id                   uuid PRIMARY KEY,
  sesion_id            uuid NOT NULL REFERENCES sesion(id),
  codigo_hash          text NOT NULL UNIQUE,
  nombre               text,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  vinculado_en         timestamptz,
  celular_sesion_id    uuid REFERENCES sesion(id),
  expira_en            timestamptz NOT NULL,
  usuario_id           uuid REFERENCES usuario(id),
  compu_dispositivo    text,
  celular_dispositivo  text
);
CREATE INDEX puesto_por_celular ON puesto (celular_sesion_id);
CREATE INDEX puesto_por_dispositivo ON puesto (usuario_id, compu_dispositivo, celular_dispositivo);
CREATE INDEX puesto_por_sesion ON puesto (sesion_id);

-- Lo apartado (014): lo que hizo sin conexión alguien a quien después desactivaron.
CREATE TYPE metodo_apartado AS ENUM ('POST', 'PUT', 'PATCH', 'DELETE');
CREATE TYPE decision_de_apartado AS ENUM ('aceptado', 'descartado');
CREATE TABLE cambio_apartado (
  id            uuid PRIMARY KEY,
  usuario_id    uuid NOT NULL REFERENCES usuario(id),
  sesion_id     uuid NOT NULL REFERENCES sesion(id),
  orden         bigint NOT NULL,
  tipo          text NOT NULL,
  metodo        metodo_apartado NOT NULL,
  ruta          text NOT NULL,
  cuerpo        jsonb,
  hecho_en      timestamptz NOT NULL,
  llegado_en    timestamptz NOT NULL DEFAULT now(),
  decision      decision_de_apartado,
  decidido_por  uuid REFERENCES usuario(id),
  decidido_en   timestamptz,
  error         text,
  UNIQUE (sesion_id, orden)
);
CREATE INDEX cambio_apartado_pendiente ON cambio_apartado (llegado_en) WHERE decision IS NULL;

-- Los ajustes del sistema que fija quien administra (020, 023).
CREATE TABLE configuracion (
  clave           text PRIMARY KEY,
  valor           text NOT NULL,
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);
INSERT INTO configuracion (clave, valor) VALUES ('vinculo.dias', '30');

-- Los cinco roles de arranque (RF-72), con los mismos identificadores que tenían en Comercial.
INSERT INTO rol (id, nombre, descripcion) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'Vendedor', 'Registra las ventas'),
  ('00000000-0000-4000-8000-0000000000a2', 'Comprador', 'Encarga las compras a los proveedores, carga sus listas y une duplicados'),
  ('00000000-0000-4000-8000-0000000000a3', 'Recepción', 'Recibe la mercadería, registra su entrada, cuenta las estanterías y corrige el stock'),
  ('00000000-0000-4000-8000-0000000000a4', 'Administrador', 'Autoriza usuarios y les asigna roles'),
  ('00000000-0000-4000-8000-0000000000a5', 'Gerente', 'Ve los números del negocio y fija los márgenes');
INSERT INTO rol_permiso (rol_id, permiso)
SELECT r.id::uuid, p FROM (VALUES
  ('00000000-0000-4000-8000-0000000000a1', ARRAY['ventas.anular', 'ventas.registrar', 'ventas.ver']),
  ('00000000-0000-4000-8000-0000000000a2', ARRAY['catalogo.costos', 'catalogo.duplicados', 'catalogo.listas', 'deposito.compras', 'deposito.pedidos']),
  ('00000000-0000-4000-8000-0000000000a3', ARRAY['catalogo.costos', 'deposito.compras', 'deposito.ingresos', 'deposito.stock', 'negocio.anomalias']),
  ('00000000-0000-4000-8000-0000000000a4', ARRAY['admin.roles', 'admin.sistema', 'admin.usuarios', 'negocio.actividad']),
  ('00000000-0000-4000-8000-0000000000a5', ARRAY['catalogo.costos', 'catalogo.margenes', 'deposito.compras', 'negocio.actividad', 'negocio.anomalias', 'negocio.gastos', 'negocio.invertido', 'negocio.ventas', 'procesos.dibujar', 'procesos.ver', 'ventas.anular', 'ventas.anular_cualquiera', 'ventas.ver'])
) AS r(id, permisos), unnest(r.permisos) AS p;
