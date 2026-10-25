import { useState } from "react";
import { ElegirYGuardarRoles, type RolAsignable } from "../../RolesDeUsuario";
import { rolesEnOrden, useCambioDeRoles, type Acceso, type CambioDeRoles, type CelularDeOtroFila, type SesionFila } from "../../../negocio/usuarios";
import { fecha } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Iniciales } from "../../iconos-de-negocio";
import { Icono } from "../../../ui/iconos";
import { AccesoDeUsuario } from "./AccesoDeUsuario";
import { RolesEnUnaLinea } from "./RolesEnUnaLinea";
import { Rol } from "./RolDeLaTarjeta";
import css from "./Usuarios.module.css";

export { iconoDeRol } from "./RolDeLaTarjeta";
export { cuantosEntran } from "./RolesEnUnaLinea";
export { AutorizarOtro } from "./AutorizarOtro";

const trazo = (props: { d: string; tam?: number; grosor?: number }) => (
  <svg width={props.tam ?? 16} height={props.tam ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.grosor ?? 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={props.d} /></svg>
);
const ICONOS = {
  correo: "M3 6h18v12H3zM3 7l9 6 9-6",
  calendario: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4",
};

export type Persona = { id: string; nombre: string; email: string; activo: boolean; creado_en?: string; roles?: RolAsignable[] };
type Pestana = "info" | "roles" | "sesiones";
type AccesoConAcciones = Acceso & { alCerrarSesion: (s: SesionFila) => void; alQuitarCelular: (c: CelularDeOtroFila) => void };
type Props = { persona: Persona; orden: number; disponibles: RolAsignable[]; esVos?: boolean; alCambiarRoles: (ids: string[]) => Promise<string | null>; alActivar: () => void; acceso?: AccesoConAcciones };

// Más → Usuarios en el celular (decisión 102): cada persona en su tarjeta, plegada, con sus
// iniciales, el nombre con su estado, el correo y los roles que entran en una línea. Al tocarla se
// abre, siempre en «Información» (el correo, cuándo se unió y «Desactivar»), con las pestañas
// «Roles» (todos, con «Cambiar roles») y «Sesiones» (sus sesiones y celulares con huella).
export function TarjetaDeUsuario({ persona: u, disponibles, alCambiarRoles, alActivar, acceso, esVos }: Props) {
  const actuales = rolesEnOrden(u.roles);
  const [abierta, setAbierta] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("info");
  const cambio = useCambioDeRoles(actuales, alCambiarRoles, TEXTOS.usuarios.faltaUnRol.corto);
  function abrirOCerrar() {
    if (!abierta) { setPestana("info"); cambio.cancelar(); }
    setAbierta(!abierta);
  }
  return (
    <article className={`ut ${u.activo ? "" : "apagada"} ${abierta ? "abierta" : ""}`} data-testid="usuario-fila">
      <CabezaDeLaTarjeta u={u} actuales={actuales} esVos={esVos} abierta={abierta} alTocar={abrirOCerrar} />
      {abierta && (
        <>
          <PestanasDeLaTarjeta u={u} pestana={pestana} cuantosAccesos={acceso ? acceso.sesiones.length + acceso.celulares.length : 0} alElegir={setPestana} />
          <div className={css.utPanel} role="tabpanel">
            {pestana === "info" && <Informacion u={u} alActivar={alActivar} />}
            {pestana === "roles" && <Roles u={u} actuales={actuales} disponibles={disponibles} cambio={cambio} />}
            {pestana === "sesiones" && <Sesiones nombre={u.nombre} acceso={acceso} />}
          </div>
        </>
      )}
    </article>
  );
}

// Plegada: las iniciales, el nombre con su estado, el correo y los roles que entran en una línea.
function CabezaDeLaTarjeta({ u, actuales, esVos, abierta, alTocar }: { u: Persona; actuales: RolAsignable[]; esVos?: boolean; abierta: boolean; alTocar: () => void }) {
  return (
    <button type="button" className={css.arriba} aria-expanded={abierta} onClick={alTocar} data-testid="abrir-usuario">
      <Iniciales nombre={u.nombre} clave={u.email} apagado={!u.activo} />
      <span className={css.quien}>
        <span className={css.nombre}><strong>{u.nombre}</strong>{esVos && <span className={css.vos}>Vos</span>}{!u.activo && <span className={`${css.estado} no`}>Inactivo</span>}</span>
        <span className={css.utCorreo}>{u.email}</span>
        <RolesEnUnaLinea roles={actuales} nombre={u.nombre} />
      </span>
      <span className={css.flechaAbrir} aria-hidden="true"><Icono nombre={abierta ? "chevron-up" : "chevron-down"} /></span>
    </button>
  );
}

function PestanasDeLaTarjeta({ u, pestana, cuantosAccesos, alElegir }: { u: Persona; pestana: Pestana; cuantosAccesos: number; alElegir: (p: Pestana) => void }) {
  const t = TEXTOS.usuarios;
  const pestanas: [Pestana, string][] = [["info", t.informacion.corto], ["roles", t.roles.corto], ["sesiones", `${t.acceso.corto} (${cuantosAccesos})`]];
  return (
    <div className={css.pestanas} role="tablist" aria-label={`Datos de ${u.nombre}`}>
      {pestanas.map(([valor, nombre]) => (
        <button key={valor} type="button" role="tab" aria-selected={pestana === valor} className={pestana === valor ? "si" : ""} onClick={() => alElegir(valor)} data-testid={`pestana-${valor}`}>
{nombre}
        </button>
      ))}
    </div>
  );
}

function Informacion({ u, alActivar }: { u: Persona; alActivar: () => void }) {
  return (
    <>
      <p className={css.dato}>{trazo({ d: ICONOS.correo, tam: 18 })}<span>{u.email}</span></p>
      {u.creado_en && <p className={css.dato} data-testid="se-unio">{trazo({ d: ICONOS.calendario, tam: 18 })}<span>{TEXTOS.usuarios.seUnio.corto} {fecha(u.creado_en)}</span></p>}
      <button type="button" className={`${css.activar} ${u.activo ? "" : "reactivar"}`} onClick={alActivar} data-testid={u.activo ? "desactivar" : "reactivar"}>
        {trazo({ d: "M12 3v8M6.3 7a8 8 0 1 0 11.4 0", tam: 20, grosor: 2.4 })}{u.activo ? "Desactivar" : "Reactivar"}
      </button>
    </>
  );
}

function Roles({ u, actuales, disponibles, cambio }: { u: Persona; actuales: RolAsignable[]; disponibles: RolAsignable[]; cambio: CambioDeRoles }) {
  if (cambio.cambiando) return <ElegirYGuardarRoles nombre={u.nombre} disponibles={disponibles} cambio={cambio} />;
  return <RolesDeLaTarjeta u={u} actuales={actuales} alCambiar={cambio.abrir} />;
}

function RolesDeLaTarjeta({ u, actuales, alCambiar }: { u: Persona; actuales: RolAsignable[]; alCambiar: () => void }) {
  return (
    <>
      <ul className={css.roles} aria-label={`Roles de ${u.nombre}`} data-testid="roles-de-usuario">
        {actuales.length ? actuales.map((r) => <Rol key={r.id} r={r} />) : <li className="sin">Sin roles</li>}
      </ul>
      <button type="button" className={css.cambiar} onClick={alCambiar} aria-label={`Cambiar los roles de ${u.nombre}`} data-testid="cambiar-roles">
        {trazo({ d: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4", tam: 18 })}Cambiar roles<span className={css.flecha} aria-hidden="true">›</span>
      </button>
    </>
  );
}

function Sesiones({ nombre, acceso }: { nombre: string; acceso?: AccesoConAcciones }) {
  if (!acceso || acceso.sesiones.length + acceso.celulares.length === 0) return <p className={css.dato}>{TEXTOS.usuarios.sinSesiones.corto}</p>;
  return <AccesoDeUsuario nombre={nombre} {...acceso} />;
}
