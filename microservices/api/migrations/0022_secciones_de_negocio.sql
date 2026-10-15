-- Cómo va el negocio en tres secciones (decisión 89, specs/012-secciones-de-negocio): «Ver los
-- números del negocio» se reemplaza por «Ver las ventas del negocio», «Ver los gastos» y «Ver el
-- dinero invertido». Cada rol que tenía el permiso viejo recibe los tres, así nadie pierde nada.
INSERT INTO rol_permiso (rol_id, permiso)
SELECT rp.rol_id, nuevo.permiso
  FROM rol_permiso rp
 CROSS JOIN (VALUES ('negocio.ventas'), ('negocio.gastos'), ('negocio.invertido')) AS nuevo(permiso)
 WHERE rp.permiso = 'negocio.numeros'
ON CONFLICT DO NOTHING;

DELETE FROM rol_permiso WHERE permiso = 'negocio.numeros';
