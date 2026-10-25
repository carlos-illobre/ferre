import { primerNombre } from "../../../negocio/actividad";
import { detalleDe, horaDe, queFue } from "../../comun/negocio/actividad-en-palabras";
import { Iniciales } from "../../iconos-de-negocio";
import { Icono } from "../../../ui/iconos";
import { fechaCompleta } from "./negocio-comun";
import type { ActividadDeLaCompu } from "./useActividadDeLaCompu";
import css from "./Actividad.module.css";

// La tabla de a 10: hora, quién, qué y el detalle. Tocar elige; doble toque (o Enter) abre todo.
export function TablaDelRegistro({ x }: { x: ActividadDeLaCompu }) {
  return (
    <div className={`${css.tabla} ${x.cargando ? "actividad-cargando" : ""}`} data-testid="auditoria" aria-busy={x.cargando} ref={x.tabla} onKeyDown={x.teclear}>
      <div className={`${css.fila} cab`} aria-hidden="true"><span>Hora</span><span>Quién</span><span>Qué</span><span>Detalle</span><span /></div>
      {x.eventos.map((e, i) => {
        const que = queFue(e);
        return (
          <button key={e.id} type="button" className={`${css.fila} ${e === x.elegido ? "elegida" : ""}`} aria-pressed={e === x.elegido} onClick={() => x.setMarcado(i)} onDoubleClick={() => x.setAbierto(e)} data-testid="evento" title={fechaCompleta(e.fecha)}>
            <span className={css.hora}>{horaDe(e.fecha)}</span>
            <span className={css.quien} title={e.email ?? undefined}><Iniciales nombre={e.nombre ?? "Sistema"} clave={e.email ?? "sistema"} tam="s" />{primerNombre(e.nombre)}</span>
            <span className={css.que}><span className={`${css.tipo} ${que.tono ?? ""}`}><Icono nombre={que.icono} tam={16} /></span>{que.nombre}</span>
            <span className={css.det}>{detalleDe(e, x.usuarios) || "—"}</span>
            <Icono nombre="chevron-right" className={css.mas} />
          </button>
        );
      })}
    </div>
  );
}
