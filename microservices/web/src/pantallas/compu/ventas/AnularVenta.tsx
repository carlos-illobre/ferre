import { MOTIVOS_DE_ANULACION, SIN_MOTIVO, useAnularConMotivo, type VentaDelDia } from "../../../negocio/ventas";
import { hora, pesosCortos } from "../../../negocio/formato";
import { Atajo, Aviso, Boton, Hoja } from "../base/ui";
import { useComandos } from "../../../plataforma/comandos";

// Anular no se puede deshacer: es de las pocas acciones que piden confirmar. El motivo, de una
// lista que empieza en «Sin motivo», y un comentario (decisión 110). Ofrece confirmar.
export function AnularVenta({ venta, alCerrar, alAnular }: { venta: VentaDelDia; alCerrar: () => void; alAnular: () => void }) {
  const a = useAnularConMotivo(venta, alAnular);
  const confirmar = () => void a.confirmar();
  useComandos({ "anular.confirmar": confirmar }, { encima: true });
  return (
    <Hoja titulo="¿Anular esta venta?" alCerrar={alCerrar} testId="hoja-anular"
      pie={<><Boton onClick={alCerrar}>Cancelar <Atajo accion="cerrar" kbd /></Boton><Boton variante="peligro" disabled={a.anulando} onClick={confirmar} data-testid="confirmar-anular">{a.anulando ? "Anulando…" : <>Anular · −{pesosCortos(venta.total)} <Atajo accion="anular.confirmar" kbd /></>}</Boton></>}>
      <p>La venta de las {hora(venta.fecha)} queda registrada como anulada, sus productos vuelven al stock y no se puede deshacer.</p>
      <form className="campo" onSubmit={(e) => { e.preventDefault(); confirmar(); }}>
        <label htmlFor="motivo-anular" className="rotulo">Motivo</label>
        <select id="motivo-anular" className="entrada" autoFocus value={a.motivo} onChange={(e) => a.setMotivo(e.target.value)} data-testid="motivo-anular">
          {[SIN_MOTIVO, ...MOTIVOS_DE_ANULACION].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label htmlFor="comentario-anular" className="rotulo">Comentario (opcional)</label>
        <input id="comentario-anular" className="entrada" value={a.comentario} onChange={(e) => a.setComentario(e.target.value)} placeholder="Ej.: la mecha vino fallada" autoComplete="off" data-testid="comentario-anular" />
      </form>
      <Aviso tipo="error">{a.error}</Aviso>
    </Hoja>
  );
}
