import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { NOMBRES, TEXTOS } from "../../../textos";
import { api, ErrorApi } from "../../../../api";
import { fecha } from "../../../../formato";
import { useSesion } from "../../../../sesion";
import { EVENTO_CREDENCIALES, hayHuella, listarCredenciales, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../../../../credenciales";
import { useEsCelular } from "../vista";
import { Aviso, Boton, Hoja, Icono, Pagina, Toast, Vacio, haceCuanto } from "../ui";
import { describirDispositivo } from "../dispositivo";
import { IconoCompu, comoCarga, esFallaDeRed, fechaCompleta, textoDeError, useEnLinea } from "./negocio-comun";
import { accesoDe, autorizar as autorizarPersona, cambiarUsuario, cerrarSesion, faltaEnAlta, partesResaltadas, quitarCelularDeOtro, resumenDelAcceso, useCelularesDeOtros, useSesiones, useUsuarios, type Acceso, type CelularDeOtroFila, type EstadoDeUsuario, type OrdenDeUsuarios, type SesionFila, type UsuarioFila } from "../../../../negocio/usuarios";
import { useFiltroDeUsuarios } from "../../../filtro-de-usuarios";
import { usePuede } from "../../../permisos";
import { ElegirRoles, useRolesAsignables, type RolAsignable } from "../../../RolesDeUsuario";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { IconoN, Iniciales, iconoDeRol } from "../../../iconos-de-negocio";
import { irA } from "../rutas";
import "../estilos/negocio.css";
import "../estilos/usuarios.css";
import type { HuellaVinculada } from "@servidor/credenciales";

type Mensaje = { texto: string; testId?: string };
type Avisar = (m: Mensaje) => void;

// Los avisos del servidor ya vienen en castellano y dicen qué hacer: se muestran tal cual.
function enPalabras(e: unknown, queNoSePudo: string): string {
  if (esFallaDeRed(e)) return textoDeError(e, queNoSePudo);
  const texto = (e as Error).message;
  return `${queNoSePudo}: ${texto}`;
}

// Más → Usuarios como la v2 («Tabla y ficha», decisión 148): arriba cuatro números, el buscador con
// «Todos», «Activos» y «Rol»; una persona por renglón con sus roles y su acceso, y a la derecha la
// ficha fija de la elegida, con sus roles, sus sesiones y celulares con huella y «Desactivar».
// «Roles y permisos» y «Autorizar a alguien» van al lado de las pestañas.
export function Usuarios() {
  const enLinea = useEnLinea();
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  return (
    <Pagina titulo={NOMBRES.usuarios} testId="usuarios-autorizados" className="usuarios uv" bajada={<span className="solo-lectores">{TEXTOS.usuarios.pestanaUsuarios.largo}</span>}>
      {!enLinea && <Aviso tipo="alerta" testId="usuarios-sin-conexion">Sin conexión: administrar usuarios necesita internet. Lo que ves puede no estar al día.</Aviso>}
      <Autorizados enLinea={enLinea} avisar={setMensaje} />
      <Toast texto={mensaje?.texto ?? null} alCerrar={() => setMensaje(null)} testId={mensaje?.testId ?? "mensaje"} />
    </Pagina>
  );
}

// Mis celulares con huella, en Configuración (decisión 99): cada uno los suyos.
export function MisCelulares() {
  const enLinea = useEnLinea();
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  return (
    <>
      <Celulares enLinea={enLinea} avisar={setMensaje} />
      <Toast texto={mensaje?.texto ?? null} alCerrar={() => setMensaje(null)} testId={mensaje?.testId ?? "mensaje"} />
    </>
  );
}

function Autorizados({ enLinea, avisar }: { enLinea: boolean; avisar: Avisar }) {
  const { sesion } = useSesion();
  const puedeEsto = usePuede();
  const yo = sesion.estado === "con-sesion" ? sesion.usuario.id : null;
  const lista = comoCarga(useUsuarios(), "No se pudieron traer los usuarios");
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [errorDeFila, setErrorDeFila] = useState<{ id: string; texto: string } | null>(null);
  const [alta, setAlta] = useState(false);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [cambiandoRoles, setCambiandoRoles] = useState(0);
  const filas = lista.datos ?? [];
  const activos = filas.filter((u) => u.activo).length;

  async function cambiar(u: UsuarioFila, cambios: { roles?: string[]; activo?: boolean }): Promise<string | null> {
    setOcupada(u.id); setErrorDeFila(null);
    try {
      await cambiarUsuario(u.id, cambios);
      if (cambios.activo === false) { avisar({ texto: `${u.nombre} ya no puede entrar: se le cerraron las sesiones abiertas.` }); }
      else if (cambios.activo) avisar({ texto: `${u.nombre} puede entrar de nuevo.` });
      else if (cambios.roles) avisar({ texto: `Roles de ${u.nombre} guardados.` });
      return null;
    } catch (e) {
      const texto = enPalabras(e, "No se pudo guardar el cambio");
      if (cambios.roles) return texto;
      setErrorDeFila({ id: u.id, texto }); return texto;
    } finally { setOcupada(null); }
  }

  const disponibles = useRolesAsignables();
  const filtro = useFiltroDeUsuarios(filas);
  // Sus sesiones y sus celulares con huella (decisión 100), en la ficha de cada persona.
  const sesiones = useSesiones();
  const celulares = useCelularesDeOtros();
  async function cerrarLaSesion(u: UsuarioFila, s: SesionFila) {
    setErrorDeFila(null);
    try { await cerrarSesion(s.id); avisar({ texto: `Se cerró la sesión de ${u.nombre} en ${s.dispositivo}.` }); }
    catch (e) { setErrorDeFila({ id: u.id, texto: enPalabras(e, `No se pudo cerrar la sesión de ${u.nombre}`) }); sesiones.recargar(); }
  }
  async function quitarElCelular(u: UsuarioFila, c: CelularDeOtroFila) {
    setErrorDeFila(null);
    try { await quitarCelularDeOtro(c.id); avisar({ texto: `«${c.dispositivo ?? "Ese celular"}» de ${u.nombre} ya no entra con la huella.`, testId: "mensaje-celular" }); }
    catch (e) { setErrorDeFila({ id: u.id, texto: enPalabras(e, `No se pudo quitar el celular de ${u.nombre}`) }); celulares.recargar(); }
  }
  const accesoDeLaFila = (u: UsuarioFila) => accesoDe(u.id, sesiones.datos, celulares.datos);
  const visibles = filtro.visibles;
  const elegida = visibles.find((u) => u.id === elegidaId) ?? visibles[0] ?? null;
  const lista$ = useRef<HTMLDivElement>(null);
  const buscador = useRef<HTMLInputElement>(null);

  // Alt R: Roles y permisos; Alt N: autorizar a alguien; /: buscar; R: cambiar los roles de la elegida.
  const teclas = useRef<(e: KeyboardEvent) => void>(() => undefined);
  teclas.current = (e: KeyboardEvent) => {
    const escribiendo = e.target instanceof HTMLElement && (e.target.closest("input, textarea, select, [contenteditable='true']") !== null);
    if (e.altKey && !e.ctrlKey && (e.key === "r" || e.key === "R") && puedeEsto("admin.roles")) { e.preventDefault(); irA("roles"); }
    else if (e.altKey && !e.ctrlKey && (e.key === "n" || e.key === "N") && enLinea) { e.preventDefault(); setAlta(true); }
    else if (!escribiendo && !e.altKey && !e.ctrlKey && !e.metaKey && e.key === "/") { e.preventDefault(); buscador.current?.focus(); }
    else if (!escribiendo && !e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "r" || e.key === "R") && elegida && !document.querySelector("dialog[open]")) { e.preventDefault(); setCambiandoRoles((n) => n + 1); }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => teclas.current(e);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  // ↑ ↓ recorren la lista y la ficha sigue a la elegida.
  function moverse(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const i = visibles.findIndex((u) => u.id === elegida?.id);
    const otra = visibles[Math.min(visibles.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (!otra) return;
    e.preventDefault();
    setElegidaId(otra.id);
    lista$.current?.querySelector<HTMLButtonElement>(`[data-id="${otra.id}"]`)?.focus();
  }

  const conHuella = new Set((celulares.datos ?? []).map((c) => c.usuario_id)).size;
  const formulario = <AltaDeUsuario disponibles={disponibles} enLinea={enLinea} alAutorizar={(u) => { setAlta(false); avisar({ texto: `${u.nombre} ya puede entrar con su cuenta de Google.` }); }} />;

  return (
    <>
      <AlLadoDeLasPestanas>
        {puedeEsto("admin.roles") && <button type="button" className="uv-boton" onClick={() => irA("roles")} aria-keyshortcuts="Alt+R" data-testid="ir-a-roles"><IconoN nombre="shield-check" tam={16} />Roles y permisos <span className="uv-kbd">Alt R</span></button>}
        <button type="button" className="uv-boton accion" disabled={!enLinea} onClick={() => setAlta(true)} aria-keyshortcuts="Alt+N" data-testid="autorizar"><IconoN nombre="user-plus" tam={16} />{TEXTOS.usuarios.autorizarOtro.largo} <span className="uv-kbd">Alt N</span></button>
      </AlLadoDeLasPestanas>
      <Aviso tipo="error" accion={<Boton tam="chico" onClick={lista.recargar}>Reintentar</Boton>}>{lista.error}</Aviso>
      {!lista.datos && !lista.error && <div className="tarjeta negocio-esqueleto" role="status" aria-label="Trayendo los usuarios">{[0, 1, 2].map((i) => <span key={i} className="esqueleto" />)}</div>}
      {lista.datos && (
        <section className="uv-pantalla" aria-labelledby="usuarios-autorizados-titulo">
          <h2 id="usuarios-autorizados-titulo" className="solo-lectores">Usuarios autorizados</h2>
          <div className="uv-izq">
            <div className="uv-kpis">
              <div className="uv-kpi"><span className="uv-kpi-ico"><IconoN nombre="users" /></span><span className="uv-kpi-va">{activos}</span><span className="uv-kpi-et">activos de {filas.length}</span></div>
              <div className="uv-kpi"><span className="uv-kpi-ico"><IconoN nombre="monitor" /></span><span className="uv-kpi-va">{sesiones.datos ? sesiones.datos.length : "—"}</span><span className="uv-kpi-et">{sesiones.datos?.length === 1 ? "sesión" : "sesiones"}</span></div>
              <div className="uv-kpi"><span className="uv-kpi-ico"><IconoN nombre="fingerprint" /></span><span className="uv-kpi-va">{celulares.datos ? conHuella : "—"}</span><span className="uv-kpi-et">con huella</span></div>
              <div className="uv-kpi" title="Todavía no se sabe quién no entra hace 30 días"><span className="uv-kpi-ico"><IconoN nombre="hourglass" /></span><span className="uv-kpi-va uv-gris">—</span><span className="uv-kpi-et">sin usar 30 días</span></div>
            </div>
            <FiltroDeUsuarios filtro={filtro} roles={disponibles} filas={filas} buscador={buscador} />
            <div className="uv-tabla" data-testid="usuarios" ref={lista$} onKeyDown={moverse}>
              <div className="uv-cab" aria-hidden="true"><span /><span>Persona</span><span>Roles</span><span>Acceso</span><span /></div>
              {visibles.map((u) => {
                const acceso = accesoDeLaFila(u);
                const roles = [...(u.roles ?? [])].sort((x, y) => Number(y.nombre === "Administrador") - Number(x.nombre === "Administrador"));
                // Los roles que entran en el renglón: dos si son cortos, si no uno, y «+N» con el resto.
                const entran = roles.length > 1 && roles[0]!.nombre.length + roles[1]!.nombre.length <= 20 ? 2 : 1;
                return (
                  <button key={u.id} type="button" data-id={u.id} className={`uv-fila ${u.id === elegida?.id ? "elegida" : ""} ${u.activo ? "" : "inactiva"}`} aria-pressed={u.id === elegida?.id} onClick={() => setElegidaId(u.id)} data-testid="usuario-fila">
                    <Iniciales nombre={u.nombre} clave={u.email} apagado={!u.activo} />
                    <span className="uv-quien"><span className="uv-nom">{u.nombre}{u.id === yo && <span className="uv-yo">Vos</span>}</span><span className="uv-mail">{u.email}</span></span>
                    <span className="uv-roles">
                      {roles.slice(0, entran).map((r) => <span key={r.id} className={`uv-rol ${r.nombre === "Administrador" ? "admin" : ""}`}><IconoN nombre={iconoDeRol(r.nombre)} tam={16} />{r.nombre}</span>)}
                      {roles.length > entran && <span className="uv-rol mas">+{roles.length - entran}</span>}
                      {roles.length === 0 && <span className="uv-gris">Sin roles</span>}
                    </span>
                    <span className="uv-acc">
                      {!u.activo ? <span className="uv-pastilla contorno">Inactivo</span>
                        : acceso.sesiones.length + acceso.celulares.length === 0 ? <span className="uv-gris" aria-label="Sin sesiones ni celulares">—</span>
                        : <span aria-label={resumenDelAcceso(acceso) ?? ""}><IconoN nombre="monitor" tam={16} />{acceso.sesiones.length} · <IconoN nombre="fingerprint" tam={16} />{acceso.celulares.length}</span>}
                    </span>
                    <IconoN nombre="chevron-right" className="uv-chev" />
                  </button>
                );
              })}
            </div>
          </div>
          {elegida && (
            <Ficha key={elegida.id} u={elegida} yo={yo} acceso={accesoDeLaFila(elegida)} disponibles={disponibles} enLinea={enLinea} ocupada={ocupada === elegida.id} error={errorDeFila?.id === elegida.id ? errorDeFila.texto : null}
              cambiandoRoles={cambiandoRoles} alGuardarRoles={(ids) => cambiar(elegida, { roles: ids })} alActivar={() => void cambiar(elegida, { activo: !elegida.activo })}
              alCerrarSesion={(s) => void cerrarLaSesion(elegida, s)} alQuitarCelular={(c) => void quitarElCelular(elegida, c)} />
          )}
        </section>
      )}
      {alta && <Hoja titulo={TEXTOS.usuarios.autorizarOtro.largo} alCerrar={() => setAlta(false)} testId="hoja-autorizar">{formulario}</Hoja>}
    </>
  );
}

// La ficha de la persona elegida, fija a la derecha: quién es y desde cuándo, sus roles con lo que
// permiten en palabras («Cambiar», R), sus sesiones con «Cerrar», sus celulares con huella con
// «Quitar» y, abajo, «Desactivar» o «Reactivar» y «Todo lo que hizo».
function Ficha({ u, yo, acceso, disponibles, enLinea, ocupada, error, cambiandoRoles, alGuardarRoles, alActivar, alCerrarSesion, alQuitarCelular }: {
  u: UsuarioFila; yo: string | null; acceso: Acceso; disponibles: RolAsignable[]; enLinea: boolean; ocupada: boolean; error: string | null; cambiandoRoles: number;
  alGuardarRoles: (ids: string[]) => Promise<string | null>; alActivar: () => void; alCerrarSesion: (s: SesionFila) => void; alQuitarCelular: (c: CelularDeOtroFila) => void;
}) {
  const roles = u.roles ?? [];
  const [cambiando, setCambiando] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const abrir = () => { setElegidos(roles.map((r) => r.id)); setErrorRoles(null); setCambiando(true); };
  const primera = useRef(cambiandoRoles);
  useEffect(() => { if (cambiandoRoles !== primera.current && enLinea) abrir(); }, [cambiandoRoles]); // eslint-disable-line react-hooks/exhaustive-deps
  async function guardar() {
    if (elegidos.length === 0) { setErrorRoles(TEXTOS.usuarios.faltaUnRol.largo); return; }
    setGuardando(true); setErrorRoles(null);
    const falla = await alGuardarRoles(elegidos);
    setGuardando(false);
    if (falla) setErrorRoles(falla); else setCambiando(false);
  }
  const descripcion = roles.map((r) => disponibles.find((d) => d.id === r.id)?.descripcion).filter(Boolean).join(" ");
  return (
    <aside className="uv-ficha" aria-label={`Ficha de ${u.nombre}`} data-testid="ficha-usuario">
      <div className="uv-ficha-quien">
        <Iniciales nombre={u.nombre} clave={u.email} tam="l" apagado={!u.activo} />
        <div className="uv-ficha-textos"><div className="uv-ficha-nombre">{u.nombre}{u.id === yo && <span className="uv-yo">Vos</span>}</div><div className="uv-detalle uv-cortar">{u.email}</div><div className="uv-detalle">Desde el {fecha(u.creado_en.slice(0, 10))}{u.activo ? "" : " · desactivado"}</div></div>
      </div>
      <div className="uv-sep" />
      <div data-testid="roles-de-usuario">
        <h3>{TEXTOS.usuarios.roles.largo}{!cambiando && <button type="button" className="uv-boton suave" disabled={ocupada || !enLinea} onClick={abrir} aria-keyshortcuts="R" aria-label={`Cambiar los roles de ${u.nombre}`} data-testid="cambiar-roles"><IconoN nombre="pencil" tam={16} />Cambiar <span className="uv-kbd">R</span></button>}</h3>
        {!cambiando && <div className="uv-roles uv-roles-ficha">{roles.length ? roles.map((r) => <span key={r.id} className={`uv-rol ${r.nombre === "Administrador" ? "admin" : ""}`}><IconoN nombre={iconoDeRol(r.nombre)} tam={16} />{r.nombre}</span>) : <span className="uv-gris">Sin roles</span>}</div>}
        {!cambiando && descripcion && <p className="uv-puede">{descripcion}</p>}
        {cambiando && (
          <div className="ru-panel">
            <ElegirRoles disponibles={disponibles} elegidos={elegidos} alCambiar={(ids) => { setElegidos(ids); setErrorRoles(null); }} nombre={u.nombre} />
            {errorRoles && <p className="rl-error" role="alert">{errorRoles}</p>}
            <div className="rl-acciones">
              <button type="button" className="rl-boton" onClick={() => setCambiando(false)}>Cancelar</button>
              <button type="button" className="rl-boton fuerte" disabled={guardando} onClick={() => void guardar()} data-testid="guardar-roles">{guardando ? "Guardando…" : "Guardar roles"}</button>
            </div>
          </div>
        )}
      </div>
      <div className="uv-sep" />
      <div data-testid="lista-de-acceso">
        <h3>Sesiones abiertas ({acceso.sesiones.length})</h3>
        {acceso.sesiones.length === 0 && <p className="uv-detalle">No tiene sesiones abiertas.</p>}
        {acceso.sesiones.map((s) => (
          <div key={s.id} className="uv-disp" data-testid="sesion">
            <span className="uv-disp-ico">{/celular/i.test(s.dispositivo) ? <IconoN nombre="smartphone" /> : <IconoN nombre="monitor" />}</span>
            <div className="uv-disp-texto"><div className="uv-disp-n">{s.dispositivo}</div><div className="uv-detalle" title={fechaCompleta(s.ultimo_uso_en)}>usada {haceCuanto(s.ultimo_uso_en)}</div></div>
            <button type="button" className="uv-boton suave" disabled={!enLinea} onClick={() => alCerrarSesion(s)} aria-label={`Cerrar la sesión de ${u.nombre} en ${s.dispositivo}`}>Cerrar</button>
          </div>
        ))}
      </div>
      <div>
        <h3>Celular con huella ({acceso.celulares.length})</h3>
        {acceso.celulares.length === 0 && <p className="uv-detalle">No vinculó ningún celular.</p>}
        {acceso.celulares.map((c) => (
          <div key={c.id} className="uv-disp" data-testid="celular-de-otro">
            <span className="uv-disp-ico"><IconoN nombre="fingerprint" /></span>
            <div className="uv-disp-texto"><div className="uv-disp-n">{c.dispositivo ?? "Celular"}</div><div className="uv-detalle">{c.ultimo_uso_en ? `Último uso ${fecha(c.ultimo_uso_en.slice(0, 10))}` : `Vinculado el ${fecha(c.creada_en.slice(0, 10))}`}</div></div>
            <button type="button" className="uv-boton suave" disabled={!enLinea} onClick={() => alQuitarCelular(c)} aria-label={`Quitar el celular ${c.dispositivo ?? ""} de ${u.nombre}`}>Quitar</button>
          </div>
        ))}
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="uv-pie">
        {u.id === yo ? <span className="uv-detalle uv-crece">A vos te desactiva otra persona</span> : (
          <button type="button" className={`uv-boton ${u.activo ? "peligro" : "suave"} uv-crece`} disabled={ocupada || !enLinea} onClick={alActivar} aria-label={`${u.activo ? "Desactivar" : "Reactivar"} a ${u.nombre}`}>
            <IconoN nombre={u.activo ? "user-x" : "user-check"} tam={16} />{ocupada ? "Guardando…" : u.activo ? "Desactivar" : "Reactivar"}
          </button>
        )}
        <button type="button" className="uv-boton fantasma" onClick={() => irA("actividad")}>Todo lo que hizo</button>
      </div>
    </aside>
  );
}

// Arriba de la lista, como la v2: el buscador (con sus sugerencias y la tecla /), «Todos (N)» y
// «Activos (N)», y «Rol», que abre el panel con los roles, el estado y el orden (decisiones 98 y 102).
function FiltroDeUsuarios({ filtro: f, roles, filas, buscador }: { filtro: ReturnType<typeof useFiltroDeUsuarios<UsuarioFila>>; roles: RolAsignable[]; filas: UsuarioFila[]; buscador: React.RefObject<HTMLInputElement> }) {
  const t = TEXTOS.usuarios;
  const [panel, setPanel] = useState(false);
  const estados: [EstadoDeUsuario, string][] = [["todos", t.todos.largo], ["activos", t.activos.largo], ["inactivos", t.inactivos.largo]];
  const activos = filas.filter((u) => u.activo).length;
  return (
    <div className="uv-barra" data-testid="filtro-usuarios">
      <label className="uv-campo">
        <span className="solo-lectores">{t.buscar.largo}</span>
        <IconoN nombre="search" />
        <input ref={buscador} {...f.combo} type="search" value={f.texto} placeholder="Buscá nombre o correo" autoComplete="off" autoCapitalize="none" spellCheck={false}
          onChange={(e) => f.escribir(e.target.value)} onKeyDown={f.alTeclear} onBlur={f.cerrar} data-testid="buscar-usuario" />
        {f.texto ? <button type="button" className="usuarios-borrar" onClick={f.borrar} aria-label={t.borrarBusqueda.largo}>✕</button> : <span className="uv-kbd" aria-hidden="true">/</span>}
        {f.sugerencias.length > 0 && (
          <ul className="usuarios-sugerencias" id={f.listaId} role="listbox" aria-label={t.buscar.largo}>
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
        )}
      </label>
      <button type="button" className={`uv-chip ${f.estado === "todos" ? "elegido" : ""}`} aria-pressed={f.estado === "todos"} onClick={() => f.elegirEstado("todos")}>{t.todos.largo} ({filas.length})</button>
      <button type="button" className={`uv-chip ${f.estado === "activos" ? "elegido" : ""}`} aria-pressed={f.estado === "activos"} onClick={() => f.elegirEstado("activos")}>{t.activos.largo} ({activos})</button>
      <div className="usuarios-filtros">
        <button type="button" className={`uv-boton ${f.roles.length || f.estado === "inactivos" ? "con-filtros" : ""}`} aria-expanded={panel} onClick={() => setPanel(!panel)} data-testid="abrir-filtros">
          <IconoN nombre="list-filter" tam={16} />Rol{f.filtrado && <span className="usuarios-aviso" aria-label="con filtros puestos" />}
        </button>
        {panel && (
          <div className="usuarios-panel" role="dialog" aria-label={t.filtros.largo} data-testid="panel-filtros" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setPanel(false); } }}>
            <div className="usuarios-panel-cab"><h3>{t.roles.largo}</h3><small className="detalle">{t.unoOMas.largo}</small></div>
            <div className="usuarios-opciones" role="group" aria-label={t.roles.largo}>
              <button type="button" className={f.roles.length === 0 ? "si" : ""} aria-pressed={f.roles.length === 0} onClick={f.todosLosRoles}>{t.todos.largo}</button>
              {roles.map((r) => <button key={r.id} type="button" className={f.roles.includes(r.id) ? "si" : ""} aria-pressed={f.roles.includes(r.id)} onClick={() => f.alternarRol(r.id)}>{r.nombre}</button>)}
            </div>
            <div className="usuarios-panel-cab"><h3>{t.estado.largo}</h3></div>
            <div className="usuarios-opciones" role="group" aria-label={t.estado.largo}>
              {estados.map(([valor, nombre]) => (
                <button key={valor} type="button" className={f.estado === valor ? "si" : ""} aria-pressed={f.estado === valor} onClick={() => f.elegirEstado(valor)}>
                  {valor !== "todos" && <i className={`usuarios-punto ${valor}`} />}{nombre}
                </button>
              ))}
            </div>
            <div className="usuarios-panel-cab"><h3>{t.ordenarPor.largo}</h3></div>
            <div className="usuarios-opciones" role="group" aria-label={t.ordenarPor.largo}>
              {([["correo", t.porCorreo.largo], ["estado", t.porEstado.largo]] as [OrdenDeUsuarios, string][]).map(([valor, nombre]) => (
                <button key={valor} type="button" className={f.orden === valor ? "si" : ""} aria-pressed={f.orden === valor} onClick={() => f.elegirOrden(valor)} data-testid={`ordenar-${valor}`}>{nombre}</button>
              ))}
            </div>
            <div className="usuarios-panel-pie">
              <Boton tam="chico" onClick={f.quitarFiltros}>{t.quitarFiltros.largo}</Boton>
              <Boton tam="chico" variante="principal" onClick={() => setPanel(false)} data-testid="ver-usuarios">{t.aplicarFiltros.largo} · Ver {f.conLosFiltros} {f.conLosFiltros === 1 ? "usuario" : "usuarios"}</Boton>
            </div>
          </div>
        )}
      </div>
      <span className="solo-lectores" role="status" data-testid="cuantos-quedan">{f.resumen}</span>
    </div>
  );
}

