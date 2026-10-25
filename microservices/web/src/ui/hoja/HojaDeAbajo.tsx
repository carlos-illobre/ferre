import { useEffect, type ReactNode } from "react";
import { useVolverCierra } from "../../plataforma/navegacion";
import { Icono } from "../iconos";

// La hoja del celular: sube desde abajo. Cierra tocando el fondo, con Escape o con el botón que
// le pase el contenido.
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

// Con varias hojas apiladas (la ficha y, encima, una explicación), Escape cierra la de arriba.
function useEscapeCierraLaDeArriba(alCerrar: () => void) {
  useEffect(() => {
    hojasAbiertas.push(alCerrar);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && hojasAbiertas[hojasAbiertas.length - 1] === alCerrar) { e.stopPropagation(); alCerrar(); } };
    window.addEventListener("keydown", tecla, true);
    return () => { window.removeEventListener("keydown", tecla, true); const i = hojasAbiertas.lastIndexOf(alCerrar); if (i >= 0) hojasAbiertas.splice(i, 1); };
  }, [alCerrar]);
}

export function HojaDeAbajo({ titulo, extra, alCerrar, children, testId, clase }: { titulo?: ReactNode; extra?: ReactNode; alCerrar: () => void; children: ReactNode; testId?: string; clase?: string }) {
  // El botón de volver del celular cierra la hoja y deja la pantalla de abajo como estaba.
  useVolverCierra(alCerrar);
  useTrabarLoDeAtras();
  useEscapeCierraLaDeArriba(alCerrar);
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
