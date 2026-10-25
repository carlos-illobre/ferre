import { useCatalogo, type Producto } from "../../../negocio/catalogo";
import { pesos } from "../../../negocio/formato";
import { Lista } from "../componentes/base";
import type { IngresoDelCelular } from "./useIngresoDelCelular";

// Lo encontrado, con su costo; si no hay nada, agregarlo como producto nuevo.
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");

export function SugerenciasDelIngreso({ x }: { x: IngresoDelCelular }) {
  const { buscandoEnElServidor } = useCatalogo();
  const { resultados, agregar, consulta } = x.ingreso;
  return (
    <Lista data-testid="sugerencias">
      {resultados.map((p, i) => (
        <button key={p.id} type="button" className={`fila ${i === x.elegido ? "elegida" : ""}`} onMouseDown={(e) => { e.preventDefault(); agregar(p); }}>
          <span className="nombre">{p.descripcion}</span>
          <strong className="derecha importe" style={{ fontSize: 20 }}>{p.costo_neto ? pesos(p.costo_neto) : "—"}</strong>
          <span className="detalle">{detalleDe(p)}</span>
        </button>
      ))}
      {resultados.length === 0 && !buscandoEnElServidor && (
        <button type="button" className="fila" onClick={() => agregar(null, consulta.trim())} data-testid="agregar-nuevo">
          <span className="nombre">Agregar “{consulta.trim()}” como producto nuevo</span><span /><span className="detalle">Le ponés el costo de la factura.</span>
        </button>
      )}
    </Lista>
  );
}
