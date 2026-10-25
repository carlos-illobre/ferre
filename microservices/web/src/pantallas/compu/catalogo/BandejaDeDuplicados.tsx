import { Icono } from "../base/ui";
import type { DuplicadosDeLaCompu, Motivo } from "./useDuplicadosDeLaCompu";
import css from "./Duplicados.module.css";

// A la izquierda, la cola: los filtros por motivo y una fila por sugerencia, con cuándo llegó.
export function BandejaDeDuplicados({ x }: { x: DuplicadosDeLaCompu }) {
  const porCodigo = x.todas.filter((s) => s.motivo === "codigo_barras").length;
  const chips: [Motivo, string, number][] = [["todas", "Todas", x.todas.length], ["codigo_barras", "Código", porCodigo], ["descripcion", "Texto", x.todas.length - porCodigo]];
  return (
    <div className={css.bandeja}>
      <div className={css.chips} role="tablist" aria-label="Qué sugerencias ver">
        {chips.map(([valor, nombre, n]) => (
          <button key={valor} type="button" role="tab" aria-selected={x.motivo === valor} className={css.chip} onClick={() => x.elegirMotivo(valor)}>{nombre} ({n})</button>
        ))}
      </div>
      {x.sugerencias === null ? (x.error ? null : <div className={`esqueleto ${css.esqueleto}`} role="status" aria-label="Cargando las sugerencias" />) : <LaCola x={x} />}
    </div>
  );
}

function LaCola({ x }: { x: DuplicadosDeLaCompu }) {
  return (
    <ul className={css.cola} data-testid="sugerencias-duplicados">
      {x.cola.map((s, i) => (
        <li key={s.id}>
          <button type="button" className={`${css.sug} ${i === x.elegida.posicion ? "foco" : ""}`} aria-current={i === x.elegida.posicion} onClick={() => x.elegida.setElegidaId(s.id)} data-testid="sugerencia">
            <span className={css.foto} aria-hidden="true"><Icono nombre="productos" tam={18} /></span>
            <span className={css.n}>{s[x.elegida.conservar(s)].descripcion}</span>
            <span className={css.d}><Icono nombre={s.motivo === "codigo_barras" ? "codigo-de-barras" : "texto"} tam={16} />{[s.a.proveedor, s.b.proveedor].map((p) => p ?? "Sin proveedor").join(" · ")}</span>
            <span className={css.cuando}>{cuandoLlego(s.creado_en)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// «hoy», «ayer» o «14/10»: cuándo llegó la sugerencia.
function cuandoLlego(iso: string): string {
  const d = new Date(iso);
  const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  return dias === 0 ? "hoy" : dias === 1 ? "ayer" : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
