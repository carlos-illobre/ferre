import { useState } from "react";
import { textoDelPedido, type Pedido, type RenglonDelPedido } from "../../../negocio/deposito";
import css from "./Pedidos.module.css";

// Copiar el texto del pedido; cancelar uno que no llegó o cerrar uno al que le falta el resto.
type Props = { p: Pedido; renglones: RenglonDelPedido[]; alError: (e: string) => void; alCerrar: (accion: "cancelar" | "cerrar", mensaje: string) => Promise<void> };

export function AccionesDelMandado({ p, renglones, alError, alCerrar }: Props) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => { void navigator.clipboard?.writeText(textoDelPedido(renglones, new Date(p.enviado_en ?? p.creado_en))).then(() => setCopiado(true)).catch(() => alError("No se pudo copiar el texto.")); };
  return (
    <div className={css.fila}>
      <button type="button" className={css.boton} onClick={copiar} data-testid="copiar-texto">{copiado ? "Texto copiado" : "Copiar el texto del pedido"}</button>
      {p.estado === "enviado" && <button type="button" className={`${css.boton} peligro`} onClick={() => void alCerrar("cancelar", `Pedido a ${p.proveedor} cancelado.`)} data-testid="cancelar-pedido">Cancelar el pedido</button>}
      {p.estado === "recibido_parcial" && <button type="button" className={`${css.boton} peligro`} onClick={() => void alCerrar("cerrar", `Pedido a ${p.proveedor} cerrado incompleto.`)} data-testid="cerrar-pedido">El resto no va a llegar: cerrarlo</button>}
    </div>
  );
}
