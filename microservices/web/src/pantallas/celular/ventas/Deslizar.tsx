import type { ReactNode } from "react";
import { useAccionesDelLugar } from "../../../plataforma/comandos";
import { Icono } from "../componentes/base";
import { useDeslizarParaCobrar } from "./useDeslizarParaCobrar";
import css from "./Deslizar.module.css";

// Cobrar deslizando (decisión 119): la píldora de la v4 (decisión 143), «Cobrar» y el total
// (decisión 140), con un círculo que se arrastra hasta el final. El círculo también ofrece cobrar
// como acción de su lugar (con el teclado, sobre él).
type Props = { apagado: boolean; ocupado: boolean; alCobrar: () => Promise<void> | void; alTocar: () => void; children: ReactNode };

export function Deslizar({ apagado, ocupado, alCobrar, alTocar, children }: Props) {
  const d = useDeslizarParaCobrar({ apagado, ocupado, alCobrar, alTocar });
  useAccionesDelLugar(d.pulgar, { "campo.listo": () => void d.cobrar() });
  return (
    <div ref={d.caja} className={`${css.deslizar} ${apagado ? css.apagado : ""}`} data-testid="cobrar">
      <button ref={d.pulgar} type="button" className={css.pulgar} style={{ transform: `translateX(${d.x}px)`, transition: d.arrastrando ? "none" : undefined }} disabled={apagado}
        aria-label="Cobrar: deslizá hasta el final" data-testid="cobrar-pulgar"
        onPointerDown={d.bajar} onPointerMove={d.moverDedo} onPointerUp={d.soltar} onPointerCancel={d.soltar} onClick={d.tocar}>
        <Icono nombre={ocupado ? "tilde" : "flecha"} tam={22} grosor={2.4} />
      </button>
      <span className={css.texto} style={{ opacity: d.opacidad }}>{children}</span>
    </div>
  );
}
