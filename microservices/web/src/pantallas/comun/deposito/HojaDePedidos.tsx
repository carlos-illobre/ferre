import type { ReactNode } from "react";
import { useComandos } from "../../../plataforma/comandos";
import { useVolverCierra } from "../../../plataforma/navegacion";
import css from "./Pedidos.module.css";

// La hoja de los pedidos, igual en las dos interfaces: se cierra (también desde el teclado), con «volver» o tocando afuera.
export function HojaDePedidos({ titulo, alCerrar, testId, children }: { titulo: string; alCerrar: () => void; testId: string; children: ReactNode }) {
  useVolverCierra(alCerrar);
  useComandos({ cerrar: alCerrar }, { encima: true });
  return (
    <div className={css.velo} onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className={css.hoja} role="dialog" aria-modal="true" aria-label={titulo} data-testid={testId}>
        <div className={css.fila}><h2 className={css.crece}>{titulo}</h2><button type="button" className={`${css.boton} chico`} onClick={alCerrar} aria-label="Cerrar">✕</button></div>
        {children}
      </div>
    </div>
  );
}
