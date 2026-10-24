-- Las listas cerradas de valores pasan de CHECK a tipos ENUM de Postgres (specs/022, ADR-025): así
-- la lista está una sola vez, en la base, y los tipos del código se generan de acá. Los índices
-- parciales y las reglas que comparan esas columnas con texto se rehacen con el tipo nuevo.
ALTER TABLE venta DROP CONSTRAINT venta_check;
ALTER TABLE movimiento_dinero DROP CONSTRAINT movimiento_dinero_check;
ALTER TABLE cambio_renglon DROP CONSTRAINT cambio_renglon_check;
DROP INDEX venta_cuenta_corriente_pendiente, movimiento_dinero_cuenta_corriente, equivalencia_pendiente, conteo_abierto_por_sector;

CREATE TYPE medio_pago AS ENUM ('efectivo', 'mercado_pago', 'tarjeta', 'cuenta_corriente');
CREATE TYPE estado_de_documento AS ENUM ('confirmada', 'anulada');
CREATE TYPE tipo_de_comprobante AS ENUM ('factura', 'remito', 'sin_comprobante');
CREATE TYPE estado_de_lista AS ENUM ('pendiente', 'aplicando', 'aplicada', 'descartada');
CREATE TYPE tipo_de_movimiento_de_stock AS ENUM ('venta', 'compra', 'ajuste', 'correccion', 'cambio');
CREATE TYPE estado_de_conteo AS ENUM ('abierto', 'cerrado');
CREATE TYPE motivo_de_equivalencia AS ENUM ('codigo_barras', 'descripcion');
CREATE TYPE estado_de_equivalencia AS ENUM ('pendiente', 'unida', 'rechazada');
CREATE TYPE tipo_de_ticket AS ENUM ('error', 'mejora');
CREATE TYPE estado_de_ticket AS ENUM ('abierto', 'resuelto');
CREATE TYPE tipo_de_anomalia AS ENUM ('venta_sin_stock', 'devuelto_fallado');
CREATE TYPE estado_de_pedido AS ENUM ('borrador', 'enviado', 'recibido_parcial', 'recibido', 'cancelado', 'cerrado_incompleto');
CREATE TYPE metodo_apartado AS ENUM ('POST', 'PUT', 'PATCH', 'DELETE');
CREATE TYPE decision_de_apartado AS ENUM ('aceptado', 'descartado');
CREATE TYPE resolucion_de_correccion AS ENUM ('cobrada', 'devuelta', 'cuenta_corriente', 'sin_diferencia');
CREATE TYPE resolucion_de_cambio AS ENUM ('cobrado', 'devuelto', 'cuenta_corriente', 'sin_diferencia');
CREATE TYPE lado_de_cambio AS ENUM ('vuelve', 'se_lleva');
CREATE TYPE tipo_de_movimiento_de_dinero AS ENUM ('cobro_diferencia', 'devolucion');

