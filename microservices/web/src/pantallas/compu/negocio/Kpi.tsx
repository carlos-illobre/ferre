import { useState, type ReactNode } from "react";
import { Boton, Hoja } from "../base/ui";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import css from "./Resumen.module.css";

// Un número de arriba: ícono y rótulo, el número grande y la comparación en una pastilla. Si el
// número se explica, se toca (el número o la «i» de la esquina) y dice de dónde sale.
export function Kpi({ icono, rotulo, valor, comp, principal, pasos, titulo, testId }: { icono: NombreDeIcono; rotulo: string; valor: ReactNode; comp: ReactNode; principal?: boolean; pasos?: string[] | null; titulo?: string; testId: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className={`${css.kpi} ${principal ? "principal" : ""}`} data-testid={testId}>
      <div className={css.kpiCab}><span className={css.kpiIco}><Icono nombre={icono} tam={16} /></span><span className={css.etiqueta}>{rotulo}</span></div>
      {pasos ? (
        <>
          <button type="button" className={css.explica} aria-label={`${rotulo}. Ver de dónde sale`} aria-haspopup="dialog" onClick={() => setAbierta(true)} data-testid="explicacion">
            <span className={css.va}>{valor}</span><span className={css.explicaI}><Icono nombre="info" tam={16} /></span>
          </button>
          {abierta && (
            <Hoja titulo={titulo ?? `De dónde sale ${rotulo}`} alCerrar={() => setAbierta(false)} testId="hoja-explicacion" pie={<Boton variante="marino" onClick={() => setAbierta(false)}>Entendido</Boton>}>
              <ol className="pasos">{pasos.map((p, i) => <li key={i}><span>{p}</span></li>)}</ol>
            </Hoja>
          )}
        </>
      ) : <div className={css.va}>{valor}</div>}
      <div className={css.comp}>{comp}</div>
    </div>
  );
}
