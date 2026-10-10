import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { api, ErrorApi } from "../../api";
import { fecha } from "../../formato";
import { useSesion } from "../../sesion";
import { EVENTO_CREDENCIALES, hayHuella, listarCredenciales, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../../credenciales";
import { useEsCelular } from "../vista";
import { Aviso, Boton, Hoja, Icono, Pagina, Pastilla, Toast, Vacio, haceCuanto } from "../ui";
import { describirDispositivo } from "../dispositivo";
import { IconoCompu, ROLES, esFallaDeRed, fechaCompleta, nombreDeRol, textoDeError, useCarga, useEnLinea } from "./negocio-comun";
import "../estilos/negocio.css";

type UsuarioFila = { id: string; email: string; nombre: string; rol: string; activo: boolean };
type SesionFila = { id: string; dispositivo: string; ultimo_uso_en: string; email: string; nombre: string };
type Mensaje = { texto: string; testId?: string };
type Avisar = (m: Mensaje) => void;

// La API habla de «dueño» y «admin»; en pantalla los roles llevan su nombre del negocio.
function enPalabras(e: unknown, queNoSePudo: string): string {
  if (esFallaDeRed(e)) return textoDeError(e, queNoSePudo);
  const texto = (e as Error).message;
  if (/a vos mismo/.test(texto)) return "No podés desactivarte ni cambiarte el rol: lo tiene que hacer otro Administrador.";
  if (/admin no puede/.test(texto)) return "Eso lo tiene que hacer un Administrador principal.";
  if (/dueño o un admin/.test(texto)) return "Solo puede hacerlo un Administrador.";
  return `${queNoSePudo}: ${texto}`;
}

// Quién puede entrar, qué sesiones están abiertas y qué celulares entran con la huella.
export function Usuarios() {
  const enLinea = useEnLinea();
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [vueltaDeSesiones, setVueltaDeSesiones] = useState(0);
  return (
    <Pagina titulo="Usuarios y sesiones" testId="usuarios-y-sesiones" className="usuarios" bajada="Quién puede entrar a Ferrebress, desde qué dispositivos está abierto ahora y qué celulares entran con la huella.">
      {!enLinea && <Aviso tipo="alerta" testId="usuarios-sin-conexion">Sin conexión: administrar usuarios, sesiones y celulares necesita internet. Lo que ves puede no estar al día.</Aviso>}
      <Autorizados enLinea={enLinea} avisar={setMensaje} alCerrarSesiones={() => setVueltaDeSesiones((v) => v + 1)} />
      <div className="usuarios-columnas">
        <Sesiones enLinea={enLinea} avisar={setMensaje} vuelta={vueltaDeSesiones} />
        <Celulares enLinea={enLinea} avisar={setMensaje} />
      </div>
      <Toast texto={mensaje?.texto ?? null} alCerrar={() => setMensaje(null)} testId={mensaje?.testId ?? "mensaje"} />
    </Pagina>
  );
}

function Autorizados({ enLinea, avisar, alCerrarSesiones }: { enLinea: boolean; avisar: Avisar; alCerrarSesiones: () => void }) {
  const { sesion } = useSesion();
  const yo = sesion.estado === "con-sesion" ? sesion.usuario.id : null;
  const esCelular = useEsCelular();
  const lista = useCarga<UsuarioFila[]>("/usuarios", "No se pudieron traer los usuarios");
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [errorDeFila, setErrorDeFila] = useState<{ id: string; texto: string } | null>(null);
  const [alta, setAlta] = useState(false);
  const filas = lista.datos ?? [];
  const activos = filas.filter((u) => u.activo).length;

  async function cambiar(u: UsuarioFila, cambios: { rol?: string; activo?: boolean }) {
    setOcupada(u.id); setErrorDeFila(null);
    try {
      await api(`/usuarios/${u.id}`, { method: "PATCH", body: JSON.stringify(cambios) });
      lista.recargar();
      if (cambios.activo === false) { avisar({ texto: `${u.nombre} ya no puede entrar: se le cerraron las sesiones abiertas.` }); alCerrarSesiones(); }
      else if (cambios.activo) avisar({ texto: `${u.nombre} puede entrar de nuevo.` });
      else if (cambios.rol) avisar({ texto: `${u.nombre} ahora es ${nombreDeRol(cambios.rol)}.` });
    } catch (e) {
      setErrorDeFila({ id: u.id, texto: enPalabras(e, "No se pudo guardar el cambio") });
    } finally { setOcupada(null); }
  }

  const rolDe = (u: UsuarioFila) => u.id === yo ? <span>{nombreDeRol(u.rol)}</span> : (
    <select className="selector usuarios-rol" value={u.rol} disabled={ocupada === u.id} onChange={(e) => cambiar(u, { rol: e.target.value })} aria-label={`Rol de ${u.nombre}`}>
      {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.nombre}</option>)}
    </select>
  );
  const accionDe = (u: UsuarioFila) => u.id === yo ? <span className="detalle">A vos te cambia otro Administrador</span> : (
    <Boton tam={esCelular ? undefined : "chico"} variante={u.activo ? "peligro" : undefined} disabled={ocupada === u.id || !enLinea} onClick={() => cambiar(u, { activo: !u.activo })} aria-label={`${u.activo ? "Desactivar" : "Reactivar"} a ${u.nombre}`}>
      {ocupada === u.id ? "Guardando…" : u.activo ? "Desactivar" : "Reactivar"}
    </Boton>
  );
  const estadoDe = (u: UsuarioFila) => <Pastilla tipo={u.activo ? "ok" : undefined}>{u.activo ? "Activo" : "Desactivado"}</Pastilla>;
  const errorDe = (u: UsuarioFila) => errorDeFila?.id === u.id ? <Aviso tipo="error">{errorDeFila.texto}</Aviso> : null;
  const formulario = <AltaDeUsuario enLinea={enLinea} alAutorizar={(u) => { lista.recargar(); setAlta(false); avisar({ texto: `${u.nombre} ya puede entrar con su cuenta de Google.` }); }} />;

  return (
    <section className="negocio-seccion" aria-labelledby="usuarios-autorizados">
      <header className="negocio-seccion-cabeza">
        <h2 id="usuarios-autorizados">Usuarios autorizados</h2>
        {lista.datos && <span className="detalle">{activos} de {filas.length} pueden entrar</span>}
      </header>
      <Aviso tipo="error" accion={<Boton tam="chico" onClick={lista.recargar}>Reintentar</Boton>}>{lista.error}</Aviso>
      {!lista.datos && !lista.error && <div className="tarjeta negocio-esqueleto" role="status" aria-label="Trayendo los usuarios">{[0, 1, 2].map((i) => <span key={i} className="esqueleto" />)}</div>}

      {lista.datos && (esCelular ? (
        <>
          <ul className="lista" data-testid="usuarios">
            {filas.map((u) => (
              <li key={u.id} className={`usuarios-tarjeta ${u.activo ? "" : "apagada"}`} data-testid="usuario-fila">
                <div className="fila">
                  <strong className="crece nombre">{u.nombre}{u.id === yo && <> <Pastilla tipo="azul" sinPunto>Vos</Pastilla></>}</strong>
                  {estadoDe(u)}
                </div>
                <span className="detalle usuarios-correo">{u.email}</span>
                <div className="fila usuarios-acciones">{rolDe(u)}{accionDe(u)}</div>
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
            <thead><tr><th scope="col">Nombre</th><th scope="col">Correo de Google</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col" className="angosta"><span className="solo-lectores">Acción</span></th></tr></thead>
            <tbody>
              {filas.map((u) => (
                <FilaConError key={u.id} error={errorDe(u)} columnas={5}>
                  <tr className={u.activo ? "" : "atenuada"} data-testid="usuario-fila">
                    <td className="nombre">{u.nombre}{u.id === yo && <> <Pastilla tipo="azul" sinPunto>Vos</Pastilla></>}</td>
                    <td>{u.email}</td>
                    <td>{rolDe(u)}</td>
                    <td>{estadoDe(u)}</td>
                    <td className="angosta usuarios-celda-accion">{accionDe(u)}</td>
                  </tr>
                </FilaConError>
              ))}
            </tbody>
          </table>
          <div className="usuarios-alta">{formulario}</div>
        </div>
      ))}
    </section>
  );
}

function FilaConError({ children, error, columnas }: { children: React.ReactNode; error: React.ReactNode; columnas: number }) {
  return <>{children}{error && <tr className="hija"><td colSpan={columnas}>{error}</td></tr>}</>;
}

// Autorizar es agregar el correo de Google de la persona: no hay contraseña que crear.
function AltaDeUsuario({ enLinea, alAutorizar }: { enLinea: boolean; alAutorizar: (u: { nombre: string }) => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("admin");
  const [errores, setErrores] = useState<{ nombre?: string; email?: string; general?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const cajaNombre = useRef<HTMLInputElement>(null);
  const id = useId();

  async function autorizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const faltas: typeof errores = {};
    if (!nombre.trim()) faltas.nombre = "Escribí el nombre de la persona.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) faltas.email = email.trim() ? "Ese correo está mal escrito: revisá que tenga la arroba y el dominio." : "Escribí su correo de Google.";
    setErrores(faltas);
    if (faltas.nombre) { cajaNombre.current?.focus(); return; }
    if (faltas.email) { document.getElementById(`${id}-email`)?.focus(); return; }
    setGuardando(true);
    try {
      await api("/usuarios", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), nombre: nombre.trim(), rol }) });
      const autorizado = nombre.trim();
      // El alta queda lista para cargar a otra persona.
      setNombre(""); setEmail(""); setRol("admin"); setErrores({});
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
      <label className="campo">
        <span>Rol</span>
        <select className="selector" name="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
          {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.nombre}</option>)}
        </select>
      </label>
      <Boton type="submit" variante="principal" icono="mas" disabled={guardando || !enLinea} className="usuarios-autorizar">{guardando ? "Autorizando…" : "Autorizar"}</Boton>
      <Aviso tipo="error">{errores.general}</Aviso>
    </form>
  );
}

