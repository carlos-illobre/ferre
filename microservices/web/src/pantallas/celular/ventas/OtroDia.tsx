import { useState } from "react";
import { hoyLocal, ultimosSieteDias, useResumenDeOtroDia } from "../../../negocio/ventas";
import { Calendario } from "../../Calendario";
import { TEXTOS } from "../../textos";
import { detalleParaElegir, nombreParaElegir } from "../../comun/ventas/textos-del-dia";
import { Hoja, Icono } from "../componentes/base";
import css from "./VentasDelDia.module.css";

// «Otro día», como la v2 (decisión 141): hoy y los seis días anteriores, cada uno con lo vendido y
// cuántas ventas, el que se mira con un tilde; al final, el calendario propio para ir más atrás.
const t = TEXTOS.hoy;

export function OtroDia({ dia, alElegir, alCerrar }: { dia: string; alElegir: (dia: string) => void; alCerrar: () => void }) {
  const [conCalendario, setConCalendario] = useState(false);
  const hoy = hoyLocal();
  return (
    <Hoja titulo={t.otroDia.corto} alCerrar={alCerrar} testId="hoja-otro-dia">
      <p className={css.hojaDetalle}>{t.queDiaMirar.corto}</p>
      {conCalendario ? <Calendario elegido={dia} hasta={hoy} hoy={hoy} alElegir={alElegir} /> : <>
        <div className={css.dias}>{ultimosSieteDias(hoy).map((d, i) => <DiaParaElegir key={d} dia={d} cual={i === 0 ? "hoy" : i === 1 ? "ayer" : null} elegido={d === dia} alElegir={() => alElegir(d)} />)}</div>
        <button type="button" className={`${css.dia} ${css.diaCalendario}`} onClick={() => setConCalendario(true)} data-testid="elegir-en-calendario">
          <Icono nombre="calendario" tam={20} /><span>{t.elegirEnElCalendario.corto}<small>{t.masAtras.corto}</small></span><Icono nombre="derecha" tam={18} />
        </button>
      </>}
    </Hoja>
  );
}

// Un día de la lista: su nombre y, cuando llega, lo vendido y cuántas ventas.
function DiaParaElegir({ dia, cual, elegido, alElegir }: { dia: string; cual: "hoy" | "ayer" | null; elegido: boolean; alElegir: () => void }) {
  const resumen = useResumenDeOtroDia(dia, cual === "hoy");
  return (
    <button type="button" className={`${css.dia} ${elegido ? "elegido" : ""}`} aria-pressed={elegido} onClick={alElegir} data-testid={`otro-dia-${dia}`}>
      <Icono nombre="calendario" tam={20} /><span>{nombreParaElegir(dia, cual, "corto")}<small>{detalleParaElegir(resumen, cual === "hoy", "corto")}</small></span>{elegido && <Icono nombre="tilde" tam={18} grosor={2.6} />}
    </button>
  );
}
