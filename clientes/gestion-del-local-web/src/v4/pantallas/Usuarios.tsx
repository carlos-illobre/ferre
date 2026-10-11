import { useEffect, useState, type FormEvent } from "react";
import { api, ErrorApi } from "../../api";
import { EVENTO_CREDENCIALES, hayHuella, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../../credenciales";
import { useSesion } from "../../sesion";
import { useConexion } from "../conexion";
import { esCelular as esteEsUnCelular } from "../dispositivo";
import { dia, haceCuanto } from "../formato";
import { Aviso, avisar, Boton, Campo, Cargando, clases, ErrorDeCarga, Figura, Hoja, Iniciales, Pagina, Pastilla, TituloDeSeccion } from "../piezas";
import { esFallaDeRed, esUnCelular, tonoDePersona, useCarga } from "./negocio-comun";
import "../estilos/usuarios.css";

// Quién puede entrar, dónde está abierta la app ahora y qué celulares entran con la huella.
// Todo necesita internet: sin conexión se ve lo que había y no se puede cambiar nada.

type UsuarioFila = { id: string; email: string; nombre: string; activo: boolean };
type SesionFila = { id: string; dispositivo: string; ultimo_uso_en: string; email: string; nombre: string };

// En esta versión todos son Administradores: el alta manda el rol que la API le da a uno
// («admin»; lo acepta de quien sea que pueda administrar usuarios).
const ROL_DEL_ALTA = "admin";
const CORREO_BIEN_ESCRITO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LARGO_DEL_NOMBRE = 40;

/** Por qué el servidor no dejó, sin los nombres de rol de la API (en pantalla todos son «Administrador»). */
function porQue(e: unknown): string {
  if (esFallaDeRed(e)) return "Hace falta internet. Revisá la conexión y probá de nuevo.";
  const error = e as ErrorApi;
  if (/a vos mismo/.test(error.message)) return "No podés desactivarte a vos mismo: lo tiene que hacer otro Administrador.";
  if (error.estado === 403) return "Tu cuenta no tiene permiso para hacer este cambio.";
  return `${error.message}.`;
}

/** «celular · Chrome» → «Celular»: el navegador no le sirve a nadie en el mostrador. */
function nombreDelDispositivo(dispositivo: string): string {
  const nombre = dispositivo.split(" · ")[0]?.trim() || "Dispositivo";
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export function Usuarios() {
  const { enLinea } = useConexion();
  const { sesion, salir } = useSesion();
  const yo = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const propiaId = sesion.estado === "con-sesion" ? sesion.sesionId : null;

  const personas = useCarga<UsuarioFila[]>("/usuarios");
  const sesiones = useCarga<SesionFila[]>("/sesiones");
  const celulares = useCarga<Credencial[]>("/credenciales");
  const [hoja, setHoja] = useState<"autorizar" | "vincular" | null>(null);

  // Un celular vinculado en otro lado (la oferta al entrar) aparece acá sin recargar.
  const recargarCelulares = celulares.recargar;
  useEffect(() => {
    window.addEventListener(EVENTO_CREDENCIALES, recargarCelulares);
    return () => window.removeEventListener(EVENTO_CREDENCIALES, recargarCelulares);
  }, [recargarCelulares]);

  const sinInternet = !enLinea && (
    <div className="usuarios__aviso">
      <Aviso tipo="alerta" titulo="Para cambiar usuarios hace falta internet" testId="usuarios-sin-conexion">
        Tampoco se pueden cerrar sesiones ni vincular celulares. Lo que ves puede no estar al día.
      </Aviso>
    </div>
  );

  if (!personas.datos) {
    return (
      <Pagina titulo="Usuarios y sesiones" testId="usuarios-y-sesiones">
        {sinInternet}
        {personas.error === null
          ? <Cargando texto="Trayendo los usuarios y las sesiones…" />
          : <ErrorDeCarga titulo="No se pudieron traer los usuarios" alReintentar={() => { personas.recargar(); sesiones.recargar(); celulares.recargar(); }}>{personas.error}</ErrorDeCarga>}
      </Pagina>
    );
  }

  return (
    <Pagina titulo="Usuarios y sesiones" testId="usuarios-y-sesiones">
      {sinInternet}

      <div className="usuarios">
        <Personas lista={personas.datos} yo={yo?.id ?? null} enLinea={enLinea} alAutorizar={() => setHoja("autorizar")} alCambiar={() => { personas.recargar(); sesiones.recargar(); }} />
        <Sesiones
          lista={sesiones.datos}
          error={sesiones.error}
          propiaId={propiaId}
          enLinea={enLinea}
          alRecargar={sesiones.recargar}
          alSalir={() => void salir()}
        />
        <Celulares lista={celulares.datos} error={celulares.error} enLinea={enLinea} alRecargar={celulares.recargar} alVincular={() => setHoja("vincular")} />
      </div>

      <AutorizarAAlguien
        abierta={hoja === "autorizar"}
        personas={personas.datos}
        alCerrar={() => setHoja(null)}
        alAutorizar={(nombre) => {
          setHoja(null);
          personas.recargar();
          avisar(`${nombre} ya puede entrar`, { detalle: "Entra con su cuenta de Google." });
        }}
      />
      <VincularEsteCelular
        abierta={hoja === "vincular"}
        propuesto={`Celular de ${yo?.nombre ?? "mostrador"}`.slice(0, LARGO_DEL_NOMBRE)}
        alCerrar={() => setHoja(null)}
        alVincular={(c) => {
          setHoja(null);
          celulares.recargar();
          avisar(`Listo: «${c.dispositivo ?? "este celular"}» entra con la huella`, { detalle: "La próxima vez, tocá «Entrar con la huella»." });
        }}
      />
    </Pagina>
  );
}

// ---------------------------------------------------------------- 1. Personas autorizadas

function Personas({ lista, yo, enLinea, alAutorizar, alCambiar }: { lista: UsuarioFila[]; yo: string | null; enLinea: boolean; alAutorizar: () => void; alCambiar: () => void }) {
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState<{ id: string; titulo: string; texto: string } | null>(null);

  async function cambiarActivo(u: UsuarioFila, activo: boolean) {
    setOcupada(u.id);
    setRechazo(null);
    try {
      await api(`/usuarios/${u.id}`, { method: "PATCH", body: JSON.stringify({ activo }) });
      alCambiar();
      if (activo) avisar(`${u.nombre} puede entrar de nuevo`);
      else avisar(`${u.nombre} ya no puede entrar`, { detalle: "Se le cerraron las sesiones abiertas." });
    } catch (e) {
      setRechazo({ id: u.id, titulo: `No se pudo ${activo ? "reactivar" : "desactivar"} a ${u.nombre}`, texto: porQue(e) });
    } finally {
      setOcupada(null);
    }
  }

  return (
    <section className="usuarios__personas" aria-label="Personas autorizadas">
      <TituloDeSeccion titulo="Personas autorizadas" detalle="Solo ellas pueden entrar, con su cuenta de Google.">
        <Boton variante="principal" icono="mas" disabled={!enLinea} onClick={alAutorizar} data-testid="autorizar">Autorizar a alguien</Boton>
      </TituloDeSeccion>
      <ul className="usuarios__lista" data-testid="usuarios">
        {lista.map((u) => {
          const soyYo = u.id === yo;
          return (
            <li key={u.id} className={clases("usuarios__persona", !u.activo && "usuarios__persona--desactivada", soyYo && "usuarios__persona--yo")} data-testid="usuario-fila">
              <Iniciales nombre={u.nombre} tono={u.activo ? tonoDePersona(u.email) : "negro"} />
              <div className="usuarios__texto">
                <strong>{u.nombre}{soyYo && <span className="usuarios__vos"> (vos)</span>}</strong>
                <span className="usuarios__correo">{u.email}</span>
              </div>
              <span className="usuarios__estado">
                {u.activo ? <Pastilla tipo="bien" icono="tilde">Puede entrar</Pastilla> : <Pastilla tipo="neutro" icono="candado">Desactivada</Pastilla>}
              </span>
              <div className="usuarios__accion">
                {soyYo
                  ? <p className="usuarios__nota">A vos te cambia otro Administrador</p>
                  : (
                    <Boton tam="chico" disabled={!enLinea || ocupada === u.id} aria-label={`${u.activo ? "Desactivar" : "Reactivar"} a ${u.nombre}`} onClick={() => void cambiarActivo(u, !u.activo)} data-testid={u.activo ? "desactivar" : "reactivar"}>
                      {ocupada === u.id ? "Guardando…" : u.activo ? "Desactivar" : "Reactivar"}
                    </Boton>
                  )}
              </div>
              {rechazo?.id === u.id && <div className="usuarios__rechazo"><Aviso tipo="error" titulo={rechazo.titulo} testId="error-usuario">{rechazo.texto}</Aviso></div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- 2. Sesiones abiertas

type PropsDeSesiones = { lista: SesionFila[] | null; error: string | null; propiaId: string | null; enLinea: boolean; alRecargar: () => void; alSalir: () => void };

function Sesiones({ lista, error, propiaId, enLinea, alRecargar, alSalir }: PropsDeSesiones) {
  const [cerradas, setCerradas] = useState<string[]>([]);
  const [rechazo, setRechazo] = useState<{ titulo: string; texto: string } | null>(null);
  const [saliendo, setSaliendo] = useState(false);

  // La propia va primero. Es la de este dispositivo: se nombra por lo que se tiene en la mano.
  const filas = (lista ?? []).filter((s) => !cerradas.includes(s.id)).sort((a, b) => Number(b.id === propiaId) - Number(a.id === propiaId));
  const comoSeLlama = (s: SesionFila) => (s.id !== propiaId ? nombreDelDispositivo(s.dispositivo) : esteEsUnCelular() ? "Este celular" : "Esta computadora");

  async function cerrar(s: SesionFila) {
    setRechazo(null);
    setCerradas((antes) => [...antes, s.id]); // sale de la lista en el momento
    try {
      await api(`/sesiones/${s.id}`, { method: "DELETE" });
      avisar("Sesión cerrada", { detalle: `${s.nombre} tiene que volver a entrar en «${comoSeLlama(s)}».` });
      alRecargar();
    } catch (e) {
      setCerradas((antes) => antes.filter((id) => id !== s.id));
      setRechazo({ titulo: `No se pudo cerrar la sesión de ${s.nombre}`, texto: porQue(e) });
    }
  }

  return (
    <section className="usuarios__sesiones" aria-label="Sesiones abiertas">
      <TituloDeSeccion titulo="Sesiones abiertas" detalle="Dónde está abierto Ferrebress ahora." />
      {rechazo && <div className="usuarios__rechazo"><Aviso tipo="error" titulo={rechazo.titulo} testId="error-sesion">{rechazo.texto}</Aviso></div>}
      {!lista && (error === null
        ? <Cargando texto="Trayendo las sesiones…" testId="progreso-sesiones" />
        : <Aviso tipo="error" titulo="No se pudieron traer las sesiones" accion={{ texto: "Reintentar", alTocar: alRecargar }} testId="error-sesiones">{error}</Aviso>)}
      {lista && filas.length === 0 && <p className="usuarios__sin-celulares">No hay ninguna sesión abierta.</p>}
      {filas.length > 0 && (
        <ul className="usuarios__lista" data-testid="sesiones">
          {filas.map((s) => {
            const esPropia = s.id === propiaId;
            const celular = esPropia ? esteEsUnCelular() : esUnCelular(s.dispositivo);
            const nombre = comoSeLlama(s);
            return (
              <li key={s.id} className="usuarios__sesion" data-testid="sesion" aria-label={`${s.nombre} ${s.dispositivo}${esPropia ? " esta sesión" : ""}`}>
                <Figura icono={celular ? "celular" : "computadora"} tono={esPropia ? "verde" : "negro"} />
                <div className="usuarios__texto">
                  <strong>{nombre}</strong>
                  <span>{s.nombre} · {esPropia ? "activa ahora" : haceCuanto(s.ultimo_uso_en)}</span>
                  {esPropia && <span className="usuarios__marca"><Pastilla tipo="bien">Esta sesión</Pastilla></span>}
                </div>
                <div className="usuarios__accion">
                  {esPropia
                    ? <Boton tam="chico" icono="salir" disabled={saliendo} onClick={() => { setSaliendo(true); alSalir(); }} data-testid="cerrar-sesion">Salir</Boton>
                    : <Boton tam="chico" disabled={!enLinea} aria-label={`Cerrar la sesión de ${s.nombre} en ${nombre}`} onClick={() => void cerrar(s)} data-testid="cerrar-sesion">Cerrar</Boton>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- 3. Mis celulares con huella

type PropsDeCelulares = { lista: Credencial[] | null; error: string | null; enLinea: boolean; alRecargar: () => void; alVincular: () => void };

function Celulares({ lista, error, enLinea, alRecargar, alVincular }: PropsDeCelulares) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState<{ titulo: string; texto: string } | null>(null);
  const enElCelular = esteEsUnCelular();

  async function quitar(c: Credencial) {
    const nombre = c.dispositivo ?? "Ese celular";
    setOcupado(c.id);
    setRechazo(null);
    try {
      await quitarCredencial(c.id);
      avisar(`«${nombre}» ya no entra con la huella`);
      alRecargar();
    } catch (e) {
      setRechazo({ titulo: `No se pudo quitar «${nombre}»`, texto: porQue(e) });
    } finally {
      setOcupado(null);
    }
  }

  return (
    <section className="usuarios__celulares" aria-label="Mis celulares con huella" data-testid="celulares">
      <TituloDeSeccion titulo="Mis celulares con huella" detalle="Un celular vinculado entra apoyando el dedo, sin Google." />
      {rechazo && <div className="usuarios__rechazo"><Aviso tipo="error" titulo={rechazo.titulo} testId="error-celular">{rechazo.texto}</Aviso></div>}
      {!lista && (error === null
        ? <Cargando texto="Trayendo los celulares…" testId="progreso-celulares" />
        : <Aviso tipo="error" titulo="No se pudieron traer los celulares vinculados" accion={{ texto: "Reintentar", alTocar: alRecargar }} testId="error-celulares">{error}</Aviso>)}
      {lista && lista.length === 0 && <p className="usuarios__sin-celulares" data-testid="sin-celulares">No hay ningún celular vinculado.</p>}
      {lista && lista.length > 0 && (
        <ul className="usuarios__lista">
          {lista.map((c) => (
            <li key={c.id} className="usuarios__sesion" data-testid="celular">
              <Figura icono="huella" tono="negro" />
              <div className="usuarios__texto">
                <strong>{c.dispositivo ?? "Celular"}</strong>
                <span>{c.ultimo_uso_en ? `Se usó ${haceCuanto(c.ultimo_uso_en)}` : new Date(c.creada_en).toDateString() === new Date().toDateString() ? "Vinculado hoy" : `Vinculado el ${dia(c.creada_en)} · todavía no se usó`}</span>
              </div>
              <div className="usuarios__accion">
                <Boton tam="chico" disabled={!enLinea || ocupado === c.id} aria-label={`Quitar ${c.dispositivo ?? "este celular"}`} onClick={() => void quitar(c)} data-testid="quitar-celular">Quitar</Boton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!enElCelular && <p className="usuarios__desde-el-celular">Para vincular un celular, abrí Ferrebress en ese celular y hacelo desde esta misma pantalla.</p>}
      {enElCelular && hayHuella() && <Boton icono="huella" ancho className="usuarios__vincular" disabled={!enLinea} onClick={alVincular} data-testid="vincular-celular">Vincular este celular</Boton>}
      {enElCelular && !hayHuella() && <p className="usuarios__desde-el-celular">Este celular no tiene lector de huella o desbloqueo compatible: no se puede vincular.</p>}
    </section>
  );
}

// ---------------------------------------------------------------- Hojas

type PropsDeAutorizar = { abierta: boolean; personas: UsuarioFila[]; alCerrar: () => void; alAutorizar: (nombre: string) => void };

// Autorizar es agregar el correo de Google de la persona: no hay contraseña que crear.
function AutorizarAAlguien({ abierta, personas, alCerrar, alAutorizar }: PropsDeAutorizar) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [revisado, setRevisado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [rechazo, setRechazo] = useState<{ correo?: string; general?: string }>({});
  useEffect(() => { if (abierta) { setNombre(""); setCorreo(""); setRevisado(false); setGuardando(false); setRechazo({}); } }, [abierta]);

  const limpio = correo.trim().toLowerCase();
  const repetido = personas.find((u) => u.email.toLowerCase() === limpio);
  const errorDeNombre = nombre.trim() === "" ? "Escribí el nombre de la persona." : null;
  const errorDeCorreo =
    limpio === "" ? "Escribí su correo de Google."
    : !CORREO_BIEN_ESCRITO.test(limpio) ? "Ese correo está mal escrito: revisá que tenga la arroba y lo que va después."
    : repetido ? (repetido.activo ? `Ese correo ya está autorizado: es el de ${repetido.nombre}.` : `Ese correo es el de ${repetido.nombre}, que está en la lista como desactivada. Cerrá esto y tocá «Reactivar».`)
    : null;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (errorDeNombre || errorDeCorreo || guardando) return;
    setGuardando(true);
    setRechazo({});
    try {
      await api("/usuarios", { method: "POST", body: JSON.stringify({ email: limpio, nombre: nombre.trim(), rol: ROL_DEL_ALTA }) });
      alAutorizar(nombre.trim());
    } catch (err) {
      // Lo escrito no se pierde: el motivo va junto al campo que lo causó.
      if (err instanceof ErrorApi && err.estado === 409) setRechazo({ correo: "Ese correo ya está autorizado. Si figura como desactivada, cerrá esto y tocá «Reactivar»." });
      else setRechazo({ general: porQue(err) });
      setGuardando(false);
    }
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Autorizar a alguien" testId="hoja-autorizar">
      <form className="usuarios__formulario" onSubmit={(e) => void enviar(e)} noValidate data-testid="alta-usuario">
        <p className="detalle">Con su correo de Google ya puede entrar. No hay contraseñas que crear.</p>
        <Campo etiqueta="Nombre" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Lucía" autoCapitalize="words" error={revisado ? errorDeNombre : null} autoFocus data-testid="nombre-usuario" />
        <Campo
          etiqueta="Correo de Google"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={correo}
          onChange={(e) => { setCorreo(e.target.value); setRechazo({}); }}
          placeholder="nombre@gmail.com"
          // Que ya exista se avisa apenas se termina de escribir, sin esperar a «Autorizar».
          error={rechazo.correo ?? (revisado || repetido ? errorDeCorreo : null)}
          data-testid="correo-usuario"
        />
        {rechazo.general && <Aviso tipo="error" titulo="No se pudo autorizar" testId="error-autorizar">{rechazo.general}</Aviso>}
        <Boton type="submit" variante="principal" tam="grande" ancho disabled={guardando} data-testid="confirmar-autorizar">{guardando ? "Autorizando…" : "Autorizar"}</Boton>
      </form>
    </Hoja>
  );
}

type PropsDeVincular = { abierta: boolean; propuesto: string; alCerrar: () => void; alVincular: (c: Credencial) => void };

// El nombre se pide acá, con uno propuesto que se puede dejar; la huella la pide el propio celular.
function VincularEsteCelular({ abierta, propuesto, alCerrar, alVincular }: PropsDeVincular) {
  const [nombre, setNombre] = useState(propuesto);
  const [revisado, setRevisado] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  const [rechazo, setRechazo] = useState<{ titulo: string; texto: string } | null>(null);
  useEffect(() => { if (abierta) { setNombre(propuesto); setRevisado(false); setPidiendo(false); setRechazo(null); } }, [abierta, propuesto]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (nombre.trim() === "" || pidiendo) return;
    setPidiendo(true);
    setRechazo(null);
    try {
      alVincular(await vincularEsteDispositivo(nombre.trim()));
    } catch (err) {
      const queFue = (err as Error).name;
      setRechazo(
        queFue === "NotAllowedError" || queFue === "AbortError" ? { titulo: "No se leyó la huella", texto: "El celular no quedó vinculado. Probá de nuevo." }
        : queFue === "InvalidStateError" ? { titulo: "Este celular ya estaba vinculado", texto: "Ya entra con la huella: no hace falta vincularlo de nuevo." }
        : { titulo: "No se pudo vincular", texto: porQue(err) },
      );
      setPidiendo(false);
    }
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Vincular este celular" testId="hoja-vincular">
      {pidiendo ? (
        <Cargando texto="Apoyá el dedo en el lector…" detalle="El celular te pide la huella para terminar." testId="pidiendo-huella" />
      ) : (
        <form className="usuarios__formulario" onSubmit={(e) => void enviar(e)} noValidate>
          <Campo etiqueta="¿Cómo llamamos a este celular?" value={nombre} maxLength={LARGO_DEL_NOMBRE} onChange={(e) => setNombre(e.target.value)} ayuda="Sirve para reconocerlo en la lista. Podés dejar el que está." error={revisado && nombre.trim() === "" ? "Ponele un nombre para reconocerlo." : null} data-testid="nombre-celular" />
          {rechazo && <Aviso tipo="error" titulo={rechazo.titulo} testId="error-vincular">{rechazo.texto}</Aviso>}
          <Boton type="submit" variante="principal" tam="grande" icono="huella" ancho data-testid="confirmar-vincular">Vincular con mi huella</Boton>
        </form>
      )}
    </Hoja>
  );
}
