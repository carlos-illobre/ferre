import { irASeccion } from "./piezas";
import type { Relacionado } from "./capitulos";

// A la derecha: un consejo del capítulo y los artículos relacionados.
export function Derecha({ consejo, relacionados }: { consejo: string; relacionados: Relacionado[] }) {
  return (
    <aside className="manual-derecha" aria-label="Para seguir">
      <div className="manual-caja manual-consejo">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" /></svg>
        <div><strong>Consejo</strong><p data-testid="manual-consejo">{consejo}</p></div>
      </div>
      <div className="manual-caja">
        <h2>Artículos relacionados</h2>
        {relacionados.map((r) => (
          <button key={r.id} type="button" className="manual-relacionado" onClick={() => irASeccion(r.id)} data-testid="manual-relacionado">
            <span className="manual-relacionado-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={r.icono} /></svg></span>
            <span><strong>{r.titulo}</strong><small>{r.detalle}</small></span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="manual-relacionado-flecha"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        ))}
      </div>
    </aside>
  );
}
