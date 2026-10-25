import type { Pedido } from "../../../negocio/deposito";
import css from "./Pedidos.module.css";

// «Llegó la mercadería» (o «el resto»): abre el ingreso con lo que falta llegar.
export function LlegoLaMercaderia({ p, alIngresar }: { p: Pedido; alIngresar: (id: string) => void }) {
  return <button type="button" className={`${css.boton} fuerte`} onClick={() => alIngresar(p.id)} data-testid="llego-la-mercaderia">{p.estado === "enviado" ? "Llegó la mercadería" : "Llegó el resto"}</button>;
}
