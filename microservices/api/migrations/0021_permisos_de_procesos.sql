-- Procesos (decisión 87, specs/011-procesos): dos permisos nuevos, «Ver procesos» y «Dibujar
-- procesos». Los recibe el rol Gerente; los demás roles, cuando el negocio se los dé.
INSERT INTO rol_permiso (rol_id, permiso)
SELECT r.id, p.permiso FROM (VALUES
  ('00000000-0000-4000-8000-0000000000a5'::uuid, 'procesos.ver'),
  ('00000000-0000-4000-8000-0000000000a5'::uuid, 'procesos.dibujar')
) AS p(rol_id, permiso) JOIN rol r ON r.id = p.rol_id
ON CONFLICT DO NOTHING;
