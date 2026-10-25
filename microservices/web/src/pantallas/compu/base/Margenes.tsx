import { MARGENES } from "../../../negocio/precios";
import { useEtiqueta } from "../../../plataforma/comandos";

// `accionDe`: la acción que fija cada margen desde la pantalla (para mostrar su tecla en el título).
// `flechasDeAfuera`: el grupo no se recorre solo: lo recorre quien lo contiene (la ficha).
type Props = { elegido: number | null; alElegir: (m: number) => void; disabled?: boolean; etiqueta?: string; accionDe?: (i: number) => string; compacto?: boolean; flechasDeAfuera?: boolean; sinSigno?: boolean };

const textoDelMargen = (m: number, sinSigno?: boolean, compacto?: boolean) => `${m}${sinSigno ? "" : `${compacto ? "" : " "}%`}`;

type DelBoton = { m: number; i: number; elegido: boolean; conFoco: boolean; alElegir: (m: number) => void } & Pick<Props, "disabled" | "accionDe" | "compacto" | "sinSigno">;
function BotonDeMargen({ m, i, elegido, conFoco, alElegir, disabled, accionDe, compacto, sinSigno }: DelBoton) {
  const tecla = useEtiqueta(accionDe?.(i) ?? "");
  return (
    <button type="button" role="radio" aria-checked={elegido} tabIndex={conFoco ? 0 : -1} disabled={disabled} title={tecla}
      onClick={(e) => { e.stopPropagation(); alElegir(m); }} aria-label={sinSigno ? `${m} %` : undefined} data-testid={`margen-${m}`}>{textoDelMargen(m, sinSigno, compacto)}</button>
  );
}

// Los cinco márgenes de un toque. Es un grupo de opciones: Tab entra una vez y se recorre de un
// margen a otro (eligiéndolo) como cualquier grupo de opciones.
export function Margenes({ elegido, alElegir, disabled, etiqueta = "Margen", accionDe, compacto, flechasDeAfuera, sinSigno }: Props) {
  const conFoco = MARGENES.includes(elegido as never) ? elegido : MARGENES[0];
  return (
    <div className={`margenes ${compacto ? "compacto" : ""}`} role="radiogroup" aria-label={etiqueta} data-margenes data-flechas-de-afuera={flechasDeAfuera ? "" : undefined}>
      {MARGENES.map((m, i) => <BotonDeMargen key={m} m={m} i={i} elegido={elegido === m} conFoco={m === conFoco} alElegir={alElegir} disabled={disabled} accionDe={accionDe} compacto={compacto} sinSigno={sinSigno} />)}
    </div>
  );
}
