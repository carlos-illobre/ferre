import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { enviarCodigoAlPuesto, puestoRemoto } from "../../puesto";
import { irA } from "../../rutas";
import { Escaner } from "./componentes/Escaner";
import "./entrar.css";

// El celular como lector de códigos de barras de la computadora emparejada (decisión 59). Es
// un modo aparte de Vender: lo que se lee acá va solo a la computadora, a la pantalla que ella
// tenga abierta (la venta, la búsqueda de productos, la ficha que espera un código). La cámara
// se cierra sola con cada lectura; la pantalla dice si llegó y ofrece leer otro.
export function Lector() {
  const [emparejado] = useState(() => Boolean(puestoRemoto()));
  const [leyendo, setLeyendo] = useState(emparejado);
  const [resultado, setResultado] = useState<{ codigo: string; llego: boolean | null } | null>(null);
  // Al abrir el lector, el pedido de la computadora queda atendido.
  useEffect(() => { if (emparejado) api("/puestos/avisos/lector", { method: "DELETE" }).catch(() => undefined); }, [emparejado]);
  const alDetectar = useCallback((codigo: string) => {
    setResultado({ codigo, llego: null });
    void enviarCodigoAlPuesto(codigo).then((ok) => setResultado({ codigo, llego: ok }));
  }, []);
  const cerrar = useCallback(() => setLeyendo(false), []);
  const salir = () => irA("vender");
  if (leyendo) return <Escaner alDetectar={alDetectar} alCerrar={cerrar} />;
  return (
    <main className="en en-compu-paso" data-testid={emparejado ? "lector" : "lector-sin-computadora"}>
      <section className="en-centro">
        {!emparejado ? (
          <>
            <h2>Este celular no está emparejado con una computadora</h2>
            <p>Para usarlo como lector, entrá a la computadora leyendo su código con este celular, o leé el código de «Vincular el celular».</p>
          </>
        ) : resultado ? (
          <>
            {resultado.llego && <span className="en-tilde" aria-hidden="true">✓</span>}
            <h2 data-testid="lector-resultado">{resultado.llego === null ? "Mandando…" : resultado.llego ? "Ya está en la computadora" : "No llegó a la computadora"}</h2>
            <p>Código <strong>{resultado.codigo}</strong>{resultado.llego === false ? ". Probá de nuevo." : ""}</p>
          </>
        ) : <h2>Lector de la computadora</h2>}
        {emparejado && <button type="button" className="en-boton naranja" onClick={() => setLeyendo(true)} data-testid="leer-otro">{resultado ? "Leer otro" : "Abrir la cámara"}</button>}
        <button type="button" className="en-boton verde" onClick={salir}>Listo</button>
      </section>
    </main>
  );
}
