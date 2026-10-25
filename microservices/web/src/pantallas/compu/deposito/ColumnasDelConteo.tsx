import { abreviarUnidad, conUnidad } from "../../../negocio/catalogo";
import { claseDeDiferencia, diferenciaDe, type Contado } from "../../../negocio/deposito";
import { TEXTOS } from "../../textos";
import { Explicado, Vacio, numero } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { FotoChica } from "./FotoChica";
import { conSigno } from "./deposito-comun";
import type { ConteoDeSector } from "./useConteoDeSector";
import css from "./Contar.module.css";

// Los contados (el último arriba, con su diferencia) al lado de los que faltan; tocar uno lo cuenta.
const t = TEXTOS.contar;

export function ColumnasDelConteo({ x }: { x: ConteoDeSector }) {
  const { conteo, id } = x;
  return (
    <div className={css.columnas}>
      <section aria-labelledby={`${id}-contados`}>
        <div className={css.colCab}><h3 id={`${id}-contados`} className={css.colTitulo}>{t.contados.largo} <span className={css.cuenta}>{conteo.renglones.length}</span></h3><span className="detalle">el último arriba</span></div>
        {conteo.renglones.length === 0 ? <Vacio icono="contar" titulo="Buscá o escaneá el primer producto">Empezá por una punta de la estantería y andá de a un producto.</Vacio> : (
          <ul className={css.renglones} data-testid="contados">{conteo.renglones.map((r) => <RenglonContado key={r.producto_id} x={x} r={r} />)}</ul>
        )}
      </section>
      <SinContar x={x} />
    </div>
  );
}

function RenglonContado({ x, r }: { x: ConteoDeSector; r: Contado }) {
  return (
    <li data-testid="contado" className={`${css.renglon} ${x.producto?.id === r.producto_id ? "elegido" : ""}`}>
      <button type="button" className={css.rBoton} onClick={() => x.elegirPorId(r.producto_id, r.descripcion)} aria-label={`${r.descripcion}: hay ${conUnidad(r.cantidad_contada, r.unidad)}. Corregir`}>
        <FotoChica id={r.producto_id} />
        <span className={css.rTexto}><b>{r.descripcion}</b><span>Contaste {conUnidad(r.cantidad_contada, r.unidad)} · había {numero(Number(r.stock_teorico))}{x.enElDispositivo.has(r.producto_id) && " · se manda al volver internet"}</span></span>
      </button>
      <Diferencia r={r} />
    </li>
  );
}

function Diferencia({ r }: { r: Contado }) {
  const dif = diferenciaDe(r);
  if (dif === 0) return <span className={`${css.dif} igual`} title="Coincide con el sistema"><b>=</b><small>igual</small></span>;
  return (
    <span className={`${css.dif} ${claseDeDiferencia(dif)}`}>
      <Explicado valor={conSigno(dif)} titulo={`Diferencia de ${r.descripcion}`} pasos={[`Según el sistema había ${conUnidad(r.stock_teorico, r.unidad)}.`, `Contaste ${conUnidad(r.cantidad_contada, r.unidad)}.`, `Diferencia: ${conSigno(dif)}. Al cerrar el sector se aplica al stock como un ajuste.`]} />
      <small>{Number.isInteger(dif) ? "ajusta" : abreviarUnidad(r.unidad || "unidad")}</small>
    </span>
  );
}

function SinContar({ x }: { x: ConteoDeSector }) {
  const { conteo, id } = x;
  return (
    <section aria-labelledby={`${id}-sin-contar`} data-testid="sin-contar">
      <div className={css.colCab}><h3 id={`${id}-sin-contar`} className={css.colTitulo}>{t.sinContar.largo} <span className={`${css.cuenta} urgente`}>{conteo.sin_contar.length}</span></h3><span className="detalle">tocá uno para contarlo</span></div>
      {conteo.sin_contar.length === 0 ? <p className="detalle">Ya contaste todo el sector.</p> : (
        <ul className={css.renglones}>
          {conteo.sin_contar.map((p) => (
            <li key={p.producto_id}>
              <button type="button" className={css.renglon} onClick={() => x.elegirPorId(p.producto_id, p.descripcion)} aria-label={`Contar ${p.descripcion}`}>
                <FotoChica id={p.producto_id} />
                <span className={css.rTexto}><b>{p.descripcion}</b><span>{[p.marca, `el sistema dice ${conUnidad(p.stock_teorico, p.unidad)}`].filter(Boolean).join(" · ")}</span></span>
                <Icono nombre="chevron-right" className={css.flecha} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
