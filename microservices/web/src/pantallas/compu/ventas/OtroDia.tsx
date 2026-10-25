import { useState } from "react";
import { hoyLocal, ultimosSieteDias, useResumenDeOtroDia } from "../../../negocio/ventas";
import { Calendario } from "../../Calendario";
import { TEXTOS } from "../../textos";
import { detalleParaElegir, nombreParaElegir } from "../../comun/ventas/textos-del-dia";
import { Hoja, Icono } from "../base/ui";
import css from "./VentasDelDia.module.css";

// «Otro día», como la v2 y el celular (decisiones 141 y 144): hoy y los seis días anteriores, cada uno
// con lo vendido y cuántas ventas, el que se mira con un tilde; al final, el calendario propio.
const t = TEXTOS.hoy;

export function OtroDia({ dia, alElegir, alCerrar }: { dia: string; alElegir: (dia: string) => void; alCerrar: () => void }) {
  const [conCalendario, setConCalendario] = useState(false);
  const hoy = hoyLocal();
  return (
    <Hoja titulo={t.otroDia.largo} alCerrar={alCerrar} testId="hoja-otro-dia">
      <p className={css.otroDetalle}>{t.queDiaMirar.largo}</p>
      {conCalendario ? <Calendario elegido={dia} hasta={hoy} hoy={hoy} alElegir={alElegir} /> : <>
        <div className={css.dias}>{ultimosSieteDias(hoy).map((d, i) => <DiaParaElegir key={d} dia={d} cual={i === 0 ? "hoy" : i === 1 ? "ayer" : null} elegido={d === dia} alElegir={() => alElegir(d)} />)}</div>
        <button type="button" className={`${css.dia} ${css.diaCalendario}`} onClick={() => setConCalendario(true)} data-testid="elegir-en-calendario">
          <Icono nombre="calendario" /><span>{t.elegirEnElCalendario.largo}<small>{t.masAtras.largo}</small></span><Icono nombre="derecha" />
        </button>
      </>}
    </Hoja>
  );
}

function DiaParaElegir({ dia, cual, elegido, alElegir }: { dia: string; cual: "hoy" | "ayer" | null; elegido: boolean; alElegir: () => void }) {
  const resumen = useResumenDeOtroDia(dia, cual === "hoy");
  return (
    <button type="button" className={`${css.dia} ${elegido ? "elegido" : ""}`} aria-pressed={elegido} onClick={alElegir} data-testid={`otro-dia-${dia}`}>
      <Icono nombre="calendario" /><span>{nombreParaElegir(dia, cual, "largo")}<small>{detalleParaElegir(resumen, cual === "hoy", "largo")}</small></span>{elegido && <Icono nombre="tilde" />}
    </button>
  );
}
