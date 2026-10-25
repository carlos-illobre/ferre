import { useId, useState, type ReactNode } from "react";
import { Icono } from "./iconos";

// Panel que se pliega y se despliega con animación. Arranca abierto: se ve que tiene contenido.
export function Plegable({ titulo, extra, abiertoAlInicio = true, children, testId, relleno = true }: { titulo: ReactNode; extra?: ReactNode; abiertoAlInicio?: boolean; children: ReactNode; testId?: string; relleno?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  const id = useId();
  return (
    <section className={`plegable ${abierto ? "abierto" : ""}`} data-testid={testId}>
      <h2 style={{ font: "inherit" }}>
        <button type="button" className="plegable-titulo" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-controls={id}>
          <span className="flecha" aria-hidden="true"><Icono nombre="derecha" tam={16} grosor={2.6} /></span>
          <span>{titulo}</span>
          {extra && <span className="extra">{extra}</span>}
        </button>
      </h2>
      <div className="plegable-cuerpo" id={id}>
        <div className="plegable-interior"><div className={relleno ? "plegable-relleno" : ""}>{children}</div></div>
      </div>
    </section>
  );
}
