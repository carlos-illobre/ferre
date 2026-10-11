import { useEffect, useRef, useState, type ReactNode } from "react";
import { YO } from "../datos";
import { useConexion } from "../estructura/conexion";
import { ACCIONES_DE_USUARIO, esDeMas } from "../estructura/destinos";
import { ir, useRuta } from "../ruta";
import { Iniciales, clases } from "./basicas";
import { EstadosDeMaqueta, type EstadoDeMaqueta } from "./EstadosDeMaqueta";
import { Hoja } from "./hojas";
import { Icono } from "./Icono";

// ---------------------------------------------------------------- Encabezado

/** El estado de la conexión: uno solo, en el encabezado. O «Todo guardado» o «Sin conexión · N cambios por enviar». */
function Conexion() {
  const { enLinea, porEnviar } = useConexion();
  if (enLinea) {
    return <p className="conexion conexion--bien"><Icono nombre="guardado" tam={22} /><span>Todo guardado</span></p>;
  }
  const cambios = porEnviar === 1 ? "1 cambio por enviar" : `${porEnviar} cambios por enviar`;
  return <p className="conexion conexion--sin" role="status"><Icono nombre="sin-conexion" tam={20} /><span>Sin conexión · {cambios}</span></p>;
}

/** El avatar del celular: abre una hoja con «Usuarios y sesiones» y «Salir». En la computadora eso está en el menú lateral. */
function AvatarDelCelular() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className="encabezado__avatar" aria-label={`${YO.nombre}, ${YO.rol}. Abrir el menú de usuario`} onClick={() => setAbierto(true)}>
        <Iniciales nombre={YO.nombre} tono="avatar" />
      </button>
      <Hoja abierta={abierto} alCerrar={() => setAbierto(false)} titulo={`${YO.nombre} · ${YO.rol}`}>
        <p className="hoja__nota">{YO.correo}</p>
        <div className="hoja__opciones">
          {ACCIONES_DE_USUARIO.map((a) => (
            <button key={a.clave} type="button" className={a.clave === "salir" ? "hoja__opcion hoja__opcion--peligro" : "hoja__opcion"} onClick={() => { setAbierto(false); a.alTocar(); }}>
              <Icono nombre={a.icono} />{a.nombre}
            </button>
          ))}
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
  /** Los estados que se pueden ver con «Maqueta: ver estado». El primero es `{ clave: "normal", … }`. */
  estados?: EstadoDeMaqueta[];
  /**
   * El «Volver» de arriba. Las pantallas de «Más» ya traen «Volver a Más» solas; pasalo para un
   * paso interno (`{ texto: "Volver a los sectores", alTocar }`) o `false` para sacarlo.
   */
  volver?: { texto: string; alTocar: () => void } | false;
  className?: string;
};

/** Una pantalla: encabezado + contenido con los márgenes de siempre. */
export function Pagina({ titulo, children, ancho = "normal", estados, volver, className }: PropsDePagina) {
  const { camino } = useRuta();
  const atras = volver === false ? null : volver ?? (esDeMas(camino) ? { texto: "Volver a Más", alTocar: () => ir("mas") } : null);
  return (
    <div className={clases("pagina", `pagina--${ancho}`, className)}>
      <Encabezado titulo={titulo} />
      <main className="pagina__contenido">
        {atras && (
          <button type="button" className="pagina__volver" onClick={atras.alTocar}>
            <Icono nombre="flecha-izquierda" tam={20} />{atras.texto}
          </button>
        )}
        {children}
      </main>
      {estados && <EstadosDeMaqueta estados={estados} />}
    </div>
  );
}

// ---------------------------------------------------------------- BarraDeAccion

/**
 * La acción de la pantalla siempre a mano: queda pegada abajo (arriba de la barra de pestañas
 * en el celular) mientras se desplaza, y al llegar al final ocupa su lugar: no tapa nada.
 * Va como último hijo de la pantalla o de la columna que la contiene.
 */
export function BarraDeAccion({ children, className }: { children: ReactNode; className?: string }) {
  const barra = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const b = barra.current;
    if (!b) return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty("--alto-barra-de-accion", `${b.offsetHeight}px`);
    const observador = new ResizeObserver(medir);
    observador.observe(b);
    medir();
    return () => { observador.disconnect(); raiz.style.removeProperty("--alto-barra-de-accion"); };
  }, []);
  return <div ref={barra} className={clases("barra-de-accion", className)}>{children}</div>;
}
