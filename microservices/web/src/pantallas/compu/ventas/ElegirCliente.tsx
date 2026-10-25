import { useEffect, useRef, useState } from "react";
import { pesosCortos } from "../../../negocio/formato";
import type { Cliente } from "../../../negocio/catalogo";
import { useAccionesDelLugar } from "../../../plataforma/comandos";
import { TEXTOS } from "../../textos";
import { Boton, Hoja, Pastilla, Vacio } from "../base/ui";

// El cliente se busca escribiendo; cada uno dice cuánto debe. Con cuenta corriente, solo los que
// la tienen; con otro medio es opcional.
type Props = { clientes: Cliente[]; elegido: string; alElegir: (id: string) => void; alCerrar: () => void; soloCuentaCorriente?: boolean };

export function ElegirCliente({ clientes, elegido, alElegir, alCerrar, soloCuentaCorriente = true }: Props) {
  return (
    <Hoja titulo={soloCuentaCorriente ? TEXTOS.vender.quienLleva.largo : "Cliente de la venta (opcional)"} alCerrar={alCerrar} testId="hoja-clientes"
      pie={elegido ? <Boton onClick={() => alElegir("")} data-testid="sin-cliente">Sin cliente</Boton> : undefined}>
      {clientes.length === 0
        ? <Vacio icono="usuarios" titulo="Todavía no hay clientes con cuenta corriente">Mientras tanto, cobrá con otro medio de pago. Los clientes con cuenta corriente se cargan desde Clientes, que todavía no está en esta versión.</Vacio>
        : <BuscarCliente clientes={clientes.filter((c) => !soloCuentaCorriente || c.cuenta_corriente !== false)} elegido={elegido} alElegir={alElegir} />}
    </Hoja>
  );
}

function BuscarCliente({ clientes, elegido, alElegir }: { clientes: Cliente[]; elegido: string; alElegir: (id: string) => void }) {
  const [filtro, setFiltro] = useState("");
  const [marcado, setMarcado] = useState(0);
  const f = filtro.trim().toLowerCase();
  const visibles = clientes.filter((c) => !f || c.nombre.toLowerCase().includes(f));
  useEffect(() => { setMarcado(0); }, [filtro]);
  const caja = useRef<HTMLInputElement>(null);
  useAccionesDelLugar(caja, {
    "lista.siguiente": () => setMarcado((i) => Math.min(i + 1, visibles.length - 1)), "lista.anterior": () => setMarcado((i) => Math.max(i - 1, 0)),
    "lista.elegir": () => (visibles[marcado] ? alElegir(visibles[marcado]!.id) : false),
  });
  return (
    <>
      <input ref={caja} className="entrada" type="search" autoFocus value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Escribí el nombre del cliente" aria-label="Buscar cliente por nombre" autoComplete="off" data-testid="buscar-cliente" />
      {visibles.length === 0 && <p className="detalle">Ningún cliente con «{filtro}». Probá con menos letras.</p>}
      <ul className="lista">
        {visibles.map((c, i) => (
          <li key={c.id}>
            <button type="button" className={`renglon ${i === marcado || c.id === elegido ? "elegido" : ""}`} onClick={() => alElegir(c.id)} data-testid="cliente-opcion">
              <span className="nombre">{c.nombre}</span>
              {Number(c.deuda) > 0 ? <Pastilla tipo="alerta" sinPunto>debe {pesosCortos(c.deuda)}</Pastilla> : <Pastilla tipo="ok" sinPunto>al día</Pastilla>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
