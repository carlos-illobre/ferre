import { nombreDe, primerNombre, type Evento } from "../../../negocio/actividad";
import { detalleDe, haceCuantoFue, horaDe, queFue } from "../../comun/negocio/actividad-en-palabras";
import { Iniciales } from "../../iconos-de-negocio";
import { Icono } from "../../../ui/iconos";
import { fechaCompleta } from "./negocio-comun";
import type { ActividadDeLaCompu } from "./useActividadDeLaCompu";
import css from "./Actividad.module.css";

// La acción elegida, a la derecha: qué, quién, cuándo y el motivo; «Ver todo» y «Lo de» esa persona.
export function AccionElegida({ x, elegido }: { x: ActividadDeLaCompu; elegido: Evento }) {
  const que = queFue(elegido);
  const detalle = detalleDe(elegido);
  const motivo = typeof elegido.contenido.motivo === "string" ? elegido.contenido.motivo : null;
  const quienFue = x.usuarios.find((u) => u.id === elegido.quien?.id);
  return (
    <section className={`${css.caja} ${css.elegido}`} aria-label={`${que.nombre}, ${horaDe(elegido.fecha)}`} data-testid="accion-elegida">
      <div className={css.detCab}><span className={`${css.tipo} l ${que.tono ?? ""}`}><Icono nombre={que.icono} /></span><div><div className={css.detTitulo}>{que.nombre}</div><div className={css.detalle}>{horaDe(elegido.fecha)} · {haceCuantoFue(elegido.fecha)}</div></div></div>
      <QuienQueCuando e={elegido} detalle={detalle} />
      {motivo && <div className={css.cita}>«{motivo}»</div>}
      <div className={css.acciones}>
        <button type="button" className={`${css.boton} suave`} onClick={() => x.setAbierto(elegido)} aria-haspopup="dialog">Ver todo</button>
        {quienFue && <button type="button" className={`${css.boton} suave`} onClick={() => x.filtrar({ usuario: quienFue.id })}>Lo de {primerNombre(nombreDe(elegido))}</button>}
      </div>
    </section>
  );
}

function QuienQueCuando({ e, detalle }: { e: Evento; detalle: string }) {
  return (
    <dl className={css.kv}>
      <dt>Quién</dt><dd className={css.kvQuien}><Iniciales nombre={nombreDe(e) ?? "Sistema"} clave={e.quien?.id ?? "sistema"} tam="s" />{nombreDe(e) ?? "El sistema"}</dd>
      {detalle && <><dt>Qué</dt><dd>{detalle}</dd></>}
      <dt>Cuándo</dt><dd>{fechaCompleta(e.fecha)}</dd>
    </dl>
  );
}
