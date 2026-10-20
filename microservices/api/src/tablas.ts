import type { ColumnType, Generated } from "kysely";

// Las tablas de la base como las ve el código (ADR-018, etapa 5): con esto las consultas tienen
// tipos y un nombre de columna mal escrito no compila. Se agregan a medida que cada tema pasa a
// las tres capas; la fuente de verdad sigue siendo `migrations/`.
// Los numeric de Postgres llegan como texto; se escriben como número o texto.
type Numero = ColumnType<string, number | string, number | string>;
type Momento = ColumnType<Date, Date | string, Date | string>;
type ConValor<T> = ColumnType<T, T | undefined, T>;

export interface Base {
  venta: {
    id: string; fecha: Momento; cliente_id: string | null; medio_pago: "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente";
    total: Numero; estado: ConValor<"confirmada" | "anulada">; pagada_en: ColumnType<Date | null, never, Date | string | null>;
    dispositivo_id: string | null; creado_en: Generated<Date>; modificado_en: Generated<Date>;
  };
  item_venta: {
    id: string; venta_id: string; orden: number; producto_id: string | null; descripcion: string; cantidad: Numero;
    costo_neto: ColumnType<string | null, number | string | null, number | string | null>; precio_proveedor_id: string | null;
    margen_aplicado: number | null; precio_unitario: Numero; explicacion: ColumnType<unknown, string, string>; creado_en: Generated<Date>;
    // Corregir y cambiar (019, ADR-024): quitado por una corrección (no se borra) y cuánto ya volvió por cambios.
    quitado_por: ColumnType<string | null, string | null | undefined, string | null>; devuelto: ColumnType<string, number | string | undefined, number | string>;
  };
  correccion_venta: {
    id: string; venta_id: string; usuario_id: string | null; dispositivo_id: string | null; fecha: Momento;
    antes: ColumnType<unknown, string, string>; despues: ColumnType<unknown, string, string>; diferencia: Numero;
    resuelta: "cobrada" | "devuelta" | "cuenta_corriente" | "sin_diferencia"; creado_en: Generated<Date>;
  };
  cambio: {
    id: string; venta_id: string; usuario_id: string | null; dispositivo_id: string | null; fecha: Momento; diferencia: Numero;
    resuelto: "cobrado" | "devuelto" | "cuenta_corriente" | "sin_diferencia"; creado_en: Generated<Date>;
  };
  cambio_renglon: {
    id: string; cambio_id: string; lado: "vuelve" | "se_lleva"; item_venta_id: string | null; producto_id: string | null; descripcion: string;
    cantidad: Numero; precio_unitario: Numero; margen_aplicado: number | null; fallado: ConValor<boolean>;
  };
  movimiento_dinero: {
    id: string; fecha: Momento; tipo: "cobro_diferencia" | "devolucion"; medio_pago: "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente";
    cliente_id: string | null; importe: Numero; venta_id: string; correccion_id: string | null; cambio_id: string | null; usuario_id: string | null; creado_en: Generated<Date>;
  };
  movimiento_stock: {
    id: string; producto_id: string; tipo: "venta" | "compra" | "ajuste" | "correccion" | "cambio"; cantidad: Numero; referencia_tipo: string | null;
    referencia_id: string | null; fecha: Momento; nota: string | null; creado_en: Generated<Date>; transaccion: Generated<string>;
  };
  anomalia: {
    id: string; tipo: "venta_sin_stock" | "devuelto_fallado"; producto_id: string; usuario_id: string | null; venta_id: string | null; cantidad: Numero; detalle: string; creado_en: Generated<Date>;
  };
  evento: {
    id: string; tipo: string; version: ConValor<number>; fecha: Momento; dispositivo_id: string | null; usuario_id: string | null;
    contenido: ColumnType<unknown, string, string>; creado_en: Generated<Date>;
  };
  cliente: {
    id: string; nombre: string; telefono: string | null; cuenta_corriente: ConValor<boolean>; activo: ConValor<boolean>; creado_en: Generated<Date>; modificado_en: Generated<Date>;
  };
  consulta: {
    id: string; fecha: Momento; producto_id: string | null; descripcion: string; precio_ofrecido: ColumnType<string | null, number | string | null, number | string | null>;
    motivo: string | null; dispositivo_id: string | null; creado_en: Generated<Date>;
  };
  usuario: { id: string; email: string; nombre: string };
  producto: { id: string; descripcion: string; unidad: string };
  sesion: { id: string; usuario_id: string; dispositivo: string | null; revocada_en: Date | null };
  // Lo apartado de alguien a quien desactivaron (014, ADR-021).
  cambio_apartado: {
    id: string; usuario_id: string; sesion_id: string; orden: ColumnType<string, number, never>; tipo: string; metodo: "POST" | "PUT" | "PATCH" | "DELETE"; ruta: string;
    cuerpo: ColumnType<unknown, string | null, never>; hecho_en: Momento; llegado_en: Generated<Date>;
    decision: ColumnType<"aceptado" | "descartado" | null, never, "aceptado" | "descartado">; decidido_por: ColumnType<string | null, never, string>;
    decidido_en: ColumnType<Date | null, never, Date>; error: ColumnType<string | null, never, string | null>;
  };
  ticket: {
    id: string; tipo: "error" | "mejora"; descripcion: string; dispositivo: string | null; version: string | null; usuario_id: string; creado_en: Generated<Date>;
    estado: ConValor<"abierto" | "resuelto">; resuelto_en: ColumnType<Date | null, never, Date | string | null>; resuelto_por: ColumnType<string | null, never, string | null>; nota: ColumnType<string | null, never, string | null>;
  };
  ticket_foto: { ticket_id: string; orden: number; archivo: string };
  proveedor: {
    id: string; nombre: string; precios_incluyen_iva: ConValor<boolean>; descuento_general: ColumnType<string, number | undefined, number>;
    descuento_contado: ColumnType<string, number | undefined, number>; lector: string | null; activo: ConValor<boolean>; whatsapp: ColumnType<string | null, string | null | undefined, string | null>;
  };
}
