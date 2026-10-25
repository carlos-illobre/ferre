import type { ParaVolver, Vuelve } from "../../../negocio/ventas";
import { conUnidad } from "../../../negocio/catalogo";
import { nombreDeProducto, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { hora } from "../../comun/ventas/textos-del-dia";
import { Icono } from "../componentes/base";
import { fechaCorta } from "./BuscarVentaParaCambio";
import { FotoChica } from "./FotoChica";
import { MasMenos } from "./MasMenos";
import type { Cambio } from "./useCambio";
import css from "./VentasDelDia.module.css";

// Lo que vuelve, de la venta elegida: cada renglón se marca, con cuánto vuelve y si está fallado.
const t = TEXTOS.hoy;

export function LoQueVuelve({ k, desdeLaVenta }: { k: Cambio; desdeLaVenta: boolean }) {
  const o = k.original!;
  return (
    <>
      <div className={css.ccTitulo}><Icono nombre="deshacer" tam={18} />{t.vuelve.corto}, de la venta del {fechaCorta(o.fecha)} · {hora(o.fecha)}
        {!desdeLaVenta && <button type="button" className="enlace" onClick={k.otraVenta}>{t.otraVenta.corto}</button>}</div>
      {o.renglones.map((r) => <RenglonQueVuelve key={r.id} r={r} marca={k.marca(r)} alCambiar={(c) => k.cambiarVuelve(r, c)} />)}
    </>
  );
}

const detalle = (r: ParaVolver) => (r.porDevolver <= 0 ? "Ya volvió todo" : `Se pagó ${pesosCortos(r.pagado)} c/u${r.porDevolver < r.vendido ? ` · quedan ${conUnidad(r.porDevolver, r.unidad)}` : ""}`);

function RenglonQueVuelve({ r, marca: m, alCambiar }: { r: ParaVolver; marca: Vuelve | undefined; alCambiar: (c: Partial<Vuelve> | null) => void }) {
  return (
    <div className={`${css.renglon} ${css.vuelve} ${m ? "elegido" : ""}`} data-testid="renglon-que-vuelve">
      <button type="button" className={css.marca} role="checkbox" aria-checked={Boolean(m)} disabled={r.porDevolver <= 0} onClick={() => alCambiar(m ? null : {})} aria-label={`Vuelve ${r.descripcion}`} data-testid="marcar-vuelve">
        {m && <Icono nombre="tilde" tam={16} grosor={3} />}
      </button>
      <FotoChica url={r.foto_url} />
      <span className={css.nom}><b>{nombreDeProducto(r.descripcion)}</b>
        <small>{detalle(r)}</small>
        {m && <span className={css.ed}>
          <MasMenos valor={m.cantidad} min={Number.isInteger(m.cantidad) ? 1 : 0.5} max={r.porDevolver} unidad={r.unidad} alCambiar={(n) => alCambiar({ cantidad: n })} etiqueta={r.descripcion} />
          <label className={css.fallado}><input type="checkbox" checked={m.fallado} onChange={(e) => alCambiar({ fallado: e.target.checked })} data-testid="fallado" />{t.estaFallado.corto}</label>
        </span>}
      </span>
      {m && <strong className={`importe ${css.sub}`}>−{pesosCortos(r.pagado * m.cantidad)}</strong>}
    </div>
  );
}