ALTER TABLE venta DROP CONSTRAINT venta_medio_pago_check, ALTER COLUMN medio_pago TYPE medio_pago USING medio_pago::medio_pago;
ALTER TABLE movimiento_dinero DROP CONSTRAINT movimiento_dinero_medio_pago_check, ALTER COLUMN medio_pago TYPE medio_pago USING medio_pago::medio_pago;
ALTER TABLE venta DROP CONSTRAINT venta_estado_check, ALTER COLUMN estado DROP DEFAULT, ALTER COLUMN estado TYPE estado_de_documento USING estado::estado_de_documento, ALTER COLUMN estado SET DEFAULT 'confirmada';
ALTER TABLE compra DROP CONSTRAINT compra_estado_check, ALTER COLUMN estado DROP DEFAULT, ALTER COLUMN estado TYPE estado_de_documento USING estado::estado_de_documento, ALTER COLUMN estado SET DEFAULT 'confirmada';
ALTER TABLE compra DROP CONSTRAINT compra_comprobante_tipo_check, ALTER COLUMN comprobante_tipo TYPE tipo_de_comprobante USING comprobante_tipo::tipo_de_comprobante;
ALTER TABLE lista_importada DROP CONSTRAINT lista_importada_estado_check, ALTER COLUMN estado TYPE estado_de_lista USING estado::estado_de_lista;
ALTER TABLE movimiento_stock DROP CONSTRAINT movimiento_stock_tipo_check, ALTER COLUMN tipo TYPE tipo_de_movimiento_de_stock USING tipo::tipo_de_movimiento_de_stock;
ALTER TABLE conteo DROP CONSTRAINT conteo_estado_check, ALTER COLUMN estado DROP DEFAULT, ALTER COLUMN estado TYPE estado_de_conteo USING estado::estado_de_conteo, ALTER COLUMN estado SET DEFAULT 'abierto';
ALTER TABLE equivalencia_sugerida DROP CONSTRAINT equivalencia_sugerida_motivo_check, ALTER COLUMN motivo TYPE motivo_de_equivalencia USING motivo::motivo_de_equivalencia;
ALTER TABLE equivalencia_sugerida DROP CONSTRAINT equivalencia_sugerida_estado_check, ALTER COLUMN estado DROP DEFAULT, ALTER COLUMN estado TYPE estado_de_equivalencia USING estado::estado_de_equivalencia, ALTER COLUMN estado SET DEFAULT 'pendiente';
ALTER TABLE ticket DROP CONSTRAINT ticket_tipo_check, ALTER COLUMN tipo TYPE tipo_de_ticket USING tipo::tipo_de_ticket;
ALTER TABLE ticket DROP CONSTRAINT ticket_estado_check, ALTER COLUMN estado DROP DEFAULT, ALTER COLUMN estado TYPE estado_de_ticket USING estado::estado_de_ticket, ALTER COLUMN estado SET DEFAULT 'abierto';
ALTER TABLE anomalia DROP CONSTRAINT anomalia_tipo_check, ALTER COLUMN tipo TYPE tipo_de_anomalia USING tipo::tipo_de_anomalia;
ALTER TABLE pedido DROP CONSTRAINT pedido_estado_check, ALTER COLUMN estado DROP DEFAULT, ALTER COLUMN estado TYPE estado_de_pedido USING estado::estado_de_pedido, ALTER COLUMN estado SET DEFAULT 'borrador';
ALTER TABLE cambio_apartado DROP CONSTRAINT cambio_apartado_metodo_check, ALTER COLUMN metodo TYPE metodo_apartado USING metodo::metodo_apartado;
ALTER TABLE cambio_apartado DROP CONSTRAINT cambio_apartado_decision_check, ALTER COLUMN decision TYPE decision_de_apartado USING decision::decision_de_apartado;
ALTER TABLE correccion_venta DROP CONSTRAINT correccion_venta_resuelta_check, ALTER COLUMN resuelta TYPE resolucion_de_correccion USING resuelta::resolucion_de_correccion;
ALTER TABLE cambio DROP CONSTRAINT cambio_resuelto_check, ALTER COLUMN resuelto TYPE resolucion_de_cambio USING resuelto::resolucion_de_cambio;
ALTER TABLE cambio_renglon DROP CONSTRAINT cambio_renglon_lado_check, ALTER COLUMN lado TYPE lado_de_cambio USING lado::lado_de_cambio;
ALTER TABLE movimiento_dinero DROP CONSTRAINT movimiento_dinero_tipo_check, ALTER COLUMN tipo TYPE tipo_de_movimiento_de_dinero USING tipo::tipo_de_movimiento_de_dinero;

CREATE INDEX venta_cuenta_corriente_pendiente ON venta (cliente_id) WHERE medio_pago = 'cuenta_corriente' AND pagada_en IS NULL;
CREATE INDEX movimiento_dinero_cuenta_corriente ON movimiento_dinero (cliente_id) WHERE medio_pago = 'cuenta_corriente';
CREATE INDEX equivalencia_pendiente ON equivalencia_sugerida (estado) WHERE estado = 'pendiente';
CREATE UNIQUE INDEX conteo_abierto_por_sector ON conteo (sector_id) WHERE estado = 'abierto';
ALTER TABLE venta ADD CONSTRAINT venta_check CHECK (medio_pago <> 'cuenta_corriente' OR cliente_id IS NOT NULL);
ALTER TABLE movimiento_dinero ADD CONSTRAINT movimiento_dinero_check CHECK (medio_pago <> 'cuenta_corriente' OR cliente_id IS NOT NULL);
ALTER TABLE cambio_renglon ADD CONSTRAINT cambio_renglon_check CHECK (lado <> 'vuelve' OR item_venta_id IS NOT NULL);
