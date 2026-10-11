import { useEffect, useRef, useState } from "react";
import { esAmbienteDePrueba } from "../../ambiente";
import { api, ErrorApi } from "../../api";
import { entrarConHuella, hayHuella } from "../../credenciales";
import { useSesion, type Usuario } from "../../sesion";
import { useConexion } from "../conexion";
import { describirDispositivo } from "../dispositivo";
import { Aviso, Boton, Cargando, Icono } from "../piezas";
import { useEsCelular } from "../rutas";
import { marcarEntradaConGoogle } from "./OfrecerHuella";
import "../estilos/entrar.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Si el servidor dio por terminada la sesión (la cerraron a distancia o venció), la app vuelve
// sola a la entrada y la entrada lo dice. Se anota acá porque la entrada todavía no está en
// pantalla cuando llega el aviso.
let sesionCerradaPorElServidor = false;
if (typeof window !== "undefined") window.addEventListener("sesion-cerrada", () => { sesionCerradaPorElServidor = true; });

type ErrorDeEntrada = { titulo: string; texto: string; noAutorizado?: { correo: string | null } };

// Los errores de entrar, dichos para alguien que todavía no conoce el sistema.
function explicar(e: unknown, medio: "google" | "huella"): ErrorDeEntrada {
  const err = e as Error;
  if (medio === "huella" && (err.name === "NotAllowedError" || err.name === "AbortError")) return { titulo: "No se pudo leer la huella", texto: "Probá de nuevo o entrá con tu cuenta de Google." };
  if (!(e instanceof ErrorApi)) return { titulo: "Sin conexión", texto: "Para entrar hace falta internet. Revisá la conexión y probá de nuevo." };
  if (e.estado === 429) return { titulo: "Demasiados intentos", texto: "Esperá un minuto y probá de nuevo." };
  if (e.estado === 403 && medio === "google") {
    const correo = /\S+@\S+/.exec(e.message)?.[0] ?? null;
    return { titulo: "Todavía no estás autorizado", texto: "Pedile acceso a un Administrador.", noAutorizado: { correo } };
  }
  if (e.estado === 403) return { titulo: "Tu usuario está desactivado", texto: "Pedile a un Administrador que lo reactive en «Usuarios y sesiones»." };
  if (e.estado === 401 && medio === "huella") return { titulo: "Este celular no está vinculado a ninguna cuenta", texto: "Entrá con Google: la primera vez te ofrece usar la huella." };
  if (e.estado === 401) return { titulo: "Google no pudo verificar la cuenta", texto: "Probá de nuevo." };
  return { titulo: "No se pudo entrar", texto: `${err.message}. Probá de nuevo.` };
}

/**
 * El botón de Google lo dibuja Google; acá va su lugar (del tamaño de las otras opciones), lo
 * que pasa mientras se entra y el resultado. El servidor acepta solo los correos autorizados
 * en «Usuarios y sesiones»; a uno que no lo está se le avisa con `alNoAutorizado`.
 */
export function BotonGoogle({ apagado = false, alNoAutorizado }: { apagado?: boolean; alNoAutorizado?: (correo: string | null) => void }) {
  const { entrar } = useSesion();
  const [error, setError] = useState<ErrorDeEntrada | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [estado, setEstado] = useState<"esperando" | "listo" | "sin-google">("esperando");
  const lugar = useRef<HTMLDivElement>(null);
  const noAutorizado = useRef(alNoAutorizado);
  noAutorizado.current = alNoAutorizado;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !lugar.current) return;
    const desde = Date.now();
    const intervalo = setInterval(() => {
      const google = window.google;
      if (!google || !lugar.current) {
        // El script de Google no llegó: se avisa, y se sigue esperando por si llega.
        if (Date.now() - desde > 8000) setEstado("sin-google");
        return;
      }
      clearInterval(intervalo);
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: "popup",
        callback: async ({ credential }) => {
          setEntrando(true); setError(null);
          try {
            const r = await api<{ token: string; usuario: Usuario }>("/sesiones/google", {
              method: "POST",
              body: JSON.stringify({ credencial: credential, dispositivo: describirDispositivo() }),
            });
            marcarEntradaConGoogle();
            sesionCerradaPorElServidor = false;
            entrar(r.token, r.usuario);
          } catch (e) {
            const explicado = explicar(e, "google");
            if (explicado.noAutorizado && noAutorizado.current) noAutorizado.current(explicado.noAutorizado.correo);
            else setError(explicado);
            setEntrando(false);
          }
        },
      });
      // Google pide el ancho en píxeles (entre 200 y 400): el del lugar que le toca.
      const ancho = Math.round(Math.min(400, Math.max(200, lugar.current.clientWidth || 320)));
      google.accounts.id.renderButton(lugar.current, { theme: "outline", size: "large", shape: "rectangular", text: "continue_with", logo_alignment: "left", locale: "es", width: ancho });
      setEstado("listo");
    }, 200);
    return () => clearInterval(intervalo);
  }, [entrar]);

  if (!GOOGLE_CLIENT_ID) return <Aviso tipo="alerta" titulo="El botón de Google no está configurado">A esta versión le falta VITE_GOOGLE_CLIENT_ID.</Aviso>;
  const clase = ["entrar__google", estado !== "listo" && "entrar__google--esperando", (entrando || apagado) && "entrar__google--apagado"].filter(Boolean).join(" ");
  return (
    <>
      <div className={clase} ref={lugar} aria-busy={estado === "esperando" || entrando} data-testid="entrar-google" />
      {estado === "esperando" && <span className="solo-lectores" role="status">Cargando el botón de Google…</span>}
      {estado === "sin-google" && !apagado && <Aviso tipo="alerta" titulo="Google no responde" accion={{ texto: "Reintentar", alTocar: () => window.location.reload() }}>Revisá la conexión y reintentá.</Aviso>}
      {entrando && <Cargando texto="Entrando con tu cuenta de Google…" />}
      {error && <Aviso tipo="error" titulo={error.titulo} testId="error-google">{error.texto}</Aviso>}
    </>
  );
}

