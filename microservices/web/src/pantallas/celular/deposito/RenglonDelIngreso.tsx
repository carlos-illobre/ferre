import { cantidadValida, enteras, unidadDe, type Producto } from "../../../negocio/catalogo";
import { diferenciaConLaLista, type Renglon } from "../../../negocio/deposito";
import { pesos, porcentaje } from "../../../negocio/formato";
import { Contador } from "../componentes/base";
import { FotoDeProducto } from "./FotoDeProducto";
import type { IngresoDelCelular } from "./useIngresoDelCelular";

// Un renglón del ingreso, en una tarjeta: el producto (o la descripción del nuevo), quitarlo, la
// cantidad y el costo, con cuánto cambió contra la lista.
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
type Props = { x: IngresoDelCelular; r: Renglon };

export function RenglonDelIngreso({ x, r }: Props) {
  return (
    <div className="tarjeta" data-testid="renglon">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <ElProducto x={x} r={r} />
        <button type="button" className="quitar tacho" onClick={() => x.ingreso.quitar(r.clave)} aria-label={`Quitar ${r.descripcion || "el producto"} del ingreso`} title="Quitar del ingreso" data-testid="quitar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <LaCantidad x={x} r={r} />
        <ElCosto x={x} r={r} />
      </div>
    </div>
  );
}

function ElProducto({ x, r }: Props) {
  if (!r.producto) return <input className="linea-editable" value={r.descripcion} placeholder="Descripción del producto nuevo" onChange={(e) => x.ingreso.cambiar(r.clave, { descripcion: e.target.value })} data-testid="descripcion-nueva" />;
  return (
    <>
      <FotoDeProducto producto={r.producto} alCambiar={(f) => x.ingreso.cambiarFoto(r, f)} />
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontWeight: 600, lineHeight: 1.25 }}>{r.descripcion}</span><small>{detalleDe(r.producto)}</small></span>
    </>
  );
}

function LaCantidad({ x, r }: Props) {
  const unidad = unidadDe(r.producto);
  const entera = enteras(unidad);
  return (
    <Contador valor={r.cantidad} entera={entera} alCambiar={(v) => x.ingreso.cambiar(r.clave, { cantidad: entera ? Math.floor(v) : cantidadValida(String(v), unidad) })}>
      {!entera && <span className="unidad" style={{ padding: "0 10px 0 4px", fontSize: 14, color: "var(--gris)" }}>{unidad === "l" ? "L" : unidad}</span>}
    </Contador>
  );
}

const contraLaLista = (r: Renglon, dif: number | null) => {
  if (r.costoLista === null) return "sin lista previa";
  if (dif === null) return `según lista ${pesos(r.costoLista)}`;
  return Math.abs(dif) < 0.05 ? `igual que la lista (${pesos(r.costoLista)})` : `${porcentaje(dif)} vs. lista ${pesos(r.costoLista)}`;
};

function ElCosto({ x, r }: Props) {
  const dif = diferenciaConLaLista(r);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <label className={`campo importe-campo ${r.costo === null ? "falta" : ""}`}><span>costo $</span><input inputMode="decimal" placeholder="0" value={r.costoTexto} onChange={(e) => x.ingreso.cambiarCosto(r.clave, e.target.value)} data-testid="costo" /></label>
      <small style={{ fontWeight: 600, color: dif !== null && dif > 0.05 ? "var(--coral-texto)" : undefined }}>{contraLaLista(r, dif)}</small>
    </div>
  );
}
