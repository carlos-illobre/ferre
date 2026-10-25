import type { Medio } from "../../../negocio/ventas";
import { IconoDeMedio } from "../../IconoDeMedio";
import { MEDIOS } from "../../textos";
import css from "./MediosDePago.module.css";

// Cómo paga: los cuatro medios, cada uno con su tecla (F5 a F8), en la fila de «Cómo paga».
export function MediosDePago({ medio, alElegir }: { medio: Medio | null; alElegir: (m: Medio) => void }) {
  return (
    <>
      {MEDIOS.map((m) => (
        <button key={m.valor} type="button" role="radio" aria-checked={medio === m.valor} aria-keyshortcuts={m.tecla} className={`${css.medio} medio-${m.valor}`} title={m.nombre} aria-label={m.nombre} onClick={() => alElegir(m.valor)} data-testid={`medio-${m.valor}`}>
          <IconoDeMedio medio={m.valor} tam={18} />{m.corto}<kbd className="tecla">{m.tecla}</kbd>
        </button>
      ))}
    </>
  );
}