function Sesiones({ enLinea, avisar, vuelta }: { enLinea: boolean; avisar: Avisar; vuelta: number }) {
  const { sesion, salir } = useSesion();
  const propiaId = sesion.estado === "con-sesion" ? sesion.sesionId : null;
  const esCelular = useEsCelular();
  const lista = useCarga<SesionFila[]>("/sesiones", "No se pudieron traer las sesiones");
  const { recargar } = lista;
  const [cerradas, setCerradas] = useState<string[]>([]);
  const [fallo, setFallo] = useState<{ sesion: SesionFila; texto: string } | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  useEffect(() => { if (vuelta > 0) recargar(); }, [vuelta, recargar]);
  const filas = (lista.datos ?? []).filter((s) => !cerradas.includes(s.id));

  async function cerrar(s: SesionFila) {
    setFallo(null);
    // La propia es «Salir»: se sale de forma explícita y se vuelve a la entrada.
    if (s.id === propiaId) { setSaliendo(true); await salir(); return; }
    setCerradas((c) => [...c, s.id]); // sale de la lista en el momento
    try {
      await api(`/sesiones/${s.id}`, { method: "DELETE" });
      avisar({ texto: `Se cerró la sesión de ${s.nombre} en ${s.dispositivo}.` });
      recargar();
    } catch (e) {
      setCerradas((c) => c.filter((id) => id !== s.id));
      setFallo({ sesion: s, texto: enPalabras(e, `No se pudo cerrar la sesión de ${s.nombre}`) });
    }
  }

  const dispositivo = (s: SesionFila) => <span className="usuarios-dispositivo">{/celular/i.test(s.dispositivo) ? <Icono nombre="celular" tam={18} /> : <IconoCompu tam={18} />}{s.dispositivo}</span>;
  const boton = (s: SesionFila) => {
    const propia = s.id === propiaId;
    return (
      <Boton tam={esCelular ? undefined : "chico"} variante={propia ? "peligro" : undefined} icono={propia ? "salir" : undefined} disabled={(propia && saliendo) || (!propia && !enLinea)} onClick={() => cerrar(s)}
        aria-label={propia ? "Cerrar esta sesión y volver a la entrada" : `Cerrar la sesión de ${s.nombre} en ${s.dispositivo}`} title={propia ? "Cierra esta sesión: volvés a la entrada" : "Cierra la sesión en ese dispositivo"}>Cerrar</Boton>
    );
  };
  const etiqueta = (s: SesionFila) => `${s.nombre} ${s.dispositivo}${s.id === propiaId ? " esta sesión" : ""}`;

  return (
    <section className="negocio-seccion" aria-labelledby="usuarios-sesiones">
      <header className="negocio-seccion-cabeza">
        <h2 id="usuarios-sesiones">Sesiones abiertas</h2>
        {lista.datos && <span className="detalle">{filas.length === 1 ? "1 dispositivo" : `${filas.length} dispositivos`} con la app abierta</span>}
      </header>
      <Aviso tipo="error" accion={<Boton tam="chico" onClick={recargar}>Reintentar</Boton>}>{lista.error}</Aviso>
      <Aviso tipo="error" accion={fallo ? <Boton tam="chico" onClick={() => cerrar(fallo.sesion)}>Reintentar</Boton> : undefined}>{fallo?.texto}</Aviso>
      {!lista.datos && !lista.error && <div className="tarjeta negocio-esqueleto" role="status" aria-label="Trayendo las sesiones">{[0, 1, 2].map((i) => <span key={i} className="esqueleto" />)}</div>}
      {lista.datos && (esCelular ? (
        <ul className="lista" data-testid="sesiones">
          {filas.map((s) => {
            const propia = s.id === propiaId;
            return (
              <li key={s.id} className={`renglon ${propia ? "usuarios-propia" : ""}`} data-testid="sesion" aria-label={etiqueta(s)}>
                <span className="nombre">{s.nombre}{propia && <> <Pastilla tipo="azul" sinPunto>Esta sesión</Pastilla></>}</span>
                {boton(s)}
                <span className="detalle">{dispositivo(s)} · usada {haceCuanto(s.ultimo_uso_en)}{propia && <><br />Si la cerrás, volvés a la entrada.</>}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="tabla-marco">
          <table className="tabla" data-testid="sesiones">
            <thead><tr><th scope="col">Quién</th><th scope="col">Dispositivo</th><th scope="col">Último uso</th><th scope="col" className="angosta"><span className="solo-lectores">Acción</span></th></tr></thead>
            <tbody>
              {filas.map((s) => {
                const propia = s.id === propiaId;
                return (
                  <tr key={s.id} className={propia ? "usuarios-propia" : ""} data-testid="sesion" aria-label={etiqueta(s)}>
                    <td><span className="nombre">{s.nombre}</span>{propia && <> <Pastilla tipo="azul" sinPunto>Esta sesión</Pastilla></>}</td>
                    <td>{dispositivo(s)}</td>
                    <td className="angosta" title={fechaCompleta(s.ultimo_uso_en)}>{haceCuanto(s.ultimo_uso_en)}</td>
                    <td className="angosta usuarios-celda-accion">{boton(s)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

// Mis celulares vinculados: desde acá se vincula este dispositivo con la huella, y se
// quita uno perdido. Cada usuario ve los suyos.
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
function NombrarCelular({ alCerrar, alVincular }: { alCerrar: () => void; alVincular: (c: Credencial) => void }) {
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
