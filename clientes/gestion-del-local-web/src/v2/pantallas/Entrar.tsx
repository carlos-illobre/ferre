import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ErrorApi } from "../../api";
import { useSesion, type Usuario } from "../../sesion";
import { entrarConHuella, hayHuella } from "../../credenciales";
import { marcarEntradaConGoogle } from "./OfrecerHuella";
import { useEnLinea } from "./negocio-comun";
import { Aviso, Boton, Icono, Marca, Progreso, type NombreDeIcono } from "../ui";
import "../estilos/entrar.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Si el servidor dio por terminada la sesión (la cerraron a distancia o venció), la app
// vuelve sola a la entrada y la entrada lo dice. Se anota acá porque la entrada todavía no
// está en pantalla cuando llega el aviso.
let sesionCerradaPorElServidor = false;
if (typeof window !== "undefined") window.addEventListener("sesion-cerrada", () => { sesionCerradaPorElServidor = true; });

// Celular = Android o iPhone/iPad. La oferta de huella al primer ingreso es solo para ellos.
export const esCelular = () => /Android|iPhone|iPad/.test(navigator.userAgent);
export function describirDispositivo(): string {
  const ua = navigator.userAgent;
  const tipo = esCelular() ? "celular" : "computadora";
  const navegador = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${tipo} · ${navegador}`;
}

type ErrorDeEntrada = { titulo?: string; texto: string };

// Los errores de entrar, dichos para alguien que todavía no conoce el sistema.
function explicar(e: unknown, medio: "google" | "huella"): ErrorDeEntrada {
  const err = e as Error;
  if (medio === "huella" && (err.name === "NotAllowedError" || err.name === "AbortError")) return { texto: "No se pudo leer la huella. Probá de nuevo o entrá con tu cuenta de Google." };
  if (!(e instanceof ErrorApi)) return { titulo: "Sin conexión", texto: "Para entrar se necesita internet. Revisá la conexión y probá de nuevo." };
  if (e.estado === 429) return { texto: "Demasiados intentos; esperá un minuto" };
  if (e.estado === 403 && medio === "google") {
    const correo = /\S+@\S+/.exec(e.message)?.[0];
    return {
      titulo: "No autorizado",
      texto: `${correo ?? "Ese correo"} no está autorizado para entrar a Ferrebress. Pedile a un Administrador del negocio que lo agregue en «Usuarios y sesiones», o probá con otra cuenta de Google.`,
    };
  }
  if (e.estado === 403) return { titulo: "Usuario desactivado", texto: "Tu usuario está desactivado. Pedile a un Administrador del negocio que lo reactive." };
  if (e.estado === 401 && medio === "huella") return { texto: "Este dispositivo no está vinculado a ninguna cuenta. Entrá con Google; después lo vinculás desde Negocio, en «Usuarios y sesiones»." };
  if (e.estado === 401) return { texto: "Google no pudo verificar la cuenta. Probá de nuevo." };
  return { texto: err.message };
}

function ErrorEnElLugar({ error, testId }: { error: ErrorDeEntrada | null; testId: string }) {
  if (!error) return null;
  return (
    <div data-testid={testId}>
      <Aviso tipo="error">{error.titulo && <strong className="entrar-error-titulo">{error.titulo}</strong>}{error.texto}</Aviso>
    </div>
  );
}

// El botón lo dibuja Google; acá va su lugar, lo que pasa mientras se entra y el resultado.
// Al entrar, el servidor acepta solo los correos autorizados en «Usuarios y sesiones».
export function BotonGoogle({ tema = "outline" }: { tema?: "outline" | "filled_blue" | "filled_black" }) {
  const { entrar } = useSesion();
  const [error, setError] = useState<ErrorDeEntrada | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [estado, setEstado] = useState<"esperando" | "listo" | "sin-google">("esperando");
  const lugar = useRef<HTMLDivElement>(null);

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
            setError(explicar(e, "google"));
            setEntrando(false);
          }
        },
      });
      // Google pide el ancho en píxeles (entre 200 y 400): el del lugar que le toca.
      const ancho = Math.round(Math.min(400, Math.max(200, lugar.current.clientWidth || 320)));
      google.accounts.id.renderButton(lugar.current, { theme: tema, size: "large", shape: "rectangular", text: "continue_with", logo_alignment: "left", locale: "es", width: ancho });
      setEstado("listo");
    }, 200);
    return () => clearInterval(intervalo);
  }, [entrar, tema]);

  if (!GOOGLE_CLIENT_ID) return <Aviso tipo="alerta">El botón de Google no está configurado en esta versión (falta VITE_GOOGLE_CLIENT_ID).</Aviso>;
  return (
    <div className="entrar-google">
      <div className={`entrar-google-lugar ${estado === "listo" ? "" : "esperando"} ${entrando ? "ocupado" : ""}`} ref={lugar} aria-busy={estado === "esperando" || entrando} />
      {estado === "esperando" && <span className="solo-lectores" role="status">Cargando el botón de Google…</span>}
      {estado === "sin-google" && <Aviso tipo="alerta" accion={<Boton tam="chico" onClick={() => location.reload()}>Reintentar</Boton>}>Google no responde. Revisá la conexión y reintentá.{hayHuella() ? " Si este dispositivo ya está vinculado, podés entrar con la huella." : ""}</Aviso>}
      {entrando && <Progreso texto="Entrando con tu cuenta de Google…" />}
      <ErrorEnElLugar error={error} testId="error-google" />
    </div>
  );
}

// Entrar con la huella: solo en dispositivos que la tienen; el celular tiene que estar
// vinculado antes (entrando con Google una vez).
export function BotonHuella() {
  const { entrar } = useSesion();
  const [error, setError] = useState<ErrorDeEntrada | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (!hayHuella()) return null;
  async function conHuella() {
    setOcupado(true); setError(null);
    try {
      const r = await entrarConHuella(describirDispositivo());
      sesionCerradaPorElServidor = false;
      entrar(r.token, r.usuario);
    } catch (e) { setError(explicar(e, "huella")); }
    finally { setOcupado(false); }
  }
  return (
    <div className="entrar-huella">
      <Boton variante="principal" tam="grande" ancho icono="huella" onClick={conHuella} disabled={ocupado} data-testid="entrar-huella">{ocupado ? "Leyendo la huella…" : "Entrar con la huella"}</Boton>
      <ErrorEnElLugar error={error} testId="error-huella" />
    </div>
  );
}

const QUE_HACE: { icono: NombreDeIcono; texto: string }[] = [
  { icono: "vender", texto: "Buscás el producto, decís el precio y cobrás." },
  { icono: "listas", texto: "Los precios se actualizan con las listas de los proveedores." },
  { icono: "stock", texto: "Lo que se vende baja del stock; lo que se compra, sube." },
];

// El marco de la entrada: la marca sobre azul marino y, sobre blanco, lo que hay que hacer.
// Lo usan la entrada y la página que abre el celular al leer el código de la computadora.
export function MarcoDeEntrada({ titulo, bajada, conPuntos, children, testId }: { titulo: string; bajada: string; conPuntos?: boolean; children: ReactNode; testId?: string }) {
  return (
    <main className="entrar" data-testid={testId}>
      <CintaMetrica />
      <section className="entrar-marca">
        <Marca tam={44} />
        <h1>{titulo}</h1>
        <p className="entrar-bajada">{bajada}</p>
        {conPuntos && (
          <ul className="entrar-puntos">
            {QUE_HACE.map((q) => <li key={q.icono}><span><Icono nombre={q.icono} tam={18} /></span>{q.texto}</li>)}
          </ul>
        )}
      </section>
      <section className="entrar-puerta">{children}</section>
    </main>
  );
}

// La firma de la marca: el ámbar es el de la cinta métrica, con sus rayas.
function CintaMetrica() {
  return (
    <svg className="entrar-cinta" width="100%" height="18" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="entrar-rayas" width="80" height="18" patternUnits="userSpaceOnUse">
          <path d="M.5 0v18M8.500 0v5M16.500 0v5M24.500 0v5M32.500 0v5M40.500 0v10M48.500 0v5M56.500 0v5M64.500 0v5M72.500 0v5" stroke="var(--tinta)" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="18" fill="var(--ambar)" />
      <rect width="100%" height="18" fill="url(#entrar-rayas)" />
    </svg>
  );
}

// Dos formas de entrar, sin contraseñas (ADR-011): la huella del celular vinculado o la
// cuenta de Google. Primero la más rápida que el dispositivo tenga.
export function Entrar() {
  const enLinea = useEnLinea();
  const [cerrada] = useState(() => sesionCerradaPorElServidor);
  const conHuella = hayHuella();
  return (
    <MarcoDeEntrada testId="entrar" conPuntos
      titulo="Precios al día, ventas y stock de la ferretería."
      bajada="Ferrebress es el sistema del mostrador: se usa desde el celular y desde la computadora, con los mismos datos.">
      <h2>Entrar</h2>
      <p className="entrar-como">
        {conHuella
          ? "Acá no hay contraseñas. Entrás con la huella, si ya vinculaste este dispositivo, o con tu cuenta de Google."
          : "Acá no hay contraseñas. Entrás con tu cuenta de Google."}
      </p>
      {cerrada && <Aviso tipo="alerta" testId="sesion-cerrada"><strong className="entrar-error-titulo">Hay que iniciar sesión</strong>La sesión de este dispositivo se cerró o venció. Entrá de nuevo para seguir.</Aviso>}
      {!enLinea && <Aviso tipo="alerta" testId="entrar-sin-conexion">Sin conexión. Para entrar se necesita internet: cuando vuelva, probá de nuevo.</Aviso>}
      <BotonHuella />
      {conHuella && <div className="entrar-o" aria-hidden="true"><span>o</span></div>}
      <BotonGoogle />
      <p className="entrar-nota">
        <Icono nombre="info" tam={18} />
        <span>Solo entran las personas que un Administrador del negocio autorizó. Si es tu primera vez, pedile que agregue tu correo de Google.</span>
      </p>
    </MarcoDeEntrada>
  );
}
