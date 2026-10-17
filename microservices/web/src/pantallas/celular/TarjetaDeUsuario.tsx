import { useState } from "react";
import { ElegirRoles, type RolAsignable } from "../RolesDeUsuario";
import { TEXTOS } from "../textos";

// Más → Usuarios en el celular (007-T032): cada persona en su tarjeta, con sus iniciales, su
// estado, el correo entero, sus roles con ícono y, abajo, «Cambiar roles» y «Desactivar».
// Cambiar los roles abre las mismas casillas que en la computadora.
const TRAZOS_DE_ROL: Record<string, string> = {
  Administrador: "M3 8l4 4 5-7 5 7 4-4-2 11H5z",
  Comprador: "M4 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.3a1 1 0 0 0 1-.76L20 8H7M10 20.5h.01M17.5 20.5h.01",
  Gerente: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  Recepción: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  Vendedor: "M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01",
};
// Un rol que armó el negocio: el escudo de los roles.
const TRAZO_DE_OTRO_ROL = "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z";
const trazo = (props: { d: string; tam?: number; grosor?: number }) => (
  <svg width={props.tam ?? 16} height={props.tam ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.grosor ?? 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={props.d} /></svg>
);
const COLORES = ["verde", "naranja", "amarillo", "azul"] as const;
const iniciales = (nombre: string) => nombre.trim().split(/\s+/).map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();

export type Persona = { id: string; nombre: string; email: string; activo: boolean; roles?: RolAsignable[] };

export function TarjetaDeUsuario({ persona: u, orden, disponibles, alCambiarRoles, alActivar }: {
  persona: Persona; orden: number; disponibles: RolAsignable[];
  alCambiarRoles: (ids: string[]) => Promise<string | null>; alActivar: () => void;
}) {
  const actuales = u.roles ?? [];
  const [abierto, setAbierto] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    if (elegidos.length === 0) { setError(TEXTOS.usuarios.faltaUnRol.corto); return; }
    setGuardando(true); setError(null);
    const falla = await alCambiarRoles(elegidos);
    setGuardando(false);
    if (falla) setError(falla); else setAbierto(false);
  }
  return (
    <article className={`ut ${u.activo ? "" : "apagada"}`} data-testid="usuario-fila">
      <div className="ut-arriba">
        <span className={`ut-avatar ${COLORES[orden % COLORES.length]}`} aria-hidden="true">{iniciales(u.nombre)}</span>
        <span className="ut-quien">
          <span className="ut-nombre"><strong>{u.nombre}</strong><span className={`ut-estado ${u.activo ? "si" : "no"}`}>{u.activo ? "Activo" : "Inactivo"}</span></span>
          <span className="ut-correo">{u.email}</span>
        </span>
      </div>
      <div className="ut-roles" data-testid="roles-de-usuario">
        <span className="ut-rotulo">Roles asignados</span>
        <ul aria-label={`Roles de ${u.nombre}`}>
          {actuales.length ? actuales.map((r) => (
            <li key={r.id} className={r.nombre === "Administrador" ? "admin" : ""}>{trazo({ d: TRAZOS_DE_ROL[r.nombre] ?? TRAZO_DE_OTRO_ROL })}{r.nombre}</li>
          )) : <li className="sin">Sin roles</li>}
        </ul>
      </div>
      {abierto ? (
        <div className="ru-panel">
          <ElegirRoles disponibles={disponibles} elegidos={elegidos} alCambiar={(ids) => { setElegidos(ids); setError(null); }} nombre={u.nombre} />
          {error && <p className="rl-error" role="alert">{error}</p>}
          <div className="rl-acciones">
            <button type="button" className="rl-boton" onClick={() => setAbierto(false)}>Cancelar</button>
            <button type="button" className="rl-boton fuerte" disabled={guardando} onClick={() => void guardar()} data-testid="guardar-roles">{guardando ? "Guardando…" : "Guardar roles"}</button>
          </div>
        </div>
      ) : (
        <div className="ut-abajo">
          <button type="button" className="ut-cambiar" onClick={() => { setElegidos(actuales.map((r) => r.id)); setError(null); setAbierto(true); }} aria-label={`Cambiar los roles de ${u.nombre}`} data-testid="cambiar-roles">
            {trazo({ d: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4", tam: 18 })}Cambiar roles<span className="ut-flecha" aria-hidden="true">›</span>
          </button>
          <button type="button" className={`ut-activar ${u.activo ? "" : "reactivar"}`} onClick={alActivar} data-testid={u.activo ? "desactivar" : "reactivar"}>
            {trazo({ d: "M12 3v8M6.3 7a8 8 0 1 0 11.4 0", tam: 15, grosor: 2.4 })}{u.activo ? "Desactivar" : "Reactivar"}
          </button>
        </div>
      )}
    </article>
  );
}

// La cabecera de la lista y el recuadro para autorizar a alguien, que va justo debajo.
export function CabeceraDeUsuarios({ cuantos }: { cuantos: number }) {
  return (
    <div className="ut-cabeza">
      {trazo({ d: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M18 14a6 6 0 0 1 4 7", tam: 26 })}
      <span><strong>{TEXTOS.usuarios.autorizados.corto}</strong><small>{TEXTOS.usuarios.queSonLosRoles.corto}</small></span>
      <span className="ut-cuantos" data-testid="cuantos-usuarios">{cuantos} {cuantos === 1 ? "usuario" : "usuarios"}</span>
    </div>
  );
}

export function AutorizarOtro({ alTocar }: { alTocar: () => void }) {
  return (
    <button type="button" className="ut-alta" onClick={alTocar} data-testid="autorizar">
      <span className="ut-mas" aria-hidden="true">+</span>
      <span><strong>{TEXTOS.usuarios.autorizarOtro.corto}</strong><small>{TEXTOS.usuarios.invitarAMas.corto}</small></span>
    </button>
  );
}
