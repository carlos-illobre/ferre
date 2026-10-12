import { useEffect, useState } from "react";
import { hayHuella } from "../../credenciales";
import { Logotipo } from "../Logotipo";
import { BotonGoogle, BotonHuella } from "./pantallas/Login";
import { TEXTOS_DE_ENTRADA } from "../compu/base/pantallas/Entrar";
import { Icono, type NombreDeIcono } from "../compu/base/ui";
import "./entrar.css";

// La entrada del celular (decisión 55, sobre una referencia que pasó Carlos el 2026-10-12):
// la marca arriba y al centro, las dos formas de entrar como tarjetas, una línea que dice que
// no hay contraseñas, tres cosas que hace la aplicación y un pie con la onda de la marca, sin texto.
// Los colores son los de la paleta y el logotipo es el de siempre.
const PARA_QUE: { icono: NombreDeIcono; titulo: string; detalle: string }[] = [
  { icono: "vender", titulo: "Vendé", detalle: "más rápido" },
  { icono: "stock", titulo: "Controlá", detalle: "tu stock" },
  { icono: "resumen", titulo: "Hacé crecer", detalle: "tu negocio" },
];

function useEnLinea() {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  useEffect(() => {
    const cambiar = () => setEnLinea(navigator.onLine);
    window.addEventListener("online", cambiar); window.addEventListener("offline", cambiar);
    return () => { window.removeEventListener("online", cambiar); window.removeEventListener("offline", cambiar); };
  }, []);
  return enLinea;
}

const COMPUTADORA = <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;

// `paraLaCompu`: se llegó leyendo el código de una computadora (RF-76). La entrada es la misma;
// avisa que al entrar acá esa computadora entra también, y el botón de la huella lo dice.
export function Entrar({ paraLaCompu = false }: { paraLaCompu?: boolean } = {}) {
  const enLinea = useEnLinea();
  const conHuella = hayHuella();
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
        {paraLaCompu ? <BotonHuella titulo="Entrar acá y en la computadora" detalle="Con la huella" /> : <BotonGoogle />}
        {conHuella && <div className="en-o" aria-hidden="true"><span>o</span></div>}
        {paraLaCompu ? <BotonGoogle /> : <BotonHuella detalle="Rápido y seguro" />}
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
      <footer className="en-pie" aria-hidden="true">
        <svg className="en-onda" viewBox="0 0 390 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 4 C 110 46, 250 84, 390 92 L 390 150 L 0 150 Z" fill="var(--p-naranja)" />
          <path d="M0 26 C 110 62, 250 90, 390 96 L 390 150 L 0 150 Z" fill="var(--p-verde)" />
        </svg>
      </footer>
    </main>
  );
}
