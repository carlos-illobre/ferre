-- Autenticación sin contraseñas (issue #41, ADR-011): la identidad la confirma Google;
-- acá solo se guarda quién está autorizado y qué sesiones tiene abiertas.

CREATE TABLE usuario (
  id            uuid PRIMARY KEY,
  email         text NOT NULL UNIQUE,      -- el Gmail con el que entra; se compara en minúsculas
  nombre        text NOT NULL,
  rol           text NOT NULL CHECK (rol IN ('dueño', 'mostrador')),
  activo        boolean NOT NULL DEFAULT true,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  modificado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER usuario_modificado BEFORE UPDATE ON usuario FOR EACH ROW EXECUTE FUNCTION tocar_modificado_en();

-- Token opaco: se guarda solo su hash. Sesión larga que se renueva con el uso y que el
-- dueño puede revocar. Sin conexión, el cliente sigue con la sesión vigente.
CREATE TABLE sesion (
  id            uuid PRIMARY KEY,
  usuario_id    uuid NOT NULL REFERENCES usuario(id),
  token_hash    text NOT NULL UNIQUE,
  dispositivo   text,                      -- descripción legible: "laptop del local", user agent recortado
  creada_en     timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_en timestamptz NOT NULL DEFAULT now(),
  expira_en     timestamptz NOT NULL,
  revocada_en   timestamptz
);
CREATE INDEX sesion_por_usuario ON sesion (usuario_id) WHERE revocada_en IS NULL;

-- Login de la laptop leyendo un QR con el celular ya autenticado (como WhatsApp Web).
-- La laptop crea la vinculación y muestra el código; el celular la aprueba; la laptop
-- retira su sesión una sola vez.
CREATE TABLE vinculacion (
  id                  uuid PRIMARY KEY,
  codigo_hash         text NOT NULL UNIQUE,
  dispositivo         text,
  creada_en           timestamptz NOT NULL DEFAULT now(),
  expira_en           timestamptz NOT NULL,
  aprobada_en         timestamptz,
  aprobada_por        uuid REFERENCES usuario(id),
  sesion_id           uuid REFERENCES sesion(id),
  retirada_en         timestamptz
);

-- Auditoría: cada evento dice quién lo hizo (ADR-003, issue #41).
ALTER TABLE evento ADD COLUMN usuario_id uuid REFERENCES usuario(id);
CREATE INDEX evento_por_usuario ON evento (usuario_id, creado_en);
