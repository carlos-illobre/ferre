import { useEffect, useState } from "react";
import { api } from "../api";
import { EVENTO_EMPAREJAMIENTO, puestoRemoto } from "../puesto";
import "./pedidos-de-la-compu.css";

// En el celular emparejado (decisión 58): cuando la computadora pide una foto (la factura de
// un ingreso, un producto, la captura de un ticket), acá aparece un aviso con un botón que
// abre la cámara. No hay que leer ningún código. Se pregunta cada pocos segundos, solo con el
// celular emparejado y la aplicación a la vista.
const CADA_MS = 3000;
type Pedido = { codigo: string; para: string };

export function PedidosDeLaCompu({ alSacar }: { alSacar: (codigo: string) => void }) {
  const [emparejado, setEmparejado] = useState(() => Boolean(puestoRemoto()));
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [dejados, setDejados] = useState<string[]>([]);
  useEffect(() => {
    const mirar = () => setEmparejado(Boolean(puestoRemoto()));
    window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar);
    return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar);
  }, []);
  useEffect(() => {
    if (!emparejado) { setPedidos([]); return; }
    let vigente = true;
    const preguntar = () => {
      if (document.visibilityState === "hidden" || !navigator.onLine) return;
      api<Pedido[]>("/pedidos-de-foto/para-mi").then((l) => { if (vigente) setPedidos(l); }).catch(() => undefined);
    };
    preguntar();
    const reloj = setInterval(preguntar, CADA_MS);
    document.addEventListener("visibilitychange", preguntar);
    return () => { vigente = false; clearInterval(reloj); document.removeEventListener("visibilitychange", preguntar); };
  }, [emparejado]);
  const pedido = pedidos.find((p) => !dejados.includes(p.codigo));
  if (!pedido) return null;
  return (
    <div className="pdc" role="alert" data-testid="pedido-de-la-compu">
      <span><strong>La computadora pide una foto</strong><small>Para {pedido.para}</small></span>
      <div className="pdc-botones">
        <button type="button" className="pdc-sacar" onClick={() => alSacar(pedido.codigo)} data-testid="sacar-foto-para-la-compu">Sacar la foto</button>
        <button type="button" onClick={() => setDejados((d) => [...d, pedido.codigo])}>Ahora no</button>
      </div>
    </div>
  );
}
