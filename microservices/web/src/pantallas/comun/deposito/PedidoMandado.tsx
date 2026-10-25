import { useState } from "react";
import { aRenglones, cerrarPedido, ESTADOS, esperaMercaderia, mensajeDePedido, type Pedido } from "../../../negocio/deposito";
import { AccionesDelMandado } from "./AccionesDelMandado";
import { LlegoLaMercaderia } from "./LlegoLaMercaderia";
import { RenglonesMandados } from "./RenglonesMandados";
import { dia } from "./formato-de-pedidos";
import css from "./Pedidos.module.css";

// Un pedido que ya se mandó: qué se pidió, qué llegó y qué falta.
type Props = { pedido: Pedido; encarga: boolean; ingresa: boolean; alVolver: (mensaje?: string) => void; alIngresar: (id: string) => void };

// Quién lo mandó y cuándo; si se canceló o se cerró, quién y cuándo.
function quienYCuando(p: Pedido): string {
  const mandado = p.enviado_en ? `Mandado el ${dia(p.enviado_en)}${p.enviado_por ? ` por ${p.enviado_por}` : ""}` : null;
  const cerrado = p.cerrado_en && p.estado !== "recibido" ? `${p.estado === "cancelado" ? "cancelado" : "cerrado"} el ${dia(p.cerrado_en)}${p.cerrado_por ? ` por ${p.cerrado_por}` : ""}` : null;
  return [mandado, cerrado].filter(Boolean).join(" · ");
}

export function PedidoMandado({ pedido: p, encarga, ingresa, alVolver, alIngresar }: Props) {
  const [error, setError] = useState<string | null>(null);
  async function cerrar(accion: "cancelar" | "cerrar", mensaje: string) {
    try { await cerrarPedido(p.id, accion); alVolver(mensaje); }
    catch (e) { setError(mensajeDePedido(e, accion === "cancelar" ? "cancelar el pedido" : "cerrar el pedido")); }
  }
  return (
    <section className="pd" data-testid="pedido-abierto">
      <div><button type="button" className={`${css.boton} chico`} onClick={() => alVolver()} data-testid="volver-a-pedidos">‹ Volver a los pedidos</button></div>
      <header className={css.cabeza}>
        <div className={css.crece}><h1>Pedido a {p.proveedor}</h1><p className={css.bajada}><span className={`${css.estado} ${p.estado}`} data-testid="estado-pedido">{ESTADOS[p.estado]}</span> {quienYCuando(p)}</p></div>
        {ingresa && esperaMercaderia(p) && <LlegoLaMercaderia p={p} alIngresar={alIngresar} />}
      </header>
      {error && <p className={css.error} role="alert">{error}</p>}
      <RenglonesMandados p={p} encarga={encarga} renglones={aRenglones(p)} />
      {encarga && <AccionesDelMandado p={p} renglones={aRenglones(p)} alError={setError} alCerrar={cerrar} />}
    </section>
  );
}
