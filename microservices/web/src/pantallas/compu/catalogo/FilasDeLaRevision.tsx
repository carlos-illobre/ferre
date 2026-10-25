import { mensajeDeLista, useFilasDeLista, type Cargada } from "../../../negocio/catalogo";
import { numero } from "../../../negocio/formato";
import { Aviso, Boton } from "../base/ui";
import type { FiltroDeRevision } from "./FiltrosDeLaRevision";
import { Previa } from "./Previa";
import css from "./Listas.module.css";

// La tabla de la lista (de a tandas de 200) o, con «Salteadas», las filas que no se pudieron leer.
const TANDA = 200;

export function FilasDeLaRevision({ cargada, filtro }: { cargada: Cargada; filtro: FiltroDeRevision }) {
  if (filtro === "salteadas") return <Salteadas cargada={cargada} />;
  return <LaPrevia cargada={cargada} />;
}

function LaPrevia({ cargada }: { cargada: Cargada }) {
  const { filas, total, error, trayendo, traerMas } = useFilasDeLista(cargada.id);
  const motivo = error && mensajeDeLista(error);
  const faltan = filas ? total - filas.length : 0;
  const mas = faltan > 0 ? <Boton tam="chico" className={css.masFilas} disabled={trayendo} onClick={traerMas} data-testid="mas-filas">{trayendo ? "Trayendo más…" : `Mostrar ${numero(Math.min(TANDA, faltan))} más de ${numero(total)}`}</Boton> : null;
  return (
    <>
      <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={traerMas}>Reintentar</Boton>}>{motivo && `No se pudo traer la vista previa. ${motivo}`}</Aviso>
      {filas === null ? (motivo ? null : <div className={`esqueleto ${css.tabla}`} role="status" aria-label="Cargando la vista previa" />) : <Previa filas={filas} mas={mas} />}
    </>
  );
}

function Salteadas({ cargada }: { cargada: Cargada }) {
  return (
    <div className={css.tabla} data-testid="salteadas">
      {cargada.salteadas.length === 0 ? <p className={css.nada}>No se salteó ninguna fila.</p> : (
        <ul className={css.salteadas}>
          {cargada.salteadas.map((s) => (
            <li key={s.fila}><span className={css.salteadaFila}>Fila {numero(s.fila)}</span><span><strong>{s.motivo}</strong>{s.contenido.some(Boolean) && <span className="detalle"> · {s.contenido.filter(Boolean).join(" | ")}</span>}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
