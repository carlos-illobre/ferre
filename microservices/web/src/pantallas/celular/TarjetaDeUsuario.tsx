import { useLayoutEffect, useRef, useState } from "react";
import { ElegirRoles, type RolAsignable } from "../RolesDeUsuario";
import { type Acceso, type CelularDeOtroFila, type SesionFila } from "../../negocio/usuarios";
import { fecha } from "../../formato";
import { TEXTOS } from "../textos";
import { IconoN, Iniciales, iconoDeRol as iconoV2 } from "../iconos-de-negocio";
import "./usuarios.css";

// Los íconos de cada rol (007-T032); un rol que armó el negocio lleva el escudo de los roles.
const TRAZOS_DE_ROL: Record<string, string> = {
  Administrador: "M3 8l4 4 5-7 5 7 4-4-2 11H5z",
  Comprador: "M4 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.3a1 1 0 0 0 1-.76L20 8H7M10 20.5h.01M17.5 20.5h.01",
  Gerente: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  Recepción: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  Vendedor: "M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01",
};
const TRAZO_DE_OTRO_ROL = "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z";
const trazo = (props: { d: string; tam?: number; grosor?: number }) => (
  <svg width={props.tam ?? 16} height={props.tam ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.grosor ?? 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={props.d} /></svg>
);
const ICONOS = {
  correo: "M3 6h18v12H3zM3 7l9 6 9-6",
  calendario: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4",
  persona: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  sesiones: "M3 5.5A1.5 1.5 0 0 1 4.5 4h10A1.5 1.5 0 0 1 16 5.5V14H3zM7 18h5M18 9h3v11h-5v-3",
};
// Como la v2 (decisión 148): el ícono de Lucide de cada rol, el mismo que en la computadora.
export const iconoDeRol = (nombre: string, tam = 16) => <IconoN nombre={iconoV2(nombre)} tam={tam} />;
const Rol = ({ r }: { r: RolAsignable }) => <li className={r.nombre === "Administrador" ? "admin" : ""}>{iconoDeRol(r.nombre)}{r.nombre}</li>;

export type Persona = { id: string; nombre: string; email: string; activo: boolean; creado_en?: string; roles?: RolAsignable[] };
type Pestana = "info" | "roles" | "sesiones";

// Más → Usuarios en el celular (decisión 102): cada persona en su tarjeta, plegada, con sus
// iniciales, el nombre con su estado, el correo y los roles que entran en una línea. Al tocarla se
// abre, siempre en «Información» (el correo, cuándo se unió y «Desactivar»), con las pestañas
// «Roles» (todos, con «Cambiar roles») y «Sesiones» (sus sesiones y celulares con huella).
export function TarjetaDeUsuario({ persona: u, disponibles, alCambiarRoles, alActivar, acceso, esVos }: {
  persona: Persona; orden: number; disponibles: RolAsignable[]; esVos?: boolean;
  alCambiarRoles: (ids: string[]) => Promise<string | null>; alActivar: () => void;
  acceso?: Acceso & { alCerrarSesion: (s: SesionFila) => void; alQuitarCelular: (c: CelularDeOtroFila) => void };
}) {
  // El Administrador primero, como la v2.
  const actuales = [...(u.roles ?? [])].sort((x, y) => Number(y.nombre === "Administrador") - Number(x.nombre === "Administrador"));
  const [abierta, setAbierta] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("info");
  const [cambiando, setCambiando] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const t = TEXTOS.usuarios;
  const cuantosAccesos = acceso ? acceso.sesiones.length + acceso.celulares.length : 0;
  function abrirOCerrar() {
    if (!abierta) { setPestana("info"); setCambiando(false); }
    setAbierta(!abierta);
  }
  async function guardar() {
    if (elegidos.length === 0) { setError(t.faltaUnRol.corto); return; }
    setGuardando(true); setError(null);
    const falla = await alCambiarRoles(elegidos);
    setGuardando(false);
    if (falla) setError(falla); else setCambiando(false);
  }
  const pestanas: [Pestana, string, string][] = [
    ["info", t.informacion.corto, ICONOS.persona],
    ["roles", t.roles.corto, TRAZO_DE_OTRO_ROL],
    ["sesiones", `${t.acceso.corto} (${cuantosAccesos})`, ICONOS.sesiones],
  ];
  return (
    <article className={`ut ${u.activo ? "" : "apagada"} ${abierta ? "abierta" : ""}`} data-testid="usuario-fila">
      <button type="button" className="ut-arriba" aria-expanded={abierta} onClick={abrirOCerrar} data-testid="abrir-usuario">
        <Iniciales nombre={u.nombre} clave={u.email} apagado={!u.activo} />
        <span className="ut-quien">
          <span className="ut-nombre"><strong>{u.nombre}</strong>{esVos && <span className="ut-vos">Vos</span>}{!u.activo && <span className="ut-estado no">Inactivo</span>}</span>
          <span className="ut-correo">{u.email}</span>
          <RolesEnUnaLinea roles={actuales} nombre={u.nombre} />
        </span>
        <span className="ut-flecha-abrir" aria-hidden="true"><IconoN nombre={abierta ? "chevron-up" : "chevron-down"} /></span>
      </button>
      {abierta && (
        <>
          <div className="ut-pestanas" role="tablist" aria-label={`Datos de ${u.nombre}`}>
            {pestanas.map(([valor, nombre]) => (
              <button key={valor} type="button" role="tab" aria-selected={pestana === valor} className={pestana === valor ? "si" : ""} onClick={() => setPestana(valor)} data-testid={`pestana-${valor}`}>
{nombre}
              </button>
            ))}
          </div>
          {pestana === "info" && (
            <div className="ut-panel" role="tabpanel">
              <p className="ut-dato">{trazo({ d: ICONOS.correo, tam: 18 })}<span>{u.email}</span></p>
              {u.creado_en && <p className="ut-dato" data-testid="se-unio">{trazo({ d: ICONOS.calendario, tam: 18 })}<span>{t.seUnio.corto} {fecha(u.creado_en)}</span></p>}
              <button type="button" className={`ut-activar ${u.activo ? "" : "reactivar"}`} onClick={alActivar} data-testid={u.activo ? "desactivar" : "reactivar"}>
                {trazo({ d: "M12 3v8M6.3 7a8 8 0 1 0 11.4 0", tam: 20, grosor: 2.4 })}{u.activo ? "Desactivar" : "Reactivar"}
              </button>
            </div>
          )}
          {pestana === "roles" && (
            <div className="ut-panel" role="tabpanel">
              {cambiando ? (
                <div className="ru-panel">
                  <ElegirRoles disponibles={disponibles} elegidos={elegidos} alCambiar={(ids) => { setElegidos(ids); setError(null); }} nombre={u.nombre} />
                  {error && <p className="rl-error" role="alert">{error}</p>}
                  <div className="rl-acciones">
                    <button type="button" className="rl-boton" onClick={() => setCambiando(false)}>Cancelar</button>
                    <button type="button" className="rl-boton fuerte" disabled={guardando} onClick={() => void guardar()} data-testid="guardar-roles">{guardando ? "Guardando…" : "Guardar roles"}</button>
                  </div>
                </div>
              ) : (
                <>
                  <ul className="ut-roles" aria-label={`Roles de ${u.nombre}`} data-testid="roles-de-usuario">
                    {actuales.length ? actuales.map((r) => <Rol key={r.id} r={r} />) : <li className="sin">Sin roles</li>}
                  </ul>
                  <button type="button" className="ut-cambiar" onClick={() => { setElegidos(actuales.map((r) => r.id)); setError(null); setCambiando(true); }} aria-label={`Cambiar los roles de ${u.nombre}`} data-testid="cambiar-roles">
                    {trazo({ d: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4", tam: 18 })}Cambiar roles<span className="ut-flecha" aria-hidden="true">›</span>
                  </button>
                </>
              )}
            </div>
          )}
          {pestana === "sesiones" && (
            <div className="ut-panel" role="tabpanel">
              {acceso && cuantosAccesos > 0 ? <AccesoDeUsuario nombre={u.nombre} {...acceso} /> : <p className="ut-dato">{t.sinSesiones.corto}</p>}
            </div>
          )}
        </>
      )}
    </article>
  );
}

// Los roles que entran en una línea, alineados con el correo, y «+N» con los que no entran. Se
// miden en una copia invisible con todos, cada vez que cambia el ancho.
const SEPARACION = 6;
const ANCHO_DEL_MAS = 44;
export function cuantosEntran(anchos: number[], disponible: number): number {
  const total = anchos.reduce((s, a, i) => s + a + (i ? SEPARACION : 0), 0);
  if (total <= disponible) return anchos.length;
  let usado = 0;
  for (let i = 0; i < anchos.length; i++) {
    usado += anchos[i]! + (i ? SEPARACION : 0);
    if (usado + SEPARACION + ANCHO_DEL_MAS > disponible) return i;
  }
  return anchos.length;
}
function RolesEnUnaLinea({ roles, nombre }: { roles: RolAsignable[]; nombre: string }) {
  const linea = useRef<HTMLUListElement>(null);
  const medida = useRef<HTMLUListElement>(null);
  const [entran, setEntran] = useState(roles.length);
  useLayoutEffect(() => {
    const ul = linea.current, m = medida.current;
    if (!ul || !m) return;
    const medir = () => {
      const disponible = ul.clientWidth;
      setEntran(disponible ? cuantosEntran([...m.children].map((c) => (c as HTMLElement).offsetWidth), disponible) : roles.length);
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [roles]);
  if (!roles.length) return null;
  const quedan = roles.length - entran;
  return (
    <span className="ut-linea-roles">
      <ul ref={linea} aria-label={`Roles de ${nombre}: ${roles.map((r) => r.nombre).join(", ")}`}>
        {roles.slice(0, entran).map((r) => <Rol key={r.id} r={r} />)}
        {quedan > 0 && <li className="mas" data-testid="mas-roles">+{quedan}</li>}
      </ul>
      <ul ref={medida} className="ut-medida" aria-hidden="true">{roles.map((r) => <Rol key={r.id} r={r} />)}</ul>
    </span>
  );
}

// Sus sesiones y sus celulares con huella (decisión 100), como la v2: un renglón por sesión, con
// su ícono, cuándo se usó y si entra con la huella. «Cerrar» cierra la sesión; si el aparato tiene
// las dos cosas, «…» deja elegir entre cerrar la sesión y quitar la huella.
const hace = (iso: string | null) => {
  if (!iso) return "Todavía no se usó";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return min < 2 ? "Usándolo ahora" : min < 60 ? `Hace ${min} min` : min < 1440 ? `Hace ${Math.round(min / 60)} h` : `Usado el ${fecha(iso.slice(0, 10))}`;
};
function AccesoDeUsuario({ nombre, sesiones, celulares, alCerrarSesion, alQuitarCelular }: Acceso & { nombre: string; alCerrarSesion: (s: SesionFila) => void; alQuitarCelular: (c: CelularDeOtroFila) => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  // Cada sesión va en su renglón aunque dos aparatos se llamen igual (decisión 153); la huella se
  // junta con la primera sesión de su mismo nombre, y la que no tiene sesión va sola.
  const libres = [...celulares];
  const renglones: { clave: string; n: string; s?: SesionFila; c?: CelularDeOtroFila }[] = sesiones.map((s) => {
    const i = libres.findIndex((x) => (x.dispositivo ?? "Celular") === s.dispositivo);
    const c = i < 0 ? undefined : libres.splice(i, 1)[0];
    return { clave: s.id, n: s.dispositivo, s, c };
  });
  for (const c of libres) renglones.push({ clave: c.id, n: c.dispositivo ?? "Celular", c });
  return (
    <div className="ua-lista" data-testid="acceso-de-usuario">
      {renglones.map(({ clave, n, s, c }) => {
        const esCelu = Boolean(c) || /celular|android|iphone|samsung|moto/i.test(n);
        return (
          <div key={clave} className="ua-disp" data-testid={s ? "sesion" : "celular-de-otro"}>
            <span className="ua-ico"><IconoN nombre={esCelu ? "smartphone" : "monitor"} /></span>
            <span className="ua-texto"><b>{n}</b><small>{s ? hace(s.ultimo_uso_en) : c ? (c.ultimo_uso_en ? `Último uso ${fecha(c.ultimo_uso_en.slice(0, 10))}` : `Vinculado el ${fecha(c.creada_en.slice(0, 10))}`) : ""}{c && <> · <IconoN nombre="fingerprint" tam={16} /> con huella</>}</small></span>
            {s && c ? (
              <button type="button" className="ua-boton icono" aria-expanded={menu === clave} aria-label={`Qué hacer con ${n} de ${nombre}`} onClick={() => setMenu(menu === clave ? null : clave)}><IconoN nombre="ellipsis" tam={18} /></button>
            ) : s ? (
              <button type="button" className="ua-boton" onClick={() => alCerrarSesion(s)} aria-label={`Cerrar la sesión de ${nombre} en ${s.dispositivo}`}>Cerrar</button>
            ) : c ? (
              <button type="button" className="ua-boton" onClick={() => alQuitarCelular(c)} aria-label={`Quitar el celular ${c.dispositivo ?? ""} de ${nombre}`}>Quitar</button>
            ) : null}
            {menu === clave && s && c && (
              <span className="ua-menu">
                <button type="button" className="ua-boton" onClick={() => alCerrarSesion(s)} aria-label={`Cerrar la sesión de ${nombre} en ${s.dispositivo}`}>Cerrar la sesión</button>
                <button type="button" className="ua-boton" onClick={() => alQuitarCelular(c)} aria-label={`Quitar el celular ${c.dispositivo ?? ""} de ${nombre}`}>Quitar la huella</button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// El botón para autorizar a alguien, arriba de la lista, con su flecha (decisión 102).
export function AutorizarOtro({ alTocar }: { alTocar: () => void }) {
  return (
    <button type="button" className="ut-alta" onClick={alTocar} data-testid="autorizar">
      <span className="ut-mas" aria-hidden="true"><IconoN nombre="user-plus" /></span>
      <span><strong>{TEXTOS.usuarios.autorizarOtro.corto}</strong><small>{TEXTOS.usuarios.invitarAlguien.corto}</small></span>
      <span className="ut-alta-flecha" aria-hidden="true"><IconoN nombre="chevron-right" /></span>
    </button>
  );
}
