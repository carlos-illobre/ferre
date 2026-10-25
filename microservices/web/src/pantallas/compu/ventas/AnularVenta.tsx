import { MOTIVOS_DE_ANULACION, SIN_MOTIVO, useAnularConMotivo, type VentaDelDia } from "../../../negocio/ventas";
import { Aviso, Boton, Hoja, hora, pesosCortos } from "../base/ui";

// Anular no se puede deshacer: es de las pocas acciones que piden confirmar. El motivo, de una
// lista que empieza en «Sin motivo», y un comentario (decisión 110); Ctrl+Enter confirma.
export function AnularVenta({ venta, alCerrar, alAnular }: { venta: VentaDelDia; alCerrar: () => void; alAnular: () => void }) {
  const a = useAnularConMotivo(venta, alAnular);
  const confirmar = () => void a.confirmar();
  return (
    <Hoja titulo="¿Anular esta venta?" alCerrar={alCerrar} testId="hoja-anular" alTeclear={(e) => { if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); confirmar(); } }}
      pie={<><Boton onClick={alCerrar}>Cancelar <kbd className="tecla">Esc</kbd></Boton><Boton variante="peligro" disabled={a.anulando} onClick={confirmar} data-testid="confirmar-anular">{a.anulando ? "Anulando…" : <>Anular · −{pesosCortos(venta.total)} <kbd className="tecla">Ctrl Enter</kbd></>}</Boton></>}>
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
