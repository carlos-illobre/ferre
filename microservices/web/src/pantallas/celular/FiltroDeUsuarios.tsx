import { useState, type ReactNode } from "react";
import { partesResaltadas, type EstadoDeUsuario, type OrdenDeUsuarios } from "../../negocio/usuarios";
import type { useFiltroDeUsuarios } from "../filtro-de-usuarios";
import type { RolAsignable } from "../RolesDeUsuario";
import { TEXTOS } from "../textos";
import { iconoDeRol, type Persona } from "./TarjetaDeUsuario";

// Debajo de «Autorizar otro correo de Google» (decisiones 98 y 102): el buscador «Email», con las
// sugerencias del ancho de la fila, y «Filtros», que abre el panel de roles y estado; debajo,
// cuántos son y «Ordenar».
const iniciales = (nombre: string) => nombre.trim().split(/\s+/).map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();
const trazo = (d: string, tam = 18) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const PERSONAS = "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8";

export function FiltroDeUsuarios<U extends Persona>({ filtro: f, roles, filas }: { filtro: ReturnType<typeof useFiltroDeUsuarios<U>>; roles: RolAsignable[]; filas?: U[] }) {
  const total = filas?.length ?? 0;
  const activos = filas?.filter((u) => u.activo).length ?? 0;
  const t = TEXTOS.usuarios;
  const [panel, setPanel] = useState<"filtros" | "ordenar" | null>(null);
  const alternar = (p: "filtros" | "ordenar") => setPanel(panel === p ? null : p);
  const estados: [EstadoDeUsuario, string, ReactNode][] = [
    ["todos", t.todos.corto, trazo(PERSONAS)],
    ["activos", t.activos.corto, <i key="a" className="fu-punto si" />],
    ["inactivos", t.inactivos.corto, <i key="i" className="fu-punto no" />],
  ];
  const ordenes: [OrdenDeUsuarios, string][] = [["correo", t.porCorreo.corto], ["estado", t.porEstado.corto]];
  return (
    <div className="fu" data-testid="filtro-usuarios">
      <div className="fu-fila">
        <div className="fu-caja">
          <svg className="fu-lupa" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input {...f.combo} type="search" value={f.texto} placeholder={t.nombreOCorreo.corto} aria-label={t.buscar.corto} autoComplete="off" autoCapitalize="none" spellCheck={false}
            onChange={(e) => f.escribir(e.target.value)} onKeyDown={f.alTeclear} onBlur={f.cerrar} data-testid="buscar-usuario" />
          {f.texto && <button type="button" className="fu-borrar" onClick={f.borrar} aria-label={t.borrarBusqueda.corto}>✕</button>}
        </div>
        <button type="button" className={`fu-boton ${f.filtrado ? "si" : ""}`} aria-expanded={panel === "filtros"} onClick={() => alternar("filtros")} data-testid="abrir-filtros">
          {trazo("M4 6h16M7 12h10M10 18h4", 20)}{t.filtros.corto}{f.filtrado && <i className="fu-aviso" aria-label="con filtros puestos" />}
        </button>
        {f.sugerencias.length > 0 && (
          <ul className="fu-sugerencias" id={f.listaId} role="listbox" aria-label={t.buscar.corto}>
            {f.sugerencias.map((u, i) => {
              const [antes, igual, despues] = partesResaltadas(u.email, f.texto);
              return (
                <li key={u.id} id={f.opcionId(i)} role="option" aria-selected={i === f.activa} className={i === f.activa ? "activa" : ""}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => f.elegir(u)} data-testid="sugerencia-usuario">
                  <span className="fu-av" aria-hidden="true">{iniciales(u.nombre)}</span>
                  <span><span className="fu-correo">{antes}<b>{igual}</b>{despues}</span><small>{u.nombre}</small></span>
                </li>
              );
            })}
          </ul>
        )}
        {panel === "filtros" && (
          <div className="fu-panel" role="dialog" aria-label={t.filtros.corto} data-testid="panel-filtros">
            <div>
              <div className="fu-cab"><h3>{t.roles.corto}</h3><small>{t.unoOMas.corto}</small></div>
              <div className="fu-opciones" role="group" aria-label={t.roles.corto}>
                <button type="button" className={f.roles.length === 0 ? "si" : ""} aria-pressed={f.roles.length === 0} onClick={f.todosLosRoles}>{trazo(PERSONAS)}{t.todos.corto}</button>
                {roles.map((r) => (
                  <button key={r.id} type="button" className={f.roles.includes(r.id) ? "si" : ""} aria-pressed={f.roles.includes(r.id)} onClick={() => f.alternarRol(r.id)}>{iconoDeRol(r.nombre, 18)}{r.nombre}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="fu-cab"><h3>{t.estado.corto}</h3></div>
              <div className="fu-opciones" role="group" aria-label={t.estado.corto}>
                {estados.map(([valor, nombre, icono]) => (
                  <button key={valor} type="button" className={f.estado === valor ? "si" : ""} aria-pressed={f.estado === valor} onClick={() => f.elegirEstado(valor)}>{icono}{nombre}</button>
                ))}
              </div>
            </div>
            <div className="fu-pie">
              <button type="button" className="fu-quitar" onClick={f.quitarFiltros}>{t.quitarFiltros.corto}</button>
              <button type="button" className="fu-ver" onClick={() => setPanel(null)} data-testid="ver-usuarios">
                <span><strong>{t.aplicarFiltros.corto}</strong><small>Ver {f.conLosFiltros} {f.conLosFiltros === 1 ? "usuario" : "usuarios"}</small></span>
                {trazo("M9 6l6 6-6 6", 20)}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="fu-cuenta">
        <p role="status" data-testid="cuantos-quedan">{f.filtrado || f.texto ? f.resumen : `${total} ${total === 1 ? "usuario" : "usuarios"} · ${activos} ${activos === 1 ? "activo" : "activos"}`}</p>
        <div className="fu-ordenar">
          <button type="button" className="fu-boton bajo" aria-expanded={panel === "ordenar"} onClick={() => alternar("ordenar")} data-testid="ordenar">
            {trazo("M8 4v16M8 20l-3-3M8 20l3-3M16 20V4M16 4l-3 3M16 4l3 3", 16)}Ordenar: {f.orden === "correo" ? "correo" : "estado"}
          </button>
          {panel === "ordenar" && (
            <div className="fu-panel fu-menu" role="menu" aria-label={t.ordenarPor.corto}>
              <h3>{t.ordenarPor.corto}</h3>
              {ordenes.map(([valor, nombre]) => (
                <button key={valor} type="button" role="menuitemradio" aria-checked={f.orden === valor} className={f.orden === valor ? "si" : ""} onClick={() => { f.elegirOrden(valor); setPanel(null); }}>
                  {nombre}{f.orden === valor && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {panel && <div className="fu-fondo" onClick={() => setPanel(null)} aria-hidden="true" />}
    </div>
  );
}
