import { conUnidad, productoEnMemoria, traerPorIds } from "../../../negocio/catalogo";
import { diferenciaDe, type Contado } from "../../../negocio/deposito";
import { Lista } from "../componentes/base";
import type { ConteoDelCelular } from "./useConteoDelCelular";

// Lo contado (con su diferencia contra el teórico; tocar uno lo corrige) y lo que falta del sector.
export function ContadosDelSector({ x }: { x: ConteoDelCelular }) {
  const { conteo } = x;
  return (
    <>
      <h2 className="seccion"><span>Contados · {conteo.renglones.length}</span><span className="suave">{conteo.sin_contar.length} sin contar</span></h2>
      {conteo.renglones.length === 0 ? <div className="aviso-suave">Todavía nada. Buscá el primer producto de la estantería.</div> : (
        <Lista data-testid="contados">{conteo.renglones.map((r) => <ElContado key={r.producto_id} x={x} r={r} />)}</Lista>
      )}
      {conteo.sin_contar.length > 0 && (
        <>
          <h2 className="seccion">Del sector, sin contar todavía</h2>
          <Lista>{conteo.sin_contar.map((p) => <div key={p.producto_id} className="fila"><span className="nombre">{p.descripcion}</span><small className="derecha">teórico {conUnidad(p.stock_teorico, p.unidad)}</small></div>)}</Lista>
        </>
      )}
    </>
  );
}

function ElContado({ x, r }: { x: ConteoDelCelular; r: Contado }) {
  const dif = diferenciaDe(r);
  const elegir = () => { void traerPorIds([r.producto_id]).then(() => { const p = productoEnMemoria(r.producto_id); if (p) x.elegirProducto(p); }); };
  return (
    <button type="button" className="fila" role="row" aria-label={r.descripcion} onClick={elegir}>
      <span className="nombre">{r.descripcion}</span>
      <span className="derecha" style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}><strong className="importe" style={{ fontSize: 22 }}>{conUnidad(r.cantidad_contada, r.unidad)}</strong><small style={{ fontWeight: 700, color: dif === 0 ? undefined : "var(--coral-texto)", minWidth: 24, textAlign: "right" }}>{dif === 0 ? "=" : dif > 0 ? `+${dif}` : dif}</small></span>
      <span className="detalle">{r.marca ?? ""}{r.marca ? " · " : ""}teórico {conUnidad(r.stock_teorico, r.unidad)}</span>
    </button>
  );
}
