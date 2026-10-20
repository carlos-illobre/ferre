-- Unir o separar duplicados mueve movimientos de stock de un producto a otro con un UPDATE
-- (specs/018, revisión 1.1): el movimiento movido anota la transacción que lo movió, así la descarga
-- a mano («Actualizar») trae el stock de los dos productos. El DEFAULT de la columna vale solo al
-- insertar; este trigger lo hace en cada UPDATE, venga del camino que venga.
CREATE OR REPLACE FUNCTION tocar_transaccion_de_movimiento() RETURNS trigger AS $$
BEGIN
  NEW.transaccion := pg_current_xact_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER movimiento_stock_cambio_anota BEFORE UPDATE ON movimiento_stock FOR EACH ROW EXECUTE FUNCTION tocar_transaccion_de_movimiento();