// Autorizar es agregar el correo de Google de la persona: no hay contraseña que crear.
function AltaDeUsuario({ disponibles, enLinea, alAutorizar }: { disponibles: RolAsignable[]; enLinea: boolean; alAutorizar: (u: { nombre: string }) => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [errores, setErrores] = useState<{ nombre?: string; email?: string; roles?: string; general?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const cajaNombre = useRef<HTMLInputElement>(null);
  const id = useId();

  async function autorizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const faltas: typeof errores = faltaEnAlta({ nombre, email, roles }, TEXTOS.usuarios.faltaUnRol.largo) ?? {};
    setErrores(faltas);
    if (faltas.nombre) { cajaNombre.current?.focus(); return; }
    if (faltas.email) { document.getElementById(`${id}-email`)?.focus(); return; }
    if (faltas.roles) return;
    setGuardando(true);
    try {
      await autorizarPersona({ nombre, email, roles });
      const autorizado = nombre.trim();
      // El alta queda lista para cargar a otra persona.
      setNombre(""); setEmail(""); setRoles([]); setErrores({});
      cajaNombre.current?.focus();
      alAutorizar({ nombre: autorizado });
    } catch (err) {
      // Lo escrito no se pierde: el error va junto al campo que lo causó.
      if (err instanceof ErrorApi && err.estado === 409) setErrores({ email: "Ese correo ya está autorizado: figura en la lista. Si está desactivado, reactivalo." });
      else setErrores({ general: enPalabras(err, "No se pudo autorizar") });
    } finally { setGuardando(false); }
  }

  return (
    <form onSubmit={autorizar} className="usuarios-formulario" data-testid="alta-usuario" noValidate aria-labelledby={`${id}-titulo`}>
      <div className="usuarios-formulario-titulo">
        <h3 id={`${id}-titulo`}>Autorizar a alguien</h3>
        <p className="detalle">Con su correo de Google ya puede entrar. No hay contraseñas que crear.</p>
      </div>
      <label className="campo">
        <span>Nombre</span>
        <input ref={cajaNombre} className="entrada" name="nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); setErrores((x) => ({ ...x, nombre: undefined })); }} autoComplete="off"
          aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? `${id}-error-nombre` : undefined} />
        {errores.nombre && <small className="usuarios-error" id={`${id}-error-nombre`} role="alert">{errores.nombre}</small>}
      </label>
      <label className="campo">
        <span>Correo de Google</span>
        <input id={`${id}-email`} className="entrada" name="email" type="email" inputMode="email" placeholder="nombre@gmail.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrores((x) => ({ ...x, email: undefined })); }} autoComplete="off" autoCapitalize="none" spellCheck={false}
          aria-invalid={Boolean(errores.email)} aria-describedby={errores.email ? `${id}-error-email` : undefined} />
        {errores.email && <small className="usuarios-error" id={`${id}-error-email`} role="alert">{errores.email}</small>}
      </label>
      <div className="campo usuarios-roles-del-alta">
        <ElegirRoles disponibles={disponibles} elegidos={roles} alCambiar={(ids) => { setRoles(ids); setErrores((x) => ({ ...x, roles: undefined })); }} />
        {errores.roles && <small className="usuarios-error" role="alert">{errores.roles}</small>}
      </div>
      <Boton type="submit" variante="principal" icono="mas" disabled={guardando || !enLinea} className="usuarios-autorizar">{guardando ? "Autorizando…" : "Autorizar"}</Boton>
      <Aviso tipo="error">{errores.general}</Aviso>
    </form>
  );
}

