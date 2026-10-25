import { COMPROBANTES } from "../../textos";
import { FotoDeFactura } from "../../FotoDeFactura";
import { Icono, Segmentos } from "../componentes/base";
import type { IngresoDelCelular } from "./useIngresoDelCelular";

// El proveedor (se elige en una hoja), el comprobante (con su foto, si tiene) y la fecha.
export function DatosDelIngreso({ x }: { x: IngresoDelCelular }) {
  const { proveedor, comprobante, setComprobante, foto, setFoto, fechaCompra, setFechaCompra } = x.ingreso;
  return (
    <div className="formulario">
      <button type="button" className="renglon" onClick={() => x.setHoja("proveedores")} data-testid="proveedor">
        <span>Proveedor</span><span className={`valor ${proveedor ? "" : "falta"}`}>{proveedor ? proveedor.nombre : "Elegir"}<Icono nombre="derecha" tam={14} grosor={2.5} /></span>
      </button>
      <div className="renglon"><span>Comprobante</span><div style={{ width: 220 }}><Segmentos chico opciones={COMPROBANTES.map((c) => ({ valor: c.valor, nombre: c.corto }))} actual={comprobante} alElegir={setComprobante} /></div></div>
      {comprobante !== "sin_comprobante" && <div style={{ padding: "10px 16px" }}><FotoDeFactura foto={foto} alCambiar={setFoto} nombre={comprobante === "remito" ? "remito" : "factura"} /></div>}
      <label className="renglon"><span>Fecha</span><input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} /></label>
    </div>
  );
}
