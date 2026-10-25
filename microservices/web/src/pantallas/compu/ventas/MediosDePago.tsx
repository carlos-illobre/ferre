import type { Medio } from "../../../negocio/ventas";
import { IconoDeMedio } from "../../IconoDeMedio";
import { MEDIOS } from "../../textos";
import { useEtiqueta } from "../../../plataforma/comandos";
import { Atajo } from "../base/ui";
import css from "./MediosDePago.module.css";

// Cómo paga: los cuatro medios, cada uno con su tecla, en la fila de «Cómo paga».
export function MediosDePago({ medio, alElegir }: { medio: Medio | null; alElegir: (m: Medio) => void }) {
  return (
    <>
      {MEDIOS.map((m) => <BotonDeMedio key={m.valor} m={m} elegido={medio === m.valor} alElegir={() => alElegir(m.valor)} />)}
    </>
  );
}

function BotonDeMedio({ m, elegido, alElegir }: { m: (typeof MEDIOS)[number]; elegido: boolean; alElegir: () => void }) {
  const accion = `vender.medio.${m.valor}`;
  return (
    <button type="button" role="radio" aria-checked={elegido} aria-keyshortcuts={useEtiqueta(accion)} className={`${css.medio} medio-${m.valor}`} title={m.nombre} aria-label={m.nombre} onClick={alElegir} data-testid={`medio-${m.valor}`}>
      <IconoDeMedio medio={m.valor} tam={18} />{m.corto}<Atajo accion={accion} kbd />
    </button>
  );
}
