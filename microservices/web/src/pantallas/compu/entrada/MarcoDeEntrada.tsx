import type { ReactNode } from "react";
import { Icono, Marca } from "../base/ui";
import { QUE_HACE } from "../../comun/entrada/textos-de-entrada";

// El marco de la entrada: la marca sobre azul marino y, sobre blanco, lo que hay que hacer.
// Lo usa la página que abre el celular al leer el código de la computadora para vincularse.
export function MarcoDeEntrada({ titulo, bajada, conPuntos, children, testId }: { titulo: string; bajada: string; conPuntos?: boolean; children: ReactNode; testId?: string }) {
  return (
    <main className="entrar" data-testid={testId}>
      <CintaMetrica />
      <section className="entrar-marca">
        <Marca tam={44} />
        <h1>{titulo}</h1>
        <p className="entrar-bajada">{bajada}</p>
        {conPuntos && (
          <ul className="entrar-puntos">
            {QUE_HACE.map((q) => <li key={q.icono}><span><Icono nombre={q.icono} tam={18} /></span>{q.texto}</li>)}
          </ul>
        )}
      </section>
      <section className="entrar-puerta">{children}</section>
    </main>
  );
}

// La firma de la marca: el ámbar es el de la cinta métrica, con sus rayas.
function CintaMetrica() {
  return (
    <svg className="entrar-cinta" width="100%" height="18" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="entrar-rayas" width="80" height="18" patternUnits="userSpaceOnUse">
          <path d="M.5 0v18M8.500 0v5M16.500 0v5M24.500 0v5M32.500 0v5M40.500 0v10M48.500 0v5M56.500 0v5M64.500 0v5M72.500 0v5" stroke="var(--tinta)" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="18" fill="var(--ambar)" />
      <rect width="100%" height="18" fill="url(#entrar-rayas)" />
    </svg>
  );
}
