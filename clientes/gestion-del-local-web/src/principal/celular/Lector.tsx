import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { enviarCodigoAlPuesto, puestoRemoto } from "../../puesto";
import { irA } from "../../rutas";
import { Escaner } from "./componentes/Escaner";
import "./entrar.css";

// El celular como lector de códigos de barras de la computadora emparejada (decisión 59). Es
// un modo aparte de Vender: lo que se lee acá va solo a la computadora, a la pantalla que ella
// tenga abierta (la venta, la búsqueda de productos, la ficha que espera un código). La cámara
// queda abierta para leer uno atrás de otro; se cierra con «Cerrar» o con el botón de volver.
export function Lector() {
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [emparejado] = useState(() => Boolean(puestoRemoto()));
  // Al abrir el lector, el pedido de la computadora queda atendido.
  useEffect(() => { if (emparejado) api("/puestos/avisos/lector", { method: "DELETE" }).catch(() => undefined); }, [emparejado]);
  const alDetectar = useCallback((codigo: string) => {
    setUltimo(`${codigo}: mandando…`);
    void enviarCodigoAlPuesto(codigo).then((ok) => setUltimo(ok ? `${codigo}: ya está en la computadora` : `${codigo}: no llegó a la computadora. Probá de nuevo.`));
  }, []);
  const cerrar = useCallback(() => irA("vender"), []);
  if (!emparejado) {
    return (
      <main className="en en-compu-paso" data-testid="lector-sin-computadora">
        <section className="en-centro">
          <h2>Este celular no está emparejado con una computadora</h2>
          <p>Para usarlo como lector, entrá a la computadora leyendo su código con este celular, o leé el código de «Escanear con el celular» en Vender.</p>
          <button type="button" className="en-boton verde" onClick={cerrar}>Volver</button>
        </section>
      </main>
    );
  }
  return <Escaner alDetectar={alDetectar} alCerrar={cerrar} ultimo={ultimo ?? "Lector de la computadora: lo que leas aparece allá."} />;
}