/** Entrar con la huella: el celular tiene que estar vinculado antes (entrando con Google una vez). */
export function BotonHuella({ apagado = false }: { apagado?: boolean }) {
  const { entrar } = useSesion();
  const [error, setError] = useState<ErrorDeEntrada | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function conHuella() {
    setOcupado(true); setError(null);
    try {
      const r = await entrarConHuella(describirDispositivo());
      sesionCerradaPorElServidor = false;
      entrar(r.token, r.usuario);
    } catch (e) {
      setError(explicar(e, "huella"));
      setOcupado(false);
    }
  }

  return (
    <>
      <button type="button" className="entrar__opcion entrar__opcion--huella" disabled={ocupado || apagado} onClick={() => void conHuella()} data-testid="entrar-huella">
        <Icono nombre="huella" tam={28} className="entrar__huella" />
        <span><strong>{ocupado ? "Leyendo la huella…" : "Entrar con la huella"}</strong><span>Si ya la guardaste en este celular</span></span>
        <Icono nombre="flecha" />
      </button>
      {error && <Aviso tipo="error" titulo={error.titulo} testId="error-huella">{error.texto}</Aviso>}
    </>
  );
}

export function Marca() {
  return <p className="entrar__logo"><span>F</span><strong>Ferrebress</strong></p>;
}

/** Mientras se verifica la sesión guardada. */
export function PantallaDeCarga() {
  return (
    <main className="entrar entrar--estado entrar--carga" aria-busy="true" data-testid="abriendo">
      <div className="entrar__abriendo">
        <p className="entrar__nombre">Ferre<span>bress</span></p>
        <span className="entrar__giro" aria-hidden="true" />
        <p role="status">Abriendo Ferrebress…</p>
      </div>
    </main>
  );
}

function NoAutorizado({ correo, alVolver }: { correo: string | null; alVolver: () => void }) {
  return (
    <main className="entrar entrar--estado" data-testid="no-autorizado">
      <section className="entrar__tarjeta">
        <span className="entrar__circulo entrar__circulo--alerta"><Icono nombre="candado" tam={32} /></span>
        <h1>Todavía no estás autorizado</h1>
        <p data-testid="error-google">
          {correo ? <>Entraste con <strong>{correo}</strong>, que no tiene acceso a Ferrebress.</> : "Esa cuenta de Google no tiene acceso a Ferrebress."} Pedile acceso a un Administrador.
        </p>
        <Boton variante="principal" tam="grande" ancho autoFocus onClick={alVolver}>Probar con otra cuenta</Boton>
      </section>
    </main>
  );
}

// Dos formas de entrar, sin contraseñas (ADR-011): la cuenta de Google o, en un celular ya
// vinculado, la huella.
export function Entrar() {
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const [cerrada] = useState(() => sesionCerradaPorElServidor);
  const [sinAcceso, setSinAcceso] = useState<{ correo: string | null } | null>(null);

  if (sinAcceso) return <NoAutorizado correo={sinAcceso.correo} alVolver={() => setSinAcceso(null)} />;

  return (
    <main className="entrar" data-testid="entrar">
      <section className="entrar__marca">
        <span className="entrar__sello" aria-hidden="true"><span>F</span></span>
        <div>
          <p className="entrar__nombre">Ferre<span>bress</span></p>
          <p className="entrar__que-es">Ventas, precios y stock de la ferretería.</p>
        </div>
        <div className="entrar__arte" aria-hidden="true"><div /><div /><div /></div>
      </section>

      <section className="entrar__lado">
        <div className="entrar__caja">
          <Marca />
          <h1>Entrá a tu ferretería</h1>
          <p className="entrar__que-es entrar__que-es--celular">Ventas, precios y stock de la ferretería.</p>

          {cerrada && <Aviso tipo="alerta" titulo="Hay que entrar de nuevo" testId="sesion-cerrada">La sesión de este dispositivo se cerró o venció.</Aviso>}
          {!enLinea && <Aviso tipo="alerta" titulo="Sin conexión" testId="entrar-sin-conexion">Para entrar hace falta internet. Revisá la conexión y probá de nuevo.</Aviso>}

          <BotonGoogle apagado={!enLinea} alNoAutorizado={(correo) => setSinAcceso({ correo })} />
          {esCelular && hayHuella() && <BotonHuella apagado={!enLinea} />}

          <p className="entrar__ayuda">¿No podés entrar? Pedile acceso a un Administrador.</p>
          {esAmbienteDePrueba() && <p className="ambiente entrar__ambiente" data-testid="ambiente">Ambiente de prueba</p>}
        </div>
      </section>
    </main>
  );
}