// Mis celulares vinculados: desde acá se vincula este dispositivo con la huella, y se quita uno
// perdido. Cada usuario ve los suyos; los de otros, quien administra usuarios, en su fila.
function Celulares({ enLinea, avisar }: { enLinea: boolean; avisar: Avisar }) {
  const esCelular = useEsCelular();
  const [filas, setFilas] = useState<Credencial[] | null>(null);
  const [error, setError] = useState<{ texto: string; reintentar?: () => void } | null>(null);
  const [nombrando, setNombrando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const puede = hayHuella();

  function cargar() {
    listarCredenciales().then((f) => { setFilas(f); setError(null); }).catch((e: unknown) => setError({ texto: textoDeError(e, "No se pudieron traer los celulares vinculados"), reintentar: cargar }));
  }
  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_CREDENCIALES, cargar);
    window.addEventListener("online", cargar);
    return () => { window.removeEventListener(EVENTO_CREDENCIALES, cargar); window.removeEventListener("online", cargar); };
  }, []);

  async function quitar(c: Credencial) {
    setOcupado(c.id); setError(null);
    try {
      await quitarCredencial(c.id);
      avisar({ texto: `«${c.dispositivo ?? "Ese celular"}» ya no entra con la huella.`, testId: "mensaje-celular" });
      cargar();
    } catch (e) { setError({ texto: enPalabras(e, "No se pudo quitar el celular"), reintentar: () => void quitar(c) }); }
    finally { setOcupado(null); }
  }

  const vincular = puede ? (
    <Boton icono="huella" tam={esCelular ? "grande" : undefined} ancho={esCelular} disabled={!enLinea} onClick={() => setNombrando(true)} data-testid="vincular-celular">Vincular este celular con mi huella</Boton>
  ) : null;
  const usos = (c: Credencial) => c.ultimo_uso_en ? fecha(c.ultimo_uso_en.slice(0, 10)) : "Todavía no";

  return (
    <section className="negocio-seccion" data-testid="celulares" aria-labelledby="usuarios-celulares">
      <header className="negocio-seccion-cabeza">
        <h2 id="usuarios-celulares">Mis celulares con huella</h2>
        {!esCelular && filas && filas.length > 0 && vincular}
        <p className="detalle">Vinculá el celular una vez y desde entonces entra con la huella, sin Google. Si lo perdés, quitalo de acá.</p>
      </header>
      <Aviso tipo="error" accion={error?.reintentar ? <Boton tam="chico" onClick={error.reintentar}>Reintentar</Boton> : undefined}>{error?.texto}</Aviso>
      {!filas && !error && <div className="tarjeta negocio-esqueleto" role="status" aria-label="Trayendo los celulares">{[0, 1].map((i) => <span key={i} className="esqueleto" />)}</div>}
      {filas && filas.length === 0 && (
        <div className="tarjeta">
          <Vacio icono="huella" titulo="No hay ningún celular vinculado" accion={vincular}>
            {puede ? "Vinculá el que tenés en la mano y la próxima vez entrás apoyando el dedo." : "Abrí Ferrebress en el celular y vinculalo desde esta misma pantalla."}
          </Vacio>
        </div>
      )}
      {filas && filas.length > 0 && (esCelular ? (
        <ul className="lista">
          {filas.map((c) => (
            <li key={c.id} className="renglon" data-testid="celular">
              <span className="nombre">{c.dispositivo ?? "Celular"}</span>
              <Boton variante="peligro" disabled={ocupado === c.id || !enLinea} onClick={() => quitar(c)} aria-label={`Quitar ${c.dispositivo ?? "este celular"}`}>Quitar</Boton>
              <span className="detalle">Vinculado el {fecha(c.creada_en.slice(0, 10))} · último uso: {usos(c).toLowerCase()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="tabla-marco">
          <table className="tabla">
            <thead><tr><th scope="col">Celular</th><th scope="col">Vinculado el</th><th scope="col">Último uso</th><th scope="col" className="angosta"><span className="solo-lectores">Acción</span></th></tr></thead>
            <tbody>
              {filas.map((c) => (
                <tr key={c.id} data-testid="celular">
                  <td><span className="usuarios-dispositivo nombre"><Icono nombre="celular" tam={18} />{c.dispositivo ?? "Celular"}</span></td>
                  <td>{fecha(c.creada_en.slice(0, 10))}</td>
                  <td className={c.ultimo_uso_en ? "" : "detalle"}>{usos(c)}</td>
                  <td className="angosta usuarios-celda-accion"><Boton tam="chico" variante="peligro" disabled={ocupado === c.id || !enLinea} onClick={() => quitar(c)} aria-label={`Quitar ${c.dispositivo ?? "este celular"}`}>Quitar</Boton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {filas && filas.length > 0 && esCelular && vincular}
      {!puede && <Aviso>Este dispositivo no tiene lector de huella o desbloqueo compatible: vinculá desde el celular.</Aviso>}
      {nombrando && <NombrarCelular alCerrar={() => setNombrando(false)} alVincular={(c) => { setNombrando(false); avisar({ texto: `Listo: «${c.dispositivo ?? "este celular"}» entra con la huella desde ahora.`, testId: "mensaje-celular" }); cargar(); }} />}
    </section>
  );
}

// El nombre se pide dentro de la app, con uno propuesto que se puede dejar como está.
function NombrarCelular({ alCerrar, alVincular }: { alCerrar: () => void; alVincular: (c: HuellaVinculada) => void }) {
  const [nombre, setNombre] = useState(() => describirDispositivo().slice(0, 40));
  const [vinculando, setVinculando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  async function vincular(e: FormEvent) {
    e.preventDefault();
    setVinculando(true); setError(null);
    try { alVincular(await vincularEsteDispositivo(nombre.trim() || describirDispositivo().slice(0, 40))); }
    catch (err) {
      const nombreDelError = (err as Error).name;
      setError(nombreDelError === "NotAllowedError" || nombreDelError === "AbortError" ? "No se pudo leer la huella: el celular no quedó vinculado. Probá de nuevo."
        : nombreDelError === "InvalidStateError" ? "Este dispositivo ya estaba vinculado a tu cuenta: ya entra con la huella."
        : enPalabras(err, "No se pudo vincular"));
      setVinculando(false);
    }
  }

  return (
    <Hoja titulo="Vincular este celular con mi huella" alCerrar={alCerrar} testId="hoja-vincular">
      <form onSubmit={vincular} className="pila" noValidate>
        <label className="campo">
          <span>¿Cómo llamamos a este celular?</span>
          <input className="entrada" value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)} onFocus={(e) => e.target.select()} autoFocus autoComplete="off" aria-describedby={`${id}-ayuda`} data-testid="nombre-celular" />
          <small className="detalle" id={`${id}-ayuda`}>Sirve para reconocerlo en la lista. Podés dejar el que está.</small>
        </label>
        <Aviso tipo="error">{error}</Aviso>
        {vinculando && <p className="detalle" role="status">El celular te va a pedir la huella…</p>}
        <div className="hoja-pie">
          <Boton onClick={alCerrar} disabled={vinculando}>Ahora no</Boton>
          <Boton type="submit" variante="principal" icono="huella" disabled={vinculando} data-testid="confirmar-vincular">{vinculando ? "Leyendo…" : "Vincular"}</Boton>
        </div>
      </form>
    </Hoja>
  );
}
