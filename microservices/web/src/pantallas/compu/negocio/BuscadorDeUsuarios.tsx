import { useState, type ReactNode, type RefObject } from "react";
import { TEXTOS } from "../../textos";
import { Icono } from "../base/ui";
import { partesResaltadas, type EstadoDeUsuario, type FiltroDeLaLista, type UsuarioFila } from "../../../negocio/usuarios";
import type { RolAsignable } from "../../RolesDeUsuario";
import { PanelDeFiltrosDeUsuarios } from "./PanelDeFiltrosDeUsuarios";
import css from "./Usuarios.module.css";

type Props = { filtro: FiltroDeLaLista<UsuarioFila>; roles: RolAsignable[]; filas: UsuarioFila[]; buscador: RefObject<HTMLInputElement> };

// Arriba de la lista, como la v2: el buscador (con sus sugerencias y la tecla /), «Todos (N)» y
// «Activos (N)», y «Rol», que abre el panel con los roles, el estado y el orden (decisiones 98 y 102).
export function BuscadorDeUsuarios({ filtro: f, roles, filas, buscador }: Props) {
  const t = TEXTOS.usuarios;
  const [panel, setPanel] = useState(false);
  const activos = filas.filter((u) => u.activo).length;
  return (
    <div className={css.barra} data-testid="filtro-usuarios">
      <label className={css.campo}>
        <span className="solo-lectores">{t.buscar.largo}</span>
        <Icono nombre="search" />
        <input ref={buscador} {...f.combo} type="search" value={f.texto} placeholder="Buscá nombre o correo" autoComplete="off" autoCapitalize="none" spellCheck={false}
          onChange={(e) => f.escribir(e.target.value)} onKeyDown={f.alTeclear} onBlur={f.cerrar} data-testid="buscar-usuario" />
        <BorrarOBarra f={f} />
        {f.sugerencias.length > 0 && <Sugerencias f={f} />}
      </label>
      <Chip f={f} estado="todos">{t.todos.largo} ({filas.length})</Chip>
      <Chip f={f} estado="activos">{t.activos.largo} ({activos})</Chip>
      <div className="usuarios-filtros">
        <button type="button" className={`${css.boton} ${f.roles.length || f.estado === "inactivos" ? "con-filtros" : ""}`} aria-expanded={panel} onClick={() => setPanel(!panel)} data-testid="abrir-filtros">
          <Icono nombre="list-filter" tam={16} />Rol{f.filtrado && <span className="usuarios-aviso" aria-label="con filtros puestos" />}
        </button>
        {panel && <PanelDeFiltrosDeUsuarios filtro={f} roles={roles} alCerrar={() => setPanel(false)} />}
      </div>
      <span className="solo-lectores" role="status" data-testid="cuantos-quedan">{f.resumen}</span>
    </div>
  );
}

function BorrarOBarra({ f }: { f: FiltroDeLaLista<UsuarioFila> }) {
  if (!f.texto) return <span className={css.kbd} aria-hidden="true">/</span>;
  return <button type="button" className="usuarios-borrar" onClick={f.borrar} aria-label={TEXTOS.usuarios.borrarBusqueda.largo}>✕</button>;
}

function Chip({ f, estado, children }: { f: FiltroDeLaLista<UsuarioFila>; estado: EstadoDeUsuario; children: ReactNode }) {
  return <button type="button" className={`${css.chip} ${f.estado === estado ? "elegido" : ""}`} aria-pressed={f.estado === estado} onClick={() => f.elegirEstado(estado)}>{children}</button>;
}

function Sugerencias({ f }: { f: FiltroDeLaLista<UsuarioFila> }) {
  return (
    <ul className="usuarios-sugerencias" id={f.listaId} role="listbox" aria-label={TEXTOS.usuarios.buscar.largo}>
      {f.sugerencias.map((u, i) => {
        const [antes, igual, despues] = partesResaltadas(u.email, f.texto);
        return (
          <li key={u.id} id={f.opcionId(i)} role="option" aria-selected={i === f.activa} className={i === f.activa ? "activa" : ""}
            onMouseDown={(e) => e.preventDefault()} onClick={() => f.elegir(u)} data-testid="sugerencia-usuario">
            <span>{antes}<b>{igual}</b>{despues}</span><small>{u.nombre}</small>
          </li>
        );
      })}
    </ul>
  );
}
