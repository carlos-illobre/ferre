import { hoyLocal } from "../../../negocio/formato";
import { COMPROBANTES } from "../../textos";
import { FotoDeFactura } from "../../FotoDeFactura";
import { Segmentos } from "../base/ui";
import type { IngresoDeLaCompu } from "./useIngresoDeLaCompu";

// El proveedor, el comprobante (con su foto, si tiene) y la fecha de la compra.
export function DatosDelIngreso({ x }: { x: IngresoDeLaCompu }) {
  const i = x.ingreso;
  return (
    <div className="compras-datos">
      <ElProveedor x={x} />
      <div className="campo" data-testid="comprobante">
        <span id={`${x.id}-comprobante`}>Comprobante</span>
        <Segmentos opciones={COMPROBANTES} actual={i.comprobante} alElegir={i.setComprobante} etiqueta="Comprobante" />
      </div>
      {i.comprobante !== "sin_comprobante" && (
        <div className="campo compras-foto"><span>{i.comprobante === "remito" ? "Foto del remito" : "Foto de la factura"}</span><FotoDeFactura foto={i.foto} alCambiar={i.setFoto} conCelular nombre={i.comprobante === "remito" ? "remito" : "factura"} /></div>
      )}
      <label className="campo compras-fecha"><span>Fecha</span><input className="entrada" type="date" value={i.fechaCompra} max={hoyLocal()} onChange={(e) => i.setFechaCompra(e.target.value || hoyLocal())} data-testid="fecha" /></label>
    </div>
  );
}

function ElProveedor({ x }: { x: IngresoDeLaCompu }) {
  const i = x.ingreso;
  const falta = x.intento && !i.proveedorId;
  return (
    <div className="campo compras-proveedor">
      <label htmlFor={`${x.id}-proveedor`}>Proveedor</label>
      <select ref={x.selector} id={`${x.id}-proveedor`} className="selector" value={i.proveedorId} onChange={(e) => i.setProveedorId(e.target.value)} autoFocus={!i.proveedorId} aria-invalid={falta || undefined} aria-describedby={falta ? `${x.id}-falta-proveedor` : undefined} data-testid="proveedor">
        <option value="">{i.proveedores === null ? "Trayendo los proveedores…" : "Elegí el proveedor"}</option>
        {(i.proveedores ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      {falta && <p className="compras-falta" id={`${x.id}-falta-proveedor`} role="alert">Elegí de qué proveedor llegó.</p>}
    </div>
  );
}
