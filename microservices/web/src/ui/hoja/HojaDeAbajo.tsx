import { useEffect, type ReactNode } from "react";
import { useVolverCierra } from "../../plataforma/navegacion";
import { Icono } from "../iconos";
import { useComandos } from "../../plataforma/comandos";

// La hoja del celular: sube desde abajo. Cierra tocando el fondo, con el botón que le pase el
// contenido o con la acción «cerrar».

// Mientras haya alguna hoja abierta, la pantalla de atrás no se desplaza (001, «Lo de atrás queda
// quieto»): la página entera se traba y queda donde estaba. Se cuenta para las hojas apiladas.
let trabas = 0;
function useTrabarLoDeAtras() {
  useEffect(() => {
    if (trabas++ === 0) document.documentElement.classList.add("con-hoja");
    return () => { if (--trabas === 0) document.documentElement.classList.remove("con-hoja"); };
  }, []);
}

export function HojaDeAbajo({ titulo, extra, alCerrar, children, testId, clase }: { titulo?: ReactNode; extra?: ReactNode; alCerrar: () => void; children: ReactNode; testId?: string; clase?: string }) {
  // El botón de volver del celular cierra la hoja y deja la pantalla de abajo como estaba.
  useVolverCierra(alCerrar);
  useTrabarLoDeAtras();
  // Con varias hojas apiladas (la ficha y, encima, una explicación), cerrar cierra la de arriba.
  useComandos({ cerrar: alCerrar }, { encima: true });
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
