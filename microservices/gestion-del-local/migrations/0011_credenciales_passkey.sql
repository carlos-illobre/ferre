-- Passkeys (WebAuthn): un celular vinculado a un usuario entra con la huella, sin Gmail.
-- Se guarda solo la clave pública; la privada nunca sale del teléfono (ADR-011, enmienda).
CREATE TABLE credencial (
  id              text PRIMARY KEY,          -- credentialID en base64url, lo elige el autenticador
  usuario_id      uuid NOT NULL REFERENCES usuario(id),
  clave_publica   bytea NOT NULL,
  contador        bigint NOT NULL DEFAULT 0,  -- detecta clonado: nunca puede bajar
  transportes     text[] NOT NULL DEFAULT '{}',
  dispositivo     text,                       -- "Celular de Carlos"
  creada_en       timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_en   timestamptz,
  revocada_en     timestamptz
);
CREATE INDEX credencial_por_usuario ON credencial (usuario_id) WHERE revocada_en IS NULL;
