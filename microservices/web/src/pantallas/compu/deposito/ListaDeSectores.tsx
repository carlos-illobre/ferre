import { estadoDelSector, type Conteo, type Sector } from "../../../negocio/deposito";
import { fecha } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Boton, numero } from "../base/ui";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import type { Contar } from "./useContar";
import css from "./Contar.module.css";

// Los sectores con su estado (en curso, nunca contado, la fecha del último conteo) y «Nuevo».
const t = TEXTOS.contar;
const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const cuandoCorto = (iso: string) => (diasDesde(iso) === 0 ? "hoy" : diasDesde(iso) === 1 ? "ayer" : fecha(iso).slice(0, 5));
const ICONOS: Record<ReturnType<typeof estadoDelSector>, NombreDeIcono> = { "en-curso": "hash", nunca: "circle-dashed", contado: "check" };
const textoDe = (s: Sector) => (s.conteo_abierto ? t.enCurso.largo : s.ultimo_conteo === null ? t.nuncaContado.largo : `Contado el ${fecha(s.ultimo_conteo).slice(0, 5)}`);

export function ListaDeSectores({ x }: { x: Contar }) {
  return (
    <section className={css.sectores} aria-labelledby="ct-sectores">
      <div className={css.sectoresCab}>
        <h2 id="ct-sectores">{t.sectores.largo} <span className={css.cuenta}>{x.resumen.total}</span></h2>
        <Boton tam="chico" icono="mas" onClick={() => x.setNuevo(true)} disabled={!x.enLinea} data-testid="sector-nuevo">{t.nuevo.largo}</Boton>
      </div>
      <ul className={css.lista} data-testid="sectores">
        {x.ordenados.map((s) => <li key={s.id}><ElSector s={s} elegido={s.id === x.elegido?.id} abierto={x.conteo?.sector_id === s.id ? x.conteo : null} alElegir={() => x.setElegidoId(s.id)} /></li>)}
      </ul>
    </section>
  );
}

function ElSector({ s, elegido, abierto, alElegir }: { s: Sector; elegido: boolean; abierto: Conteo | null; alElegir: () => void }) {
  const clase = estadoDelSector(s);
  const texto = textoDe(s);
  return (
    <button type="button" className={`${css.sector} ${elegido ? "elegido" : ""}`} aria-current={elegido} onClick={alElegir} data-testid="sector" aria-label={`${s.nombre}: ${texto}`}>
      <span className={`${css.sectorIco} ${clase}`}><Icono nombre={ICONOS[clase]} /></span>
      <span className={css.sectorTexto}><b>{s.nombre}</b><span><em className={clase}>{texto}</em> · {abierto ? `${abierto.renglones.length} de ${abierto.renglones.length + abierto.sin_contar.length}` : numero(Number(s.productos))}</span></span>
      <span className={css.sectorCuando}>{abierto?.abierto_en ? cuandoCorto(abierto.abierto_en) : ""}</span>
    </button>
  );
}
