import { Children, type HTMLAttributes } from "react";

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

// Pasos numerados: 1, 2, 3.
export function Pasos({ pasos }: { pasos: string[] }) {
  return (
    <ol className="pasos">
      {pasos.map((p, i) => <li key={i}><span className="n">{i + 1}</span><span>{p}</span></li>)}
    </ol>
  );
}

// La foto chica de un renglón; sin foto, el cuadro vacío.
export function Miniatura({ url }: { url?: string | null }) {
  return <span className="miniatura">{url ? <img src={url} alt="" /> : null}</span>;
}
