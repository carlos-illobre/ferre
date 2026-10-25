import { useMemo, useState } from "react";
import { marcarEnviado, mensajeDePedido, textoDelPedido, type ProveedorDelPedido, type RenglonDelPedido } from "../../../negocio/deposito";
import { HojaDePedidos } from "./HojaDePedidos";
import { pesos } from "./formato-de-pedidos";
import css from "./Pedidos.module.css";

// «Revisar y mandar»: el mensaje tal como lo recibe el proveedor. WhatsApp lo abre ya escrito
// y deja el pedido enviado; copiarlo lo deja para mandar por otro lado y se marca a mano.
export function MandarPedido({ id, proveedor, renglones, total, alCerrar, alMandar }: { id: string; proveedor: ProveedorDelPedido; renglones: RenglonDelPedido[]; total: number; alCerrar: () => void; alMandar: () => void }) {
  const texto = useMemo(() => textoDelPedido(renglones), [renglones]);
  const [numero, setNumero] = useState(proveedor.whatsapp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function marcar(whatsapp?: string) {
    setOcupado(true); setError(null);
    try { await marcarEnviado(id, whatsapp); alMandar(); }
    catch (e) { setError(mensajeDePedido(e, "mandar el pedido")); setOcupado(false); }
  }
  function porWhatsApp() {
    const limpio = numero.replace(/\D/g, "");
    if (limpio.length < 8) { setError("Poné el WhatsApp del proveedor con código de país y de área, solo números: 5491155550101."); return; }
    window.open(`https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
    void marcar(limpio === (proveedor.whatsapp ?? "") ? undefined : limpio);
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setError(null); }
    catch { setError("No se pudo copiar solo: seleccioná el texto del mensaje y copialo a mano."); setCopiado(true); }
  }
  return (
    <HojaDePedidos titulo={`Mandar el pedido a ${proveedor.nombre}`} alCerrar={alCerrar} testId="hoja-mandar">
      <pre className={css.mensaje} data-testid="mensaje-pedido">{texto}</pre>
      <p className={css.detalle}>Sin costos: el proveedor cotiza a su precio. Total estimado para vos: <strong>{pesos(total)}</strong>.</p>
      <label className={css.campo}>
        <span>WhatsApp de {proveedor.nombre}{proveedor.whatsapp ? "" : " · se guarda para la próxima"}</span>
        <input inputMode="tel" value={numero} onChange={(e) => { setNumero(e.target.value); setError(null); }} placeholder="5491155550101" autoComplete="off" data-testid="whatsapp-proveedor" />
      </label>
      {error && <p className={css.error} role="alert">{error}</p>}
      <div className={css.fila}>
        <button type="button" className={`${css.boton} wa ${css.crece}`} disabled={ocupado} onClick={porWhatsApp} data-testid="mandar-whatsapp">Mandar por WhatsApp</button>
        <button type="button" className={`${css.boton} ${css.crece}`} disabled={ocupado} onClick={() => void copiar()} data-testid="copiar-texto">Copiar el texto</button>
      </div>
      {copiado && <button type="button" className={`${css.boton} fuerte ancho`} disabled={ocupado} onClick={() => void marcar()} data-testid="marcar-enviado">Ya lo mandé: marcarlo como enviado</button>}
      <p className={css.detalle}>{copiado ? "Texto copiado. Pegalo donde se lo mandes al proveedor y después marcalo como enviado." : "Al mandarlo queda «Enviado», con tu nombre y la fecha."}</p>
    </HojaDePedidos>
  );
}

