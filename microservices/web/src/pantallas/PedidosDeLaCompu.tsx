import { useEffect, useState } from "react";
import { api } from "../api";
import { EVENTO_EMPAREJAMIENTO, puestoRemoto } from "../puesto";
import { alPedidoDeLaCompu } from "../espejo";
import { alCambiarAjustes, celularCadaMs } from "../ajustes-del-sistema";
import "./pedidos-de-la-compu.css";
import type { AvisosParaElCelular } from "@servidor/puestos";
import type { FotoQueEspera } from "@servidor/pedidos-de-foto";

// En el celular emparejado (decisiones 58 y 59): cuando la computadora pide una foto (la
// factura de un ingreso, un producto, la captura de un ticket) o que el celular haga de lector
// de códigos de barras, acá aparece un aviso con un botón que abre la cámara. No hay que leer ningún código. El servidor avisa
// por el espejo en el momento en que la computadora pide algo, y acá se pregunta qué es (decisión 112). Además se pregunta
// al volver a la aplicación, al volver la conexión y cada el tiempo que fija quien administra (specs/020, RF-134), solo con
// el celular emparejado y la aplicación a la vista, por si esa conexión se cortó.
type Pedido = FotoQueEspera;

export function PedidosDeLaCompu({ alSacar, alLeer }: { alSacar: (codigo: string) => void; alLeer: () => void }) {
  const [emparejado, setEmparejado] = useState(() => Boolean(puestoRemoto()));
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [dejados, setDejados] = useState<string[]>([]);
  const [lector, setLector] = useState(false);
  useEffect(() => {
    const mirar = () => setEmparejado(Boolean(puestoRemoto()));
    window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar);
    return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar);
  }, []);
  const [cadaMs, setCadaMs] = useState(celularCadaMs);
  useEffect(() => alCambiarAjustes(() => setCadaMs(celularCadaMs())), []);
  useEffect(() => {
    if (!emparejado) { setPedidos([]); setLector(false); return; }
    let vigente = true;
    const preguntar = () => {
      if (document.visibilityState === "hidden" || !navigator.onLine) return;
      api<AvisosParaElCelular>("/puestos/avisos").then((a) => { if (vigente) { setPedidos(a.fotos); setLector(a.lector); } }).catch(() => undefined);
    };
    preguntar();
    const reloj = setInterval(preguntar, cadaMs);
    const dejar = alPedidoDeLaCompu(preguntar);
    document.addEventListener("visibilitychange", preguntar);
    window.addEventListener("online", preguntar);
    return () => { vigente = false; clearInterval(reloj); dejar(); document.removeEventListener("visibilitychange", preguntar); window.removeEventListener("online", preguntar); };
  }, [emparejado, cadaMs]);
  const atendido = () => { setLector(false); api("/puestos/avisos/lector", { method: "DELETE" }).catch(() => undefined); };
  if (lector) {
    return (
      <div className="pdc" role="alert" data-testid="lector-para-la-compu">
        <span><strong>La computadora quiere escanear</strong><small>Usá este celular como lector de códigos de barras</small></span>
        <div className="pdc-botones">
          <button type="button" className="pdc-sacar" onClick={() => { atendido(); alLeer(); }} data-testid="abrir-el-lector">Abrir el lector</button>
          <button type="button" onClick={atendido}>Ahora no</button>
        </div>
      </div>
    );
  }
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
