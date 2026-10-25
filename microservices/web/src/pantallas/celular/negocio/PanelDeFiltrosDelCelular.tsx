import type { ReactNode } from "react";
import type { EstadoDeUsuario, FiltroDeLaLista, OrdenDeUsuarios } from "../../../negocio/usuarios";
import type { RolAsignable } from "../../RolesDeUsuario";
import { TEXTOS } from "../../textos";
import { iconoDeRol } from "./RolDeLaTarjeta";
import type { Persona } from "./TarjetaDeUsuario";
import css from "./Usuarios.module.css";

export const trazo = (d: string, tam = 18) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const PERSONAS = "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8";

function Grupo({ titulo, bajada, children }: { titulo: string; bajada?: string; children: ReactNode }) {
  return (
    <div>
      <div className={css.cab}><h3>{titulo}</h3>{bajada && <small>{bajada}</small>}</div>
      <div className={css.opciones} role="group" aria-label={titulo}>{children}</div>
    </div>
  );
}

function Opcion({ elegida, alTocar, children }: { elegida: boolean; alTocar: () => void; children: ReactNode }) {
  return <button type="button" className={elegida ? "si" : ""} aria-pressed={elegida} onClick={alTocar}>{children}</button>;
}

// «Filtros»: los roles (uno o más) y el estado, con «Quitar filtros» y «Aplicar · Ver N usuarios».
export function PanelDeFiltrosDelCelular<U extends Persona>({ f, roles, alCerrar }: { f: FiltroDeLaLista<U>; roles: RolAsignable[]; alCerrar: () => void }) {
  const t = TEXTOS.usuarios;
  const estados: [EstadoDeUsuario, string, ReactNode][] = [
    ["todos", t.todos.corto, trazo(PERSONAS)],
    ["activos", t.activos.corto, <i key="a" className={`${css.punto} si`} />],
    ["inactivos", t.inactivos.corto, <i key="i" className={`${css.punto} no`} />],
  ];
  return (
    <div className={css.panel} role="dialog" aria-label={t.filtros.corto} data-testid="panel-filtros">
      <Grupo titulo={t.roles.corto} bajada={t.unoOMas.corto}>
        <Opcion elegida={f.roles.length === 0} alTocar={f.todosLosRoles}>{trazo(PERSONAS)}{t.todos.corto}</Opcion>
        {roles.map((r) => <Opcion key={r.id} elegida={f.roles.includes(r.id)} alTocar={() => f.alternarRol(r.id)}>{iconoDeRol(r.nombre, 18)}{r.nombre}</Opcion>)}
      </Grupo>
      <Grupo titulo={t.estado.corto}>
        {estados.map(([valor, nombre, icono]) => <Opcion key={valor} elegida={f.estado === valor} alTocar={() => f.elegirEstado(valor)}>{icono}{nombre}</Opcion>)}
      </Grupo>
      <div className={css.pie}>
        <button type="button" className={css.quitar} onClick={f.quitarFiltros}>{t.quitarFiltros.corto}</button>
        <button type="button" className={css.ver} onClick={alCerrar} data-testid="ver-usuarios">
          <span><strong>{t.aplicarFiltros.corto}</strong><small>Ver {f.conLosFiltros} {f.conLosFiltros === 1 ? "usuario" : "usuarios"}</small></span>
          {trazo("M9 6l6 6-6 6", 20)}
        </button>
      </div>
    </div>
  );
}

// «Ordenar: correo», que abre el menú con los dos órdenes.
export function OrdenarUsuarios<U extends Persona>({ f, abierto, alTocar, alElegir }: { f: FiltroDeLaLista<U>; abierto: boolean; alTocar: () => void; alElegir: () => void }) {
  const t = TEXTOS.usuarios;
  const ordenes: [OrdenDeUsuarios, string][] = [["correo", t.porCorreo.corto], ["estado", t.porEstado.corto]];
  return (
    <div className={css.ordenar}>
      <button type="button" className={`${css.boton} bajo`} aria-expanded={abierto} onClick={alTocar} data-testid="ordenar">
        {trazo("M8 4v16M8 20l-3-3M8 20l3-3M16 20V4M16 4l-3 3M16 4l3 3", 16)}Ordenar: {f.orden === "correo" ? "correo" : "estado"}
      </button>
      {abierto && (
        <div className={`${css.panel} ${css.menu}`} role="menu" aria-label={t.ordenarPor.corto}>
          <h3>{t.ordenarPor.corto}</h3>
          {ordenes.map(([valor, nombre]) => (
            <button key={valor} type="button" role="menuitemradio" aria-checked={f.orden === valor} className={f.orden === valor ? "si" : ""} onClick={() => { f.elegirOrden(valor); alElegir(); }}>
              {nombre}{f.orden === valor && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
