import { MEDIOS, type Correccion, type Corrigiendo, type VentaDelDia } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { Icono } from "../base/ui";
import { MediosChicos } from "./MediosChicos";
import css from "./VentasDelDia.module.css";

// El medio de la venta corregida y, con cuenta corriente, el cliente (si falta, lo pide).
const t = TEXTOS.hoy;
type Props = { venta: VentaDelDia; c: Correccion; k: Corrigiendo; alCambiar: (c: Correccion) => void; alElegirCliente: () => void };

export function MedioYCliente({ venta: v, c, k, alCambiar, alElegirCliente }: Props) {
  const nombre = k.cliente?.nombre ?? (c.clienteId ? v.cliente : null) ?? t.eligeCliente.largo;
  return (
    <div className={css.mediosEd} role="radiogroup" aria-label="Medio de pago">
      <MediosChicos medios={MEDIOS} elegido={c.medio} prefijo="medio-ed" alElegir={(m) => { alCambiar({ ...c, medio: m }); if (m === "cuenta_corriente" && !c.clienteId) alElegirCliente(); }} />
      {c.medio === "cuenta_corriente" && <button type="button" className={`${css.clienteEd} ${k.cliente ? "" : "falta"}`} onClick={alElegirCliente} data-testid="cliente-ed"><Icono nombre="usuarios" tam={16} />{nombre}</button>}
    </div>
  );
}
