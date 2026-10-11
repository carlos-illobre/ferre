import { useEffect, useRef, useState, type ReactNode } from "react";
import { useConexion } from "../conexion";
import { esDeMas, ir, useRuta } from "../rutas";
import { useUsuario } from "../usuario";
import { Iniciales, clases } from "./basicas";
import { Hoja } from "./hojas";
import { Icono } from "./Icono";

// ---------------------------------------------------------------- Encabezado

/**
 * El estado de la conexión: uno solo, en el encabezado. «Todo guardado», «N cambios por enviar»
 * (hay internet pero todavía no salieron) o «Sin conexión · N cambios por enviar».
 */
function Conexion() {
  const { enLinea, porEnviar } = useConexion();
  if (enLinea && porEnviar === 0) {
    return <p className="conexion conexion--bien" data-testid="conexion"><Icono nombre="guardado" tam={22} /><span>Todo guardado</span></p>;
  }
  const cambios = porEnviar === 1 ? "1 cambio por enviar" : `${porEnviar} cambios por enviar`;
  const texto = enLinea ? `${cambios[0]!.toUpperCase()}${cambios.slice(1)}` : porEnviar === 0 ? "Sin conexión" : `Sin conexión · ${cambios}`;
  return <p className="conexion conexion--sin" role="status" data-testid="conexion"><Icono nombre={enLinea ? "subir" : "sin-conexion"} tam={20} /><span>{texto}</span></p>;
}

/** El avatar del celular: abre una hoja con «Usuarios y sesiones» y «Salir». En la computadora eso está en el menú lateral. */
function AvatarDelCelular() {
  const usuario = useUsuario();
  const [abierto, setAbierto] = useState(false);
  if (!usuario) return null;
  return (
    <>
      <button type="button" className="encabezado__avatar" aria-label={`${usuario.nombre}, ${usuario.rol}. Abrir el menú de usuario`} onClick={() => setAbierto(true)} data-testid="avatar">
        <Iniciales nombre={usuario.nombre} tono="avatar" />
      </button>
      <Hoja abierta={abierto} alCerrar={() => setAbierto(false)} titulo={`${usuario.nombre} · ${usuario.rol}`} testId="hoja-usuario">
        <p className="hoja__nota">{usuario.correo}</p>
        <div className="hoja__opciones">
          <button type="button" className="hoja__opcion" onClick={() => { setAbierto(false); ir("usuarios"); }}><Icono nombre="usuarios" />Usuarios y sesiones</button>
          <button type="button" className="hoja__opcion hoja__opcion--peligro" onClick={() => { setAbierto(false); usuario.salir(); }} data-testid="salir-celular"><Icono nombre="salir" />Salir</button>
        </div>
      </Hoja>
    </>
  );
}

/** La franja de arriba: título de la pantalla, estado de la conexión y (en el celular) el avatar. */
export function Encabezado({ titulo }: { titulo: string }) {
  useEffect(() => { document.title = `${titulo} · Ferrebress`; }, [titulo]);
  return (
    <header className="encabezado">
      <h1>{titulo}</h1>
      <Conexion />
      <AvatarDelCelular />
    </header>
  );
}

// ---------------------------------------------------------------- Pagina

type PropsDePagina = {
  titulo: string;
  children: ReactNode;
  /** `normal` (hasta 1200 px), `angosto` (640 px, para formularios y conteos) o `completo` (sin márgenes: la pantalla arma sus columnas). */
  ancho?: "normal" | "angosto" | "completo";
  /**
   * El «Volver» de arriba. Las pantallas de «Más» ya traen «Volver a Más» solas; pasalo para un
   * paso interno (`{ texto: "Volver a los sectores", alTocar }`) o `false` para sacarlo.
   */
  volver?: { texto: string; alTocar: () => void } | false;
  className?: string;
  /** Va en el contenido (`<main>`). */
  testId?: string;
};

/** Una pantalla: encabezado + contenido con los márgenes de siempre. */
export function Pagina({ titulo, children, ancho = "normal", volver, className, testId }: PropsDePagina) {
  const { camino } = useRuta();
  const atras = volver === false ? null : volver ?? (esDeMas(camino) ? { texto: "Volver a Más", alTocar: () => ir("mas") } : null);
  return (
    <div className={clases("pagina", `pagina--${ancho}`, className)}>
      <Encabezado titulo={titulo} />
      <main className="pagina__contenido" data-testid={testId}>
        {atras && (
          <button type="button" className="pagina__volver" onClick={atras.alTocar} data-testid="volver">
            <Icono nombre="flecha-izquierda" tam={20} />{atras.texto}
          </button>
        )}
        {children}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- BarraDeAccion

/**
 * La acción de la pantalla siempre a mano: queda pegada abajo (arriba de la barra de pestañas
 * en el celular) mientras se desplaza, y al llegar al final ocupa su lugar: no tapa nada.
 * Va como último hijo de la pantalla o de la columna que la contiene.
 */
export function BarraDeAccion({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  const barra = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const b = barra.current;
    if (!b || typeof ResizeObserver === "undefined") return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty("--alto-barra-de-accion", `${b.offsetHeight}px`);
    const observador = new ResizeObserver(medir);
    observador.observe(b);
    medir();
    return () => { observador.disconnect(); raiz.style.removeProperty("--alto-barra-de-accion"); };
  }, []);
  return <div ref={barra} className={clases("barra-de-accion", className)} data-testid={testId}>{children}</div>;
}
