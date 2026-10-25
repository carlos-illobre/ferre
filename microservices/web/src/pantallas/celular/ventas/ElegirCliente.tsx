import { useState } from "react";
import { pesos } from "../../../negocio/formato";
import { Buscador, Lista } from "../componentes/base";
import hojas from "./hojas.module.css";

// Elegir el cliente: con cualquier medio es opcional; con cuenta corriente, obligatorio.
type Cliente = { id: string; nombre: string; deuda: string | number };
const plano = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function ElegirCliente({ clientes, elegido, alElegir }: { clientes: Cliente[]; elegido: string; alElegir: (id: string) => void }) {
  const [texto, setTexto] = useState("");
  const lista = clientes.filter((c) => plano(c.nombre).includes(plano(texto)));
  return (
    <>
      <Buscador valor={texto} alCambiar={setTexto} placeholder="Buscá por nombre" chico testId="buscar-cliente" />
      <Lista>
        {clientes.length === 0 && <div className="fila"><span className="nombre">Todavía no hay clientes.</span></div>}
        {lista.map((c) => (
          <button key={c.id} type="button" className={`fila ${elegido === c.id ? "elegida" : ""}`} onClick={() => alElegir(c.id)}>
            <span className="nombre">{c.nombre}</span>
            <small style={{ color: Number(c.deuda) > 0 ? "var(--coral-texto)" : undefined }}>{Number(c.deuda) > 0 ? `debe ${pesos(c.deuda)}` : "al día"}</small>
          </button>
        ))}
      </Lista>
      {elegido && <button type="button" className={`boton ${hojas.ancho}`} onClick={() => alElegir("")} data-testid="sin-cliente">Sin cliente</button>}
    </>
  );
}
