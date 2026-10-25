import { estadoDelSector, type Sector } from "../../../negocio/deposito";
import { fecha } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./Contar.module.css";

// Lo que toca hoy (todavía no) y los sectores con su estado; el que está en curso va arriba, aparte.
const tc = TEXTOS.contar;
const ICONOS = { "en-curso": "pause", nunca: "circle-dashed", contado: "check" } as const;
const textoDe = (s: Sector) => (s.conteo_abierto ? tc.enCurso.corto : s.ultimo_conteo === null ? tc.nuncaContado.corto : `Contado el ${fecha(s.ultimo_conteo).slice(0, 5)}`);
type Props = { ordenados: Sector[]; enCurso: Sector | null; alAbrir: (id: string) => void; alNuevo: () => void };

export function SectoresDelCelular({ ordenados, enCurso, alAbrir, alNuevo }: Props) {
  const contados = ordenados.filter((s) => s.ultimo_conteo !== null).length;
  return (
    <>
      <div className={css.hoy} data-testid="hoy-toca">
        <div className={css.hoyCab}><Icono nombre="calendar-check" /><b>{tc.hoyTocaContar.corto} —</b></div>
        <span className={css.riel} />
      </div>
      <div className={css.cab}><h2>{tc.sectores.corto}</h2><span>{contados} de {ordenados.length} contados</span>
        <button type="button" className={css.mas} onClick={alNuevo} aria-label="Sector nuevo" data-testid="sector-nuevo"><Icono nombre="plus" /></button></div>
      <ul className={css.lista} data-testid="sectores">
        {ordenados.filter((s) => s.id !== enCurso?.id).map((s) => {
          const clase = estadoDelSector(s);
          return (
            <li key={s.id}>
              <button type="button" className={css.sector} onClick={() => alAbrir(s.id)} data-testid="sector">
                <span className={`${css.ico} ${clase}`}><Icono nombre={ICONOS[clase]} /></span>
                <span className={css.texto}><b>{s.nombre}</b><span><em className={clase}>{textoDe(s)}</em> · {s.productos}</span></span>
                <Icono nombre="chevron-right" className={css.flecha} />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
