-- La copia del catálogo en el servidor (specs/018, RF-124; ADR-023): la base anota qué productos
-- cambiaron y avisa. Triggers por sentencia, así aplicar una lista de miles de filas anota una
-- vez por sentencia y avisa una vez por transacción (pg_notify junta los avisos iguales).
--
-- Cada cambio se anota con la transacción que lo hizo. Quien lee guarda el «xmin» de su foto
-- (la transacción más vieja todavía en curso) y la próxima vez lee desde ahí: un cambio de una
-- transacción que confirma tarde no se pierde, aunque otra más nueva haya confirmado antes.
CREATE TABLE cambio_de_producto (
  producto_id uuid PRIMARY KEY,
  transaccion xid8 NOT NULL DEFAULT pg_current_xact_id()
);
CREATE INDEX cambio_de_producto_transaccion ON cambio_de_producto (transaccion);

CREATE FUNCTION anotar_cambio_de_productos(ids uuid[]) RETURNS void AS $$
BEGIN
  IF coalesce(cardinality(ids), 0) = 0 THEN RETURN; END IF;
  INSERT INTO cambio_de_producto (producto_id)
    SELECT DISTINCT id FROM unnest(ids) AS id WHERE id IS NOT NULL
  ON CONFLICT (producto_id) DO UPDATE SET transaccion = pg_current_xact_id();
  PERFORM pg_notify('catalogo', '');
END;
$$ LANGUAGE plpgsql;

-- producto: alta, cambio y baja.
CREATE FUNCTION cambio_en_producto() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM anotar_cambio_de_productos(ARRAY(SELECT id FROM viejos));
  ELSE
    PERFORM anotar_cambio_de_productos(ARRAY(SELECT id FROM nuevos));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER producto_alta_avisa AFTER INSERT ON producto REFERENCING NEW TABLE AS nuevos FOR EACH STATEMENT EXECUTE FUNCTION cambio_en_producto();
CREATE TRIGGER producto_cambio_avisa AFTER UPDATE ON producto REFERENCING NEW TABLE AS nuevos FOR EACH STATEMENT EXECUTE FUNCTION cambio_en_producto();
CREATE TRIGGER producto_baja_avisa AFTER DELETE ON producto REFERENCING OLD TABLE AS viejos FOR EACH STATEMENT EXECUTE FUNCTION cambio_en_producto();

-- precio_proveedor: el costo, la lista y los proveedores de un producto. Un cambio puede moverlo
-- de un producto a otro (unir duplicados): se anotan los dos.
CREATE FUNCTION cambio_en_precio_proveedor() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM anotar_cambio_de_productos(ARRAY(SELECT producto_id FROM nuevos));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM anotar_cambio_de_productos(ARRAY(SELECT producto_id FROM nuevos UNION SELECT producto_id FROM viejos));
  ELSE
    PERFORM anotar_cambio_de_productos(ARRAY(SELECT producto_id FROM viejos));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER precio_proveedor_alta_avisa AFTER INSERT ON precio_proveedor REFERENCING NEW TABLE AS nuevos FOR EACH STATEMENT EXECUTE FUNCTION cambio_en_precio_proveedor();
CREATE TRIGGER precio_proveedor_cambio_avisa AFTER UPDATE ON precio_proveedor REFERENCING NEW TABLE AS nuevos OLD TABLE AS viejos FOR EACH STATEMENT EXECUTE FUNCTION cambio_en_precio_proveedor();
CREATE TRIGGER precio_proveedor_baja_avisa AFTER DELETE ON precio_proveedor REFERENCING OLD TABLE AS viejos FOR EACH STATEMENT EXECUTE FUNCTION cambio_en_precio_proveedor();

-- proveedor: su nombre se muestra en cada producto que tiene un costo suyo.
CREATE FUNCTION cambio_en_proveedor() RETURNS trigger AS $$
BEGIN
  PERFORM anotar_cambio_de_productos(ARRAY(
    SELECT pp.producto_id FROM precio_proveedor pp
      JOIN nuevos n ON n.id = pp.proveedor_id JOIN viejos v ON v.id = n.id
     WHERE n.nombre IS DISTINCT FROM v.nombre));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER proveedor_cambio_avisa AFTER UPDATE ON proveedor REFERENCING NEW TABLE AS nuevos OLD TABLE AS viejos FOR EACH STATEMENT EXECUTE FUNCTION cambio_en_proveedor();
