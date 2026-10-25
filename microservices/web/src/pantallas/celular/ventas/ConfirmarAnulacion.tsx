import { MOTIVOS_DE_ANULACION, NOMBRE_DE_MEDIO, SIN_MOTIVO, useAnularConMotivo, type VentaDelDia } from "../../../negocio/ventas";
import { pesosCortos } from "../../../formato";
import { hora } from "../../comun/ventas/textos-del-dia";
import { AvisoError, Hoja, Icono } from "../componentes/base";
import css from "./VentasDelDia.module.css";

// Confirmar la anulación: el motivo, de una lista que empieza en «Sin motivo», y un comentario
// opcional (decisión 110); el botón dice cuánto se descuenta.
export function ConfirmarAnulacion({ venta: v, alCerrar, alAnular }: { venta: VentaDelDia; alCerrar: () => void; alAnular: () => void }) {
  const a = useAnularConMotivo(v, alAnular);
  return (
    <Hoja titulo="¿Anular esta venta?" alCerrar={alCerrar} testId="hoja-anular">
      <p className={css.hojaDetalle}>{hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago} · {pesosCortos(v.total)}. Queda registrada como anulada, los productos vuelven al stock y no se puede deshacer.</p>
      <label className="an-campo"><span>Por qué</span>
        <span className="an-select">
          <select value={a.motivo} onChange={(e) => a.setMotivo(e.target.value)} data-testid="motivo-anular">
            {[SIN_MOTIVO, ...MOTIVOS_DE_ANULACION].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <Icono nombre="abajo" tam={20} />
        </span>
      </label>
      <textarea className="an-comentario" value={a.comentario} onChange={(e) => a.setComentario(e.target.value)} placeholder="Agregá un comentario (opcional)" aria-label="Comentario" data-testid="comentario-anular" />
      <AvisoError texto={a.error} />
      <div className="an-botones">
        <button type="button" onClick={alCerrar}>Cancelar</button>
        <button type="button" className="fuerte" disabled={a.anulando} onClick={() => void a.confirmar()} data-testid="confirmar-anular"><Icono nombre="prohibido" tam={20} />{a.anulando ? "Anulando…" : `Anular · −${pesosCortos(v.total)}`}</button>
      </div>
    </Hoja>
  );
}
