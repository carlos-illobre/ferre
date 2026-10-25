import { useState } from "react";
import { partesResaltadas, type FiltroDeLaLista } from "../../../negocio/usuarios";
import type { RolAsignable } from "../../RolesDeUsuario";
import { TEXTOS } from "../../textos";
import type { Persona } from "./TarjetaDeUsuario";
import { OrdenarUsuarios, PanelDeFiltrosDelCelular, trazo } from "./PanelDeFiltrosDelCelular";
import css from "./Usuarios.module.css";

// Debajo de «Autorizar otro correo de Google» (decisiones 98 y 102): el buscador «Email», con las
// sugerencias del ancho de la fila, y «Filtros», que abre el panel de roles y estado; debajo,
// cuántos son y «Ordenar».
const iniciales = (nombre: string) => nombre.trim().split(/\s+/).map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();
type Panel = "filtros" | "ordenar" | null;

export function FiltroDeUsuarios<U extends Persona>({ filtro: f, roles, filas }: { filtro: FiltroDeLaLista<U>; roles: RolAsignable[]; filas?: U[] }) {
  const [panel, setPanel] = useState<Panel>(null);
  const alternar = (p: "filtros" | "ordenar") => setPanel(panel === p ? null : p);
  return (
    <div className="fu" data-testid="filtro-usuarios">
      <div className={css.fila}>
        <CajaDeBusqueda f={f} />
        <button type="button" className={`${css.boton} ${f.filtrado ? "si" : ""}`} aria-expanded={panel === "filtros"} onClick={() => alternar("filtros")} data-testid="abrir-filtros">
          {trazo("M4 6h16M7 12h10M10 18h4", 20)}{TEXTOS.usuarios.filtros.corto}{f.filtrado && <i className={css.aviso} aria-label="con filtros puestos" />}
        </button>
        {f.sugerencias.length > 0 && <Sugerencias f={f} />}
        {panel === "filtros" && <PanelDeFiltrosDelCelular f={f} roles={roles} alCerrar={() => setPanel(null)} />}
      </div>
      <div className={css.cuenta}>
        <p role="status" data-testid="cuantos-quedan">{f.filtrado || f.texto ? f.resumen : cuantosSon(filas)}</p>
        <OrdenarUsuarios f={f} abierto={panel === "ordenar"} alTocar={() => alternar("ordenar")} alElegir={() => setPanel(null)} />
      </div>
      {panel && <div className={css.fondo} onClick={() => setPanel(null)} aria-hidden="true" />}
    </div>
  );
}

function cuantosSon(filas: Persona[] | undefined) {
  const total = filas?.length ?? 0;
  const activos = filas?.filter((u) => u.activo).length ?? 0;
  return `${total} ${total === 1 ? "usuario" : "usuarios"} · ${activos} ${activos === 1 ? "activo" : "activos"}`;
}

function CajaDeBusqueda<U extends Persona>({ f }: { f: FiltroDeLaLista<U> }) {
  const t = TEXTOS.usuarios;
  return (
    <div className={css.caja}>
      <svg className={css.lupa} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input {...f.combo} type="search" value={f.texto} placeholder={t.nombreOCorreo.corto} aria-label={t.buscar.corto} autoComplete="off" autoCapitalize="none" spellCheck={false}
        onChange={(e) => f.escribir(e.target.value)} onKeyDown={f.alTeclear} onBlur={f.cerrar} data-testid="buscar-usuario" />
      {f.texto && <button type="button" className={css.borrar} onClick={f.borrar} aria-label={t.borrarBusqueda.corto}>✕</button>}
    </div>
  );
}

function Sugerencias<U extends Persona>({ f }: { f: FiltroDeLaLista<U> }) {
  return (
    <ul className={css.sugerencias} id={f.listaId} role="listbox" aria-label={TEXTOS.usuarios.buscar.corto}>
      {f.sugerencias.map((u, i) => {
        const [antes, igual, despues] = partesResaltadas(u.email, f.texto);
        return (
          <li key={u.id} id={f.opcionId(i)} role="option" aria-selected={i === f.activa} className={i === f.activa ? "activa" : ""}
            onMouseDown={(e) => e.preventDefault()} onClick={() => f.elegir(u)} data-testid="sugerencia-usuario">
            <span className={css.av} aria-hidden="true">{iniciales(u.nombre)}</span>
            <span><span className={css.correo}>{antes}<b>{igual}</b>{despues}</span><small>{u.nombre}</small></span>
          </li>
        );
      })}
    </ul>
  );
}
