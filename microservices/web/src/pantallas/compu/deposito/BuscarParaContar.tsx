import { conUnidad } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { BuscadorDeProducto } from "./BuscadorDeProducto";
import type { ConteoDeSector } from "./useConteoDeSector";
import css from "./Contar.module.css";

// Buscar o escanear el producto que se cuenta; los ya contados dicen cuántas se pusieron.
const t = TEXTOS.contar;

export function BuscarParaContar({ x }: { x: ConteoDeSector }) {
  return (
    <div className={css.buscar}>
      <BuscadorDeProducto consulta={x.consulta} alCambiar={(v) => { x.setConsulta(v); x.setError(null); }} resultados={x.resultados} alElegir={x.elegir} cajaRef={x.caja}
        placeholder={t.buscar.largo}
        aLaDerecha={(p) => (x.contadoPorId.has(p.id) ? <span className={css.pastilla}>Ya contado: {conUnidad(x.contadoPorId.get(p.id)!.cantidad_contada, p.unidad)}</span> : null)} />
      {!x.consulta && <span className={`${css.ayuda} detalle`} aria-hidden="true">{t.ayudaBuscar.largo}</span>}
    </div>
  );
}
