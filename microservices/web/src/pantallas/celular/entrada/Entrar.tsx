import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Escaner, hayCamara } from "../../../plataforma/camara";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { destinoDelCodigo, hayHuella, huellaVinculadaAca } from "../../../negocio/entrada";
import { Logotipo } from "../../Logotipo";
import { TEXTOS_DE_ENTRADA } from "../../comun/entrada/textos-de-entrada";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import { BotonGoogle, BotonHuella } from "./BotonesDeEntrada";
import { PieConOnda } from "./PieConOnda";
import { irA } from "../../../rutas";
import "./entrar.css";

export { destinoDelCodigo };

// La entrada del celular (decisión 55, sobre una referencia que pasó Carlos el 2026-10-12):
// la marca arriba y al centro, las dos formas de entrar como tarjetas, una línea que dice que
// no hay contraseñas, tres cosas que hace la aplicación y un pie con la onda de la marca, sin texto.
// Los colores son los de la paleta y el logotipo es el de siempre.
const PARA_QUE: { icono: NombreDeIcono; titulo: string; detalle: string }[] = [
  { icono: "vender", titulo: "Vendé", detalle: "más rápido" },
  { icono: "stock", titulo: "Controlá", detalle: "tu stock" },
  { icono: "resumen", titulo: "Hacé crecer", detalle: "tu negocio" },
];

const COMPUTADORA = <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;

// `paraLaCompu`: se llegó leyendo el código de una computadora (RF-76). La entrada es la misma;
// avisa que al entrar acá esa computadora entra también, y el botón de la huella lo dice.
export function Entrar({ paraLaCompu = false }: { paraLaCompu?: boolean } = {}) {
  const enLinea = useEnLinea();
  return (
    <main className="en" data-testid="entrar">
      <div className="en-estado" aria-live="polite">
        {!enLinea && <span className="en-sin-conexion" role="alert" data-testid="entrar-sin-conexion"><Icono nombre="alerta" tam={18} />Sin conexión</span>}
      </div>
      <header className="en-marca">
        <h1><Logotipo sobre="claro" /></h1>
        <p>{TEXTOS_DE_ENTRADA.lema}</p>
      </header>
      <section className="en-formas" aria-label={TEXTOS_DE_ENTRADA.entrar}>
        {!enLinea && <p className="en-ayuda">{TEXTOS_DE_ENTRADA.sinConexion}</p>}
        {paraLaCompu && <p className="en-compu" role="status" data-testid="entrar-para-la-compu">{COMPUTADORA}<span>Leíste el código de una computadora. Al entrar acá, esa computadora entra también.</span></p>}
        <FormasDeEntrar paraLaCompu={paraLaCompu} />
        <p className="en-sin-claves">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2" /></svg>
          <span><strong>Sin contraseñas.</strong> Entrá de forma simple y segura.</span>
        </p>
      </section>
      <ul className="en-para-que">
        {PARA_QUE.map((q) => (
          <li key={q.titulo}><span className="en-icono"><Icono nombre={q.icono} tam={26} /></span><strong>{q.titulo}</strong><span>{q.detalle}</span></li>
        ))}
      </ul>
      <PieConOnda />
    </main>
  );
}

// La huella y Google (primero la huella si se viene de la computadora) y escanear su código.
function FormasDeEntrar({ paraLaCompu }: { paraLaCompu: boolean }) {
  const [pedirHuella, setPedirHuella] = useState(false);
  return (
    <>
      {paraLaCompu ? <BotonHuella titulo="Entrar acá y en la computadora" detalle="Con la huella" enseguida={pedirHuella} /> : <BotonGoogle conPantallaDeCarga />}
      {hayHuella() && <div className="en-o" aria-hidden="true"><span>o</span></div>}
      {paraLaCompu ? <BotonGoogle conPantallaDeCarga /> : <BotonHuella detalle="Rápido y seguro" />}
      {!paraLaCompu && hayCamara() && <EscanearLaCompu alLeer={setPedirHuella} />}
    </>
  );
}

// Leer desde acá el código que muestra la computadora en su entrada (o el de vincular): es lo mismo
// que leerlo con la cámara del celular, sin salir de la aplicación. Leído el código de la
// computadora, se pide la huella enseguida: con ella entra el celular, entra la computadora y
// quedan vinculados (decisión 65).
function EscanearLaCompu({ alLeer }: { alLeer: (pedirHuella: boolean) => void }) {
  const [escaneando, setEscaneando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alLeerCodigo = useCallback((leido: string) => {
    const destino = destinoDelCodigo(leido);
    if (destino) { alLeer(destino.startsWith("#/entrar-compu") && huellaVinculadaAca()); irA(destino.replace(/^#\//, "")); } else setError("Ese código no es de Ferrebress. Apuntá al que muestra la computadora en su pantalla de entrada.");
  }, [alLeer]);
  return (
    <>
      <button type="button" className="en-escanear" onClick={() => { setError(null); setEscaneando(true); }} data-testid="escanear-codigo-de-la-compu">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /><rect x="7" y="7" width="4" height="4" /><rect x="13" y="7" width="4" height="4" /><rect x="7" y="13" width="4" height="4" /><path d="M13 13h4v4h-4z" /></svg>
        <span><strong>Escanear el código de la computadora</strong><small>Para entrar en los dos de una vez</small></span>
      </button>
      {error && <p className="en-ayuda" role="alert" data-testid="codigo-no-reconocido">{error}</p>}
      {escaneando && createPortal(<Escaner alDetectar={alLeerCodigo} alCerrar={() => setEscaneando(false)} />, document.body)}
    </>
  );
}
