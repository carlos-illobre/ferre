import { useState, type ReactNode } from "react";

// Panel que se pliega y despliega con animación y una flecha que gira: se ve que se puede
// abrir y cerrar. Abierto por defecto salvo que se diga lo contrario.
export function Desplegable({ titulo, abiertoAlInicio = true, children, testId }: { titulo: ReactNode; abiertoAlInicio?: boolean; children: ReactNode; testId?: string }) {
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  return (
    <section className={`desplegable tarjeta ${abierto ? "abierto" : "cerrado"}`} data-testid={testId}>
      <button type="button" className="desplegable-titulo" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
        <span className="flecha" aria-hidden="true">▶</span>
        <span>{titulo}</span>
      </button>
      <div className="desplegable-cuerpo" aria-hidden={!abierto}>
        <div className="desplegable-interior">{children}</div>
      </div>
    </section>
  );
}
