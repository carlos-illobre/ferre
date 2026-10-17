import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { DiasDelVinculoDelNegocio } from "../../../Vinculo";
import { NOMBRES, TEXTOS } from "../../../textos";
import { api, ErrorApi } from "../../../../api";
import { fecha } from "../../../../formato";
import { useSesion } from "../../../../sesion";
import { EVENTO_CREDENCIALES, hayHuella, listarCredenciales, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../../../../credenciales";
import { useEsCelular } from "../vista";
import { Aviso, Boton, Hoja, Icono, Pagina, Pastilla, Toast, Vacio, haceCuanto } from "../ui";
import { describirDispositivo } from "../dispositivo";
import { IconoCompu, comoCarga, esFallaDeRed, fechaCompleta, textoDeError, useEnLinea } from "./negocio-comun";
import { accesoDe, autorizar as autorizarPersona, cambiarUsuario, cerrarSesion, faltaEnAlta, partesResaltadas, quitarCelularDeOtro, resumenDelAcceso, useCelularesDeOtros, useSesiones, useUsuarios, type Acceso, type CelularDeOtroFila, type SesionFila, type UsuarioFila } from "../../../../negocio/usuarios";
import { useFiltroDeUsuarios } from "../../../filtro-de-usuarios";
import { usePuede } from "../../../permisos";
import { ElegirRoles, RolesDeUsuario, useRolesAsignables, type RolAsignable } from "../../../RolesDeUsuario";
import "../estilos/negocio.css";
import type { HuellaVinculada } from "@servidor/credenciales";

type Mensaje = { texto: string; testId?: string };
type Avisar = (m: Mensaje) => void;

// Los avisos del servidor ya vienen en castellano y dicen qué hacer: se muestran tal cual.
function enPalabras(e: unknown, queNoSePudo: string): string {
  if (esFallaDeRed(e)) return textoDeError(e, queNoSePudo);
  const texto = (e as Error).message;
  return `${queNoSePudo}: ${texto}`;
}

// Más → Usuarios (decisiones 88 y 100): la pestaña Usuarios es quién puede entrar y con qué roles
// y, en la fila de cada persona, sus sesiones y sus celulares con huella; al final, cuántos días
// dura el vínculo. Los celulares propios y el vínculo de cada uno están en Configuración.
export function Usuarios() {
  const enLinea = useEnLinea();
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  return (
    <Pagina titulo={NOMBRES.usuarios} testId="usuarios-autorizados" className="usuarios" bajada={TEXTOS.usuarios.pestanaUsuarios.largo}>
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
  const yo = sesion.estado === "con-sesion" ? sesion.usuario.id : null;
  const esCelular = useEsCelular();
  const lista = comoCarga(useUsuarios(), "No se pudieron traer los usuarios");
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [errorDeFila, setErrorDeFila] = useState<{ id: string; texto: string } | null>(null);
  const [alta, setAlta] = useState(false);
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
  const filtro = useFiltroDeUsuarios(filas, disponibles);
  // Sus sesiones y sus celulares con huella (decisión 100), en la fila de cada persona.
  const sesiones = useSesiones();
  const celulares = useCelularesDeOtros();
  const [desplegado, setDesplegado] = useState<string | null>(null);
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
  const lineaDeAcceso = (u: UsuarioFila) => {
    const resumen = resumenDelAcceso(accesoDeLaFila(u), !esCelular);
    if (!resumen) return <span className="detalle" aria-label="Sin sesiones ni celulares">—</span>;
    const abierto = desplegado === u.id;
    return (
      <button type="button" className={`usuarios-acceso ${abierto ? "abierto" : ""}`} aria-expanded={abierto} onClick={() => setDesplegado(abierto ? null : u.id)}
        aria-label={`Sesiones y celulares de ${u.nombre}: ${resumen}`} data-testid="acceso-de-usuario">
        <span>{resumen}</span><Icono nombre={abierto ? "arriba" : "derecha"} tam={14} />
      </button>
    );
  };
  const listaDeAcceso = (u: UsuarioFila) => desplegado === u.id && (
    <ListaDeAcceso nombre={u.nombre} {...accesoDeLaFila(u)} enLinea={enLinea} alCerrarSesion={(s) => void cerrarLaSesion(u, s)} alQuitarCelular={(c) => void quitarElCelular(u, c)} />
  );
  const rolDe = (u: UsuarioFila) => <RolesDeUsuario disponibles={disponibles} actuales={u.roles ?? []} nombre={u.nombre} bloqueado={ocupada === u.id || !enLinea} alGuardar={(ids) => cambiar(u, { roles: ids })} />;
  const accionDe = (u: UsuarioFila) => u.id === yo ? <span className="detalle">A vos te desactiva otra persona</span> : (
    <Boton tam={esCelular ? undefined : "chico"} variante={u.activo ? "peligro" : undefined} disabled={ocupada === u.id || !enLinea} onClick={() => cambiar(u, { activo: !u.activo })} aria-label={`${u.activo ? "Desactivar" : "Reactivar"} a ${u.nombre}`}>
      {ocupada === u.id ? "Guardando…" : u.activo ? "Desactivar" : "Reactivar"}
    </Boton>
  );
  const estadoDe = (u: UsuarioFila) => <Pastilla tipo={u.activo ? "ok" : undefined}>{u.activo ? "Activo" : "Desactivado"}</Pastilla>;
  const errorDe = (u: UsuarioFila) => errorDeFila?.id === u.id ? <Aviso tipo="error">{errorDeFila.texto}</Aviso> : null;
  const formulario = <AltaDeUsuario disponibles={disponibles} enLinea={enLinea} alAutorizar={(u) => { setAlta(false); avisar({ texto: `${u.nombre} ya puede entrar con su cuenta de Google.` }); }} />;

  return (
    <section className="negocio-seccion" aria-labelledby="usuarios-autorizados">
      <header className="negocio-seccion-cabeza">
        <h2 id="usuarios-autorizados">Usuarios autorizados</h2>
        {lista.datos && <span className="detalle">{activos} de {filas.length} pueden entrar</span>}
      </header>
      <Aviso tipo="error" accion={<Boton tam="chico" onClick={lista.recargar}>Reintentar</Boton>}>{lista.error}</Aviso>
      {!lista.datos && !lista.error && <div className="tarjeta negocio-esqueleto" role="status" aria-label="Trayendo los usuarios">{[0, 1, 2].map((i) => <span key={i} className="esqueleto" />)}</div>}

      {lista.datos && <FiltroDeUsuarios filtro={filtro} roles={disponibles} />}
      {lista.datos && (esCelular ? (
        <>
          <ul className="lista" data-testid="usuarios">
            {filtro.visibles.map((u) => (
              <li key={u.id} className={`usuarios-tarjeta ${u.activo ? "" : "apagada"}`} data-testid="usuario-fila">
                <div className="fila">
                  <strong className="crece nombre">{u.nombre}{u.id === yo && <> <Pastilla tipo="azul" sinPunto>Vos</Pastilla></>}</strong>
                  {estadoDe(u)}
                </div>
                <span className="detalle usuarios-correo">{u.email}</span>
                <div className="fila usuarios-acciones">{rolDe(u)}{accionDe(u)}</div>
                {lineaDeAcceso(u)}
                {listaDeAcceso(u)}
                {errorDe(u)}
              </li>
            ))}
          </ul>
          <Boton variante="principal" tam="grande" ancho icono="mas" disabled={!enLinea} onClick={() => setAlta(true)} data-testid="autorizar">Autorizar a alguien</Boton>
          {alta && <Hoja titulo="Autorizar a alguien" alCerrar={() => setAlta(false)} testId="hoja-autorizar">{formulario}</Hoja>}
        </>
      ) : (
        <div className="tabla-marco">
          <table className="tabla" data-testid="usuarios">
            <thead><tr><th scope="col">Nombre</th><th scope="col">Correo de Google</th><th scope="col">Roles</th><th scope="col">Estado</th><th scope="col">Acceso</th><th scope="col" className="angosta"><span className="solo-lectores">Acción</span></th></tr></thead>
            <tbody>
              {filtro.visibles.map((u) => (
                <FilaConError key={u.id} error={errorDe(u)} columnas={6} debajo={listaDeAcceso(u)}>
                  <tr className={u.activo ? "" : "atenuada"} data-testid="usuario-fila">
                    <td className="nombre">{u.nombre}{u.id === yo && <> <Pastilla tipo="azul" sinPunto>Vos</Pastilla></>}</td>
                    <td>{u.email}</td>
                    <td>{rolDe(u)}</td>
                    <td>{estadoDe(u)}</td>
                    <td>{lineaDeAcceso(u)}</td>
                    <td className="angosta usuarios-celda-accion">{accionDe(u)}</td>
                  </tr>
                </FilaConError>
              ))}
            </tbody>
          </table>
          <div className="usuarios-alta">{formulario}</div>
        </div>
      ))}
      {lista.datos && <DiasDelVinculoDelNegocio />}
    </section>
  );
}

// Lo que se despliega de la línea de acceso: las sesiones de la persona, con «Cerrar», y sus
// celulares con huella, con «Quitar» (decisión 100).
function ListaDeAcceso({ nombre, sesiones, celulares, enLinea, alCerrarSesion, alQuitarCelular }: Acceso & { nombre: string; enLinea: boolean; alCerrarSesion: (s: SesionFila) => void; alQuitarCelular: (c: CelularDeOtroFila) => void }) {
  return (
    <div className="usuarios-acceso-lista" data-testid="lista-de-acceso">
      {sesiones.length > 0 && <h3>Sesiones abiertas</h3>}
      {sesiones.map((s) => (
        <div key={s.id} className="usuarios-acceso-item" data-testid="sesion">
          <span><span className="usuarios-dispositivo">{/celular/i.test(s.dispositivo) ? <Icono nombre="celular" tam={18} /> : <IconoCompu tam={18} />}{s.dispositivo}</span><small className="detalle" title={fechaCompleta(s.ultimo_uso_en)}>usada {haceCuanto(s.ultimo_uso_en)}</small></span>
          <Boton tam="chico" variante="peligro" disabled={!enLinea} onClick={() => alCerrarSesion(s)} aria-label={`Cerrar la sesión de ${nombre} en ${s.dispositivo}`}>Cerrar</Boton>
        </div>
      ))}
      {celulares.length > 0 && <h3>Celulares con huella</h3>}
      {celulares.map((c) => (
        <div key={c.id} className="usuarios-acceso-item" data-testid="celular-de-otro">
          <span><span className="usuarios-dispositivo"><Icono nombre="celular" tam={18} />{c.dispositivo ?? "Celular"}</span><small className="detalle">vinculado el {fecha(c.creada_en.slice(0, 10))} · {c.ultimo_uso_en ? `último uso ${fecha(c.ultimo_uso_en.slice(0, 10))}` : "todavía no se usó"}</small></span>
          <Boton tam="chico" variante="peligro" disabled={!enLinea} onClick={() => alQuitarCelular(c)} aria-label={`Quitar el celular ${c.dispositivo ?? ""} de ${nombre}`}>Quitar</Boton>
        </div>
      ))}
    </div>
  );
}

// Arriba de la tabla (decisión 98): el buscador con sus sugerencias, la lista «Rol» y cuántos quedan.
function FiltroDeUsuarios({ filtro: f, roles }: { filtro: ReturnType<typeof useFiltroDeUsuarios<UsuarioFila>>; roles: RolAsignable[] }) {
  const t = TEXTOS.usuarios;
  return (
    <div className="usuarios-filtro" data-testid="filtro-usuarios">
      <label className="campo usuarios-buscar">
        <span>{t.buscar.largo}</span>
        <span className="usuarios-buscar-caja">
          <Icono nombre="buscar" tam={18} />
          <input {...f.combo} className="entrada" type="search" value={f.texto} placeholder={t.correoONombre.largo} autoComplete="off" autoCapitalize="none" spellCheck={false}
            onChange={(e) => f.escribir(e.target.value)} onKeyDown={f.alTeclear} onBlur={f.cerrar} data-testid="buscar-usuario" />
          {f.texto && <button type="button" className="usuarios-borrar" onClick={f.borrar} aria-label={t.borrarBusqueda.largo}>✕</button>}
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
        </span>
      </label>
      <label className="campo usuarios-rol">
        <span>{t.rol.largo}</span>
        <select className="entrada" value={f.rol ?? ""} onChange={(e) => f.elegirRol(e.target.value)} data-testid="filtro-rol">
          <option value="">{t.todosLosRoles.largo}</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
      </label>
      {f.resumen && <span className="detalle usuarios-quedan" role="status" data-testid="cuantos-quedan">{f.resumen}</span>}
    </div>
  );
}

function FilaConError({ children, error, columnas, debajo }: { children: React.ReactNode; error: React.ReactNode; columnas: number; debajo?: React.ReactNode }) {
  return <>{children}{debajo && <tr className="hija"><td colSpan={columnas} className="usuarios-acceso-celda">{debajo}</td></tr>}{error && <tr className="hija"><td colSpan={columnas}>{error}</td></tr>}</>;
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
