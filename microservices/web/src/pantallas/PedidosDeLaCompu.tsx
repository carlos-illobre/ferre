import { useState } from "react";
import { fotoDejada, lectorAtendido, usePedidosDeLaCompu } from "../pedidos-al-celular";
import "./pedidos-de-la-compu.css";

// En el celular emparejado (decisiones 58 y 59): cuando la computadora pide una foto (la
// factura de un ingreso, un producto, la captura de un ticket) o que el celular haga de lector
// de códigos de barras, acá aparece un aviso con un botón que abre la cámara. No hay que leer
// ningún código ni preguntar: el pedido llega en el momento por la conexión entre los dos
// (specs/023), o al abrir la aplicación si estaba cerrada.
export function PedidosDeLaCompu({ alSacar, alLeer }: { alSacar: (id: string) => void; alLeer: () => void }) {
  const { lector, fotos } = usePedidosDeLaCompu();
  const [dejados, setDejados] = useState<string[]>([]);
  if (lector) {
    return (
      <div className="pdc" role="alert" data-testid="lector-para-la-compu">
        <span><strong>La computadora quiere escanear</strong><small>Usá este celular como lector de códigos de barras</small></span>
        <div className="pdc-botones">
          <button type="button" className="pdc-sacar" onClick={() => { lectorAtendido(); alLeer(); }} data-testid="abrir-el-lector">Abrir el lector</button>
          <button type="button" onClick={lectorAtendido}>Ahora no</button>
        </div>
      </div>
    );
  }
  const pedido = fotos.find((p) => !dejados.includes(p.id));
  if (!pedido) return null;
  return (
    <div className="pdc" role="alert" data-testid="pedido-de-la-compu">
      <span><strong>La computadora pide una foto</strong><small>Para {pedido.para}</small></span>
      <div className="pdc-botones">
        <button type="button" className="pdc-sacar" onClick={() => alSacar(pedido.id)} data-testid="sacar-foto-para-la-compu">Sacar la foto</button>
        <button type="button" onClick={() => { setDejados((d) => [...d, pedido.id]); fotoDejada(pedido.id); }}>Ahora no</button>
      </div>
    </div>
  );
}
