import { useState } from "react";
import { anularCompra, type CompraFila } from "../../../negocio/compras";
import { fecha, pesosCortos } from "../../../negocio/formato";
import { Aviso, Boton, Hoja } from "../base/ui";
import { mensajeDe, plural } from "../deposito/deposito-comun";
import { nombreComprobante } from "./CompraReciente";

// Anular una compra no se deshace: pide confirmar, con el motivo (opcional) ahí mismo.
export function AnularCompra({ compra: c, enLinea, alCerrar, alAnular }: { compra: CompraFila; enLinea: boolean; alCerrar: () => void; alAnular: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function anular() {
    if (ocupado) return;
    setOcupado(true); setError(null);
    try {
      await anularCompra(c.id, motivo);
      alAnular();
    } catch (e) {
      setError(mensajeDe(e, "No se anuló: se cortó la conexión. Probá de nuevo cuando vuelva internet."));
      setOcupado(false);
    }
  }
  return (
    <Hoja titulo="¿Anular esta compra?" alCerrar={alCerrar} testId="hoja-anular"
      pie={<><Boton onClick={alCerrar} disabled={ocupado}>No anular</Boton><Boton variante="peligro" icono="basura" onClick={() => void anular()} disabled={ocupado || !enLinea} data-testid="anular-confirmar">{ocupado ? "Anulando…" : "Anular la compra"}</Boton></>}>
      <div className="compras-anular-que">
        <strong>{c.proveedor}</strong><span className="importe">{pesosCortos(c.total)}</span>
        <span className="detalle">{fecha(c.fecha)} · {nombreComprobante(c)} · {plural(Number(c.renglones), "renglón", "renglones")}</span>
      </div>
      <p>El stock que sumó esta compra se descuenta, con un ajuste por cada renglón, y deja de contar en los gastos de la semana de Cómo va el negocio. El costo que dejó el comprobante no cambia. <strong>No se puede deshacer.</strong></p>
      <label className="campo"><span>Motivo (opcional)</span><input className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Se cargó dos veces…" maxLength={200} autoFocus data-testid="motivo-anular" /></label>
      <Aviso tipo="alerta">{!enLinea ? "Sin conexión: anular una compra necesita internet." : null}</Aviso>
      <Aviso tipo="error">{error}</Aviso>
    </Hoja>
  );
}
