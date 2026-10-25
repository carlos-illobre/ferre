import type { ReactNode } from "react";

// Encabezado y cuerpo de una pantalla de la computadora. `acciones` va a la derecha del título.
export function Pagina({ titulo, bajada, acciones, children, className, testId }: { titulo: string; bajada?: ReactNode; acciones?: ReactNode; children: ReactNode; className?: string; testId?: string }) {
  return (
    <main id="contenido" className={`pagina ${className ?? ""}`} data-testid={testId} tabIndex={-1}>
      <header className="pagina-cabeza">
        <h1>{titulo}</h1>
        {acciones}
        {bajada && <p className="bajada">{bajada}</p>}
      </header>
      {children}
    </main>
  );
}
