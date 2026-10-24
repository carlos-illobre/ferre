-- Ajustes del sistema (specs/020, decisiones 146 y 147): cuánto recuerda la sesión el servidor y
-- cada cuánto pregunta el celular emparejado, para todos, junto a los días del vínculo. Y el
-- permiso «Administrar el sistema»: lo reciben los roles que hoy administran usuarios, que ya
-- fijaban los días del vínculo, así nadie pierde lo que podía hacer.
INSERT INTO configuracion (clave, valor) VALUES
  ('sesion.recordar_segundos', '60'),
  ('celular.pregunta_segundos', '60')
ON CONFLICT (clave) DO NOTHING;
INSERT INTO rol_permiso (rol_id, permiso)
SELECT rol_id, 'admin.sistema' FROM rol_permiso WHERE permiso = 'admin.usuarios'
ON CONFLICT DO NOTHING;
