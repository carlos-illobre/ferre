import { conUnidad, type Producto } from "../../../negocio/catalogo";
import { Escaner, hayCamara } from "../../../plataforma/camara";
import { Buscador, Lista } from "../componentes/base";
import type { ConteoDelCelular } from "./useConteoDelCelular";

// Buscar o escanear el producto; los ya contados dicen cuántas se pusieron.
const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");

export function BuscarParaContar({ x }: { x: ConteoDelCelular }) {
  return (
    <>
      <Buscador valor={x.consulta} alCambiar={x.setConsulta} placeholder={"Buscá o escaneá el producto"} acciones={x.enLaCaja} alEscanear={hayCamara() ? () => x.setEscaneando(true) : undefined} />
      {x.escaneando && <Escaner alDetectar={x.alDetectar} alCerrar={() => x.setEscaneando(false)} />}
      {x.resultados.length > 0 && (
        <Lista data-testid="sugerencias">
          {x.resultados.map((p, i) => (
            <button key={p.id} type="button" className={`fila ${i === x.elegido ? "elegida" : ""}`} onMouseDown={(e) => { e.preventDefault(); x.elegirProducto(p); }}>
              <span className="nombre">{p.descripcion}</span>
              <small className="derecha" style={{ color: "var(--coral-texto)", fontWeight: 600 }}>{x.contadoPorId.has(p.id) ? `ya: ${conUnidad(x.contadoPorId.get(p.id)!.cantidad_contada, p.unidad)}` : ""}</small>
              <span className="detalle">{detalleDe(p)}</span>
            </button>
          ))}
        </Lista>
      )}
    </>
  );
}
