import { TEXTOS } from "../../textos";
import { useComandos } from "../../../plataforma/comandos";
import { Boton } from "../base/ui";
import type { EstadoDeUsuario, FiltroDeLaLista, OrdenDeUsuarios, UsuarioFila } from "../../../negocio/usuarios";
import type { RolAsignable } from "../../RolesDeUsuario";

type Opcion<V> = { valor: V; nombre: string; elegida: boolean; testId?: string; punto?: boolean };

// Un grupo de opciones del panel, con su título: se elige tocando, la elegida queda marcada.
function Opciones<V extends string>({ titulo, bajada, opciones, alElegir }: { titulo: string; bajada?: string; opciones: Opcion<V>[]; alElegir: (v: V) => void }) {
  return (
    <>
      <div className="usuarios-panel-cab"><h3>{titulo}</h3>{bajada && <small className="detalle">{bajada}</small>}</div>
      <div className="usuarios-opciones" role="group" aria-label={titulo}>
        {opciones.map((o) => (
          <button key={o.valor} type="button" className={o.elegida ? "si" : ""} aria-pressed={o.elegida} onClick={() => alElegir(o.valor)} data-testid={o.testId}>
            {o.punto && <i className={`usuarios-punto ${o.valor}`} />}{o.nombre}
          </button>
        ))}
      </div>
    </>
  );
}

// El panel de «Rol»: los roles, el estado y el orden, con «Quitar filtros» y «Ver N usuarios».
export function PanelDeFiltrosDeUsuarios({ filtro: f, roles, alCerrar }: { filtro: FiltroDeLaLista<UsuarioFila>; roles: RolAsignable[]; alCerrar: () => void }) {
  const t = TEXTOS.usuarios;
  const estados: [EstadoDeUsuario, string][] = [["todos", t.todos.largo], ["activos", t.activos.largo], ["inactivos", t.inactivos.largo]];
  const ordenes: [OrdenDeUsuarios, string][] = [["correo", t.porCorreo.largo], ["estado", t.porEstado.largo]];
  useComandos({ cerrar: alCerrar }, { encima: true });
  const deRoles: Opcion<string>[] = [{ valor: "", nombre: t.todos.largo, elegida: f.roles.length === 0 }, ...roles.map((r) => ({ valor: r.id, nombre: r.nombre, elegida: f.roles.includes(r.id) }))];
  return (
    <div className="usuarios-panel" role="dialog" aria-label={t.filtros.largo} data-testid="panel-filtros">
      <Opciones titulo={t.roles.largo} bajada={t.unoOMas.largo} opciones={deRoles} alElegir={(id) => (id ? f.alternarRol(id) : f.todosLosRoles())} />
      <Opciones titulo={t.estado.largo} opciones={estados.map(([valor, nombre]) => ({ valor, nombre, elegida: f.estado === valor, punto: valor !== "todos" }))} alElegir={f.elegirEstado} />
      <Opciones titulo={t.ordenarPor.largo} opciones={ordenes.map(([valor, nombre]) => ({ valor, nombre, elegida: f.orden === valor, testId: `ordenar-${valor}` }))} alElegir={f.elegirOrden} />
      <div className="usuarios-panel-pie">
        <Boton tam="chico" onClick={f.quitarFiltros}>{t.quitarFiltros.largo}</Boton>
        <Boton tam="chico" variante="principal" onClick={alCerrar} data-testid="ver-usuarios">{t.aplicarFiltros.largo} · Ver {f.conLosFiltros} {f.conLosFiltros === 1 ? "usuario" : "usuarios"}</Boton>
      </div>
    </div>
  );
}
