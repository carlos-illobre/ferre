-- Tres permisos más (decisión 53): «Ver costos», y anular ventas separado en «del día» y
-- «de cualquier día». La clave ventas.anular, que ya existía, pasa a ser la del día.
-- Los roles de arranque los reciben así: ven costos el Gerente, el Comprador y Recepción
-- (que los carga al ingresar mercadería); anula ventas de cualquier día el Gerente.
INSERT INTO rol_permiso (rol_id, permiso)
SELECT r.id, p.permiso FROM (VALUES
  ('00000000-0000-4000-8000-0000000000a2'::uuid, 'catalogo.costos'),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, 'catalogo.costos'),
  ('00000000-0000-4000-8000-0000000000a5'::uuid, 'catalogo.costos'),
  ('00000000-0000-4000-8000-0000000000a5'::uuid, 'ventas.anular_cualquiera')
) AS p(rol_id, permiso) JOIN rol r ON r.id = p.rol_id
ON CONFLICT DO NOTHING;
