import { CATEGORIAS } from "../../comun/negocio/actividad-en-palabras";
import { Icono } from "../../../ui/iconos";
import { enPalabras } from "./TotalDelRegistro";
import type { ActividadDeLaCompu } from "./useActividadDeLaCompu";
import css from "./Actividad.module.css";

// «Qué pasó»: cuántas de cada tipo en el período, con una barrita; tocar una filtra por ese tipo.
const ancho = (n: number | null, max: number) => `${n ? Math.max(6, (n / max) * 56) : 0}px`;

export function QuePaso({ x }: { x: ActividadDeLaCompu }) {
  const { filtros, todas, porTipo } = x;
  const max = Math.max(1, todas ?? 1);
  const otras = todas !== null && porTipo.every((n) => n !== null) ? todas - porTipo.reduce<number>((s, n) => s + (n ?? 0), 0) : null;
  return (
    <section className={css.caja} aria-labelledby="av2-que-paso" data-testid="que-paso">
      <h3 id="av2-que-paso">Qué pasó {enPalabras(filtros)}<small>tocá para filtrar</small></h3>
      <div className={css.barras}>
        {CATEGORIAS.map((c, i) => (
          <button key={c.tipo} type="button" className={`${css.b} ${c.tono ?? ""} ${filtros.tipo === c.tipo ? "puesto" : ""}`} aria-pressed={filtros.tipo === c.tipo} onClick={() => x.filtrar({ tipo: filtros.tipo === c.tipo ? "" : c.tipo, grupo: "" })}>
            <Icono nombre={c.icono} tam={16} /><span>{c.nombre}</span><i style={{ width: ancho(porTipo[i] ?? null, max) }} /><b>{porTipo[i] ?? "—"}</b>
          </button>
        ))}
        <div className={`${css.b} otras`}><Icono nombre="ellipsis" tam={16} /><span>Otras</span><i style={{ width: otras === null ? "0px" : `${Math.max(6, (otras / Math.max(1, todas!)) * 56)}px` }} /><b>{otras ?? "—"}</b></div>
      </div>
    </section>
  );
}
