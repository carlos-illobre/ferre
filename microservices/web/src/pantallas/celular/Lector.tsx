import { useCallback, useState } from "react";
import { puestoRemoto } from "../../puesto";
import { enviarCodigoAlPuesto } from "../../codigos-del-celular";
import { irA } from "../../rutas";
import { Escaner } from "../../plataforma/camara";
import "./entrada/entrar.css";

// El celular como lector de códigos de barras de la computadora emparejada (decisión 59). Es
// un modo aparte de Vender: lo que se lee acá va solo a la computadora, a la pantalla que ella
// tenga abierta (la venta, la búsqueda de productos, la ficha que espera un código). La cámara
// se cierra sola con cada lectura; la pantalla dice si llegó y ofrece leer otro.
const TEXTO_DEL_RESULTADO = { llego: "Ya está en la computadora", espera: "Va a llegar cuando abras la computadora", no: "No llegó a la computadora" };

type Llego = "llego" | "espera" | "no" | null;
type Resultado = { codigo: string; llego: Llego };

// Cómo le fue al código: mandándose, llegó, espera a que se abra la computadora (023-E32), o no.
function useLector() {
  const [emparejado] = useState(() => Boolean(puestoRemoto()));
  const [leyendo, setLeyendo] = useState(emparejado);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const alDetectar = useCallback((codigo: string) => {
    setResultado({ codigo, llego: null });
    void enviarCodigoAlPuesto(codigo).then((r) => setResultado({ codigo, llego: r }));
  }, []);
  const cerrar = useCallback(() => setLeyendo(false), []);
  return { emparejado, leyendo, leer: () => setLeyendo(true), resultado, alDetectar, cerrar };
}

function ComoLeFue({ resultado }: { resultado: Resultado | null }) {
  if (!resultado) return <h2>Lector de la computadora</h2>;
  return (
    <>
      {resultado.llego === "llego" && <span className="en-tilde" aria-hidden="true">✓</span>}
      <h2 data-testid="lector-resultado">{resultado.llego === null ? "Mandando…" : TEXTO_DEL_RESULTADO[resultado.llego]}</h2>
      <p>Código <strong>{resultado.codigo}</strong>{resultado.llego === "no" ? ". Probá de nuevo." : ""}</p>
    </>
  );
}

function SinComputadora() {
  return (
    <>
      <h2>Este celular no está emparejado con una computadora</h2>
      <p>Para usarlo como lector, entrá a la computadora leyendo su código con este celular, o leé el código de «Vincular el celular».</p>
    </>
  );
}

export function Lector() {
  const l = useLector();
  if (l.leyendo) return <Escaner alDetectar={l.alDetectar} alCerrar={l.cerrar} />;
  return (
    <main className="en en-compu-paso" data-testid={l.emparejado ? "lector" : "lector-sin-computadora"}>
      <section className="en-centro">
        {l.emparejado ? <ComoLeFue resultado={l.resultado} /> : <SinComputadora />}
        {l.emparejado && <button type="button" className="en-boton naranja" onClick={l.leer} data-testid="leer-otro">{l.resultado ? "Leer otro" : "Abrir la cámara"}</button>}
        <button type="button" className="en-boton verde" onClick={() => irA("vender")}>Listo</button>
      </section>
    </main>
  );
}
