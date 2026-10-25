import { useVolverCierra } from "../../../plataforma/navegacion/volver";
import { Children, useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import { Buscador, Contador, Exito, Segmentos, Toast } from "../../../ui";

// Piezas del sistema visual (docs/sistema-visual.md, rediseño de mockups/Ferre iOS.html): íconos de
// trazo, hoja que sube desde abajo, avisos, segmentos, buscador, contador de cantidad,
// pantalla de éxito. Mismas piezas en el celular y en la computadora.

// Los íconos son uno solo para toda la aplicación (ADR-028).
export { Icono, type NombreDeIcono, Toast, Exito, Segmentos, Contador, Buscador };

// Hoja: en el celular sube desde abajo; en la computadora es una ventana centrada. Cierra
// tocando el fondo, con Escape o con el botón que le pase el contenido.
const hojasAbiertas: (() => void)[] = [];
// Mientras haya alguna hoja abierta, la pantalla de atrás no se desplaza (001, «Lo de atrás queda
// quieto»): la página entera se traba y queda donde estaba. Se cuenta para las hojas apiladas.
let trabas = 0;
function useTrabarLoDeAtras() {
  useEffect(() => {
    if (trabas++ === 0) document.documentElement.classList.add("con-hoja");
    return () => { if (--trabas === 0) document.documentElement.classList.remove("con-hoja"); };
  }, []);
}
export function Hoja({ titulo, extra, alCerrar, children, testId, clase }: { titulo?: ReactNode; extra?: ReactNode; alCerrar: () => void; children: ReactNode; testId?: string; clase?: string }) {
  // El botón de volver del celular cierra la hoja y deja la pantalla de abajo como estaba.
  useVolverCierra(alCerrar);
  useTrabarLoDeAtras();
  useEffect(() => {
    // Con varias hojas apiladas (la ficha y, encima, una explicación), Escape cierra la de arriba.
    hojasAbiertas.push(alCerrar);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && hojasAbiertas[hojasAbiertas.length - 1] === alCerrar) { e.stopPropagation(); alCerrar(); } };
    window.addEventListener("keydown", tecla, true);
    return () => { window.removeEventListener("keydown", tecla, true); const i = hojasAbiertas.lastIndexOf(alCerrar); if (i >= 0) hojasAbiertas.splice(i, 1); };
  }, [alCerrar]);
  return (
    <div className="hoja-fondo" onClick={alCerrar} role="presentation">
      <div className={`hoja ${clase ?? ""}`} role="dialog" aria-label={typeof titulo === "string" ? titulo : undefined} onClick={(e) => e.stopPropagation()} data-testid={testId}>
        <div className="manija" aria-hidden="true" />
        {/* Con título, la «×» para cerrar arriba a la derecha, como la v2 (decisión 143). */}
        {titulo !== undefined && <div className="titulo-hoja"><span>{titulo}</span>{extra}<button type="button" className="hoja-cerrar" onClick={alCerrar} aria-label="Cerrar" data-testid="cerrar-hoja"><Icono nombre="cerrar" tam={20} grosor={2.4} /></button></div>}
        {children}
      </div>
    </div>
  );
}


export function AvisoError({ texto, alCerrar }: { texto: string | null | undefined; alCerrar?: () => void }) {
  if (!texto) return null;
  return (
    <div className="aviso-error" role="alert">
      <span>{texto}</span>
      {alCerrar && <button type="button" onClick={alCerrar}>Cerrar</button>}
    </div>
  );
}





export function Pasos({ pasos }: { pasos: string[] }) {
  return (
    <ol className="pasos">
      {pasos.map((p, i) => <li key={i}><span className="n">{i + 1}</span><span>{p}</span></li>)}
    </ol>
  );
}

export function Miniatura({ url }: { url?: string | null }) {
  return <span className="miniatura">{url ? <img src={url} alt="" /> : null}</span>;
}

// Un listado (decisión: HTML semántico, docs/sistema-visual.md): una lista `ul` con un `li` por
// renglón, para que un lector de pantalla diga que es una lista y cuántos tiene. Se ve igual
// que antes: el renglón sigue siendo el botón o la fila de adentro.
export function Lista({ children, className, ...resto }: HTMLAttributes<HTMLUListElement> & { "data-testid"?: string }) {
  return (
    <ul className={`lista ${className ?? ""}`.trim()} {...resto}>
      {Children.map(children, (renglon) => (renglon === null || renglon === undefined || renglon === false || renglon === "" ? null : <li>{renglon}</li>))}
    </ul>
  );
}
