import { Aviso, Boton } from "../base/ui";
import type { Hecho } from "./useDuplicadosDeLaCompu";
import css from "./Duplicados.module.css";

// Lo último que se hizo, con «Deshacer» si se puede.
export function HechoDeDuplicados({ hecho, quieto, alDeshacer, alCerrar }: { hecho: Hecho; quieto: boolean; alDeshacer: (h: Hecho) => void; alCerrar: () => void }) {
  return (
    <div className={css.hecho} key={hecho.texto}>
      <Aviso tipo={hecho.tipo === "otro" ? "info" : "ok"} testId={hecho.tipo === "separacion" ? "mensaje-separar" : "mensaje"}
        accion={
          <span className={css.hechoBotones}>
            {hecho.deshacer && <Boton icono="deshacer" disabled={quieto} onClick={() => alDeshacer(hecho)} data-testid="deshacer">Deshacer</Boton>}
            <Boton icono="cerrar" aria-label="Cerrar el aviso" onClick={alCerrar} />
          </span>
        }>{hecho.texto}</Aviso>
    </div>
  );
}
