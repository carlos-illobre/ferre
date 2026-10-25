import { useId, type ReactNode } from "react";
import { Boton } from "../Boton";
import { useDialogo } from "../dialogo";

type Props = { titulo: ReactNode; alCerrar: () => void; children: ReactNode; pie?: ReactNode; ancha?: boolean; testId?: string; foto?: ReactNode; sobreTitulo?: ReactNode; bajoTitulo?: ReactNode };

// La hoja de la computadora: una ventana sobre lo que se está haciendo. Usa <dialog>: el navegador
// encierra el foco, lo devuelve al cerrar y cierra con Escape.
// `foto`, `sobreTitulo` y `bajoTitulo` arman un encabezado más rico (la ficha del producto, specs/016):
// la foto a la izquierda y, alrededor del título, una etiqueta y un renglón de detalle.
export function Ventana({ titulo, alCerrar, children, pie, ancha, testId, foto, sobreTitulo, bajoTitulo }: Props) {
  const ref = useDialogo(alCerrar);
  const idTitulo = useId();
  return (
    <dialog ref={ref} className={`hoja ${ancha ? "ancha" : ""}`} aria-labelledby={idTitulo} data-testid={testId}
      onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className={`hoja-cabeza ${foto ? "con-foto" : ""}`}>
        {foto}
        {sobreTitulo || bajoTitulo ? <div className="hoja-titulos">{sobreTitulo}<h2 id={idTitulo}>{titulo}</h2>{bajoTitulo}</div> : <h2 id={idTitulo}>{titulo}</h2>}
        <Boton icono="cerrar" aria-label="Cerrar" onClick={alCerrar} />
      </div>
      <div className="hoja-cuerpo">
        {children}
        {pie && <div className="hoja-pie">{pie}</div>}
      </div>
    </dialog>
  );
}
