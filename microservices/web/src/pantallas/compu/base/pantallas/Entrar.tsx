import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ErrorApi } from "../../../../api";
import { useSesion } from "../../../../sesion";
import QRCode from "qrcode";
import { dispositivoId, guardarPuestoLocal } from "../../../../puesto";
import { entrarConHuella, hayHuella, huellaVinculadaAca } from "../../../../credenciales";
import { describirDispositivo, esCelular } from "../dispositivo";
import { marcarEntradaConGoogle } from "./OfrecerHuella";
import { useEnLinea } from "./negocio-comun";
import { Aviso, Boton, Icono, Marca, Progreso, type NombreDeIcono } from "../ui";
import "../estilos/entrar.css";
import "../estilos/entrar-con-celular.css";
import fotoDelLocal from "../imagenes/entrar-foto.jpg";
import celularVendiendo from "../imagenes/entrar-celular-venta.jpg";
import { entrarConGoogle } from "../../../../negocio/vinculo";
import type { CodigoDeEntrada, ConsultaDeCodigo, EstadoDelCodigo, PedidoDeCodigo } from "@servidor/sesiones";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Si el servidor dio por terminada la sesión (la cerraron a distancia o venció), la app
// vuelve sola a la entrada y la entrada lo dice. Se anota acá porque la entrada todavía no
// está en pantalla cuando llega el aviso.
let sesionCerradaPorElServidor = false;
if (typeof window !== "undefined") window.addEventListener("sesion-cerrada", () => { sesionCerradaPorElServidor = true; });

// Viven en dispositivo.ts; se reexportan porque quien arma una entrada los busca acá.
export { describirDispositivo, esCelular };

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
      texto: `${correo ?? "Ese correo"} no está autorizado para entrar a Ferrebress. Pedile a un Administrador del negocio que lo agregue en Más → Usuarios, o probá con otra cuenta de Google.`,
    };
  }
  if (e.estado === 403) return { titulo: "Usuario desactivado", texto: "Tu usuario está desactivado. Pedile a un Administrador del negocio que lo reactive." };
  if (e.estado === 401 && medio === "huella") return { texto: "Este dispositivo no está vinculado a ninguna cuenta. Entrá con Google; después lo vinculás desde Más → Usuarios, en «Sesiones»." };
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
// Al entrar, el servidor acepta solo los correos autorizados en Más → Usuarios.
export function BotonGoogle({ tema = "filled_blue" }: { tema?: "outline" | "filled_blue" | "filled_black" }) {
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
            const r = await entrarConGoogle(credential, describirDispositivo());
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
      google.accounts.id.renderButton(lugar.current, { theme: tema, size: "large", shape: "pill", text: "continue_with", locale: "es", width: ancho });
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

// Los textos de la entrada, los mismos en el celular y en la computadora: es una sola
// aplicación y se tiene que notar desde la primera pantalla.
export const TEXTOS_DE_ENTRADA = {
  titulo: "Precios al día, ventas y stock de la ferretería.",
  lema: "Tu ferretería, en orden", // la versión corta, para la entrada del celular
  bajada: "Ferrebress es el sistema del mostrador: se usa desde el celular y desde la computadora, con los mismos datos.",
  entrar: "Entrar",
  conElCelular: "Entrá con tu celular",
  pasoLeer: "En el celular, abrí Ferrebress, tocá «Escanear el código de la computadora» y apuntá acá. También sirve la cámara del teléfono.",
  pasoHuella: "Poné la huella en el celular. Esta pantalla entra sola.",
  codigoSeRenueva: "El código se renueva solo cada 5 minutos. No hay contraseñas.",
  comoConHuella: "Acá no hay contraseñas. Entrás con la huella, si ya vinculaste este dispositivo, o con tu cuenta de Google.",
  comoSinHuella: "Acá no hay contraseñas. Entrás con tu cuenta de Google.",
  nota: "Solo entran las personas que un Administrador del negocio autorizó. Si es tu primera vez, pedile que agregue tu correo de Google.",
  // Solo en la entrada de la computadora (decisión 93).
  antetitulo: "El sistema del mostrador",
  rapido: "Es rápido, seguro y sin contraseñas.",
  manuscrito: ["Más tiempo", "para hacer crecer", "tu negocio"],
  protegidos: "Tus datos están protegidos",
  sinConexion: "Sin conexión. Para entrar se necesita internet: cuando vuelva, probá de nuevo.",
};

export const QUE_HACE: { icono: NombreDeIcono; texto: string }[] = [
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
// El código para entrar con el celular (RF-76): se pide solo, se muestra como QR, y cada dos
// segundos se pregunta si ya lo aprobaron. Al vencer se pide otro. La clave que retira la
// sesión no sale de acá: el QR solo lleva el código.
const CADA_MS = 2000;
function useCodigoParaEntrar(activo: boolean): { qr: string | null; error: string | null } {
  const { entrar } = useSesion();
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!activo) { setQr(null); return; }
    let vigente = true;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const esperar = (ms: number, que: () => void) => { espera = setTimeout(que, ms); };
    async function pedir() {
      try {
        const { id, codigo, clave, expiraEnSegundos } = await api<CodigoDeEntrada>("/sesiones/vinculaciones", { method: "POST", body: JSON.stringify({ dispositivo: describirDispositivo() } satisfies PedidoDeCodigo) });
        if (!vigente) return;
        const enlace = `${location.origin}${location.pathname}#/entrar-compu?codigo=${encodeURIComponent(codigo)}`;
        // Para las pruebas automáticas: el enlace que el celular abriría.
        (window as unknown as { __enlaceParaEntrar?: string }).__enlaceParaEntrar = enlace;
        setQr(await QRCode.toDataURL(enlace, { width: 440, margin: 0, color: { dark: "#17312b", light: "#ffffff" } }));
        setError(null);
        const vence = Date.now() + expiraEnSegundos * 1000;
        const preguntar = async () => {
          if (!vigente) return;
          if (Date.now() > vence) return void pedir();
          // Con la ventana tapada no se pregunta: nadie está por entrar.
          if (document.visibilityState === "hidden") return esperar(CADA_MS, () => void preguntar());
          const r = await api<EstadoDelCodigo>(`/sesiones/vinculaciones/${id}/estado`, { method: "POST", body: JSON.stringify({ clave, dispositivo_id: dispositivoId() } satisfies ConsultaDeCodigo) }).catch(() => null);
          if (!vigente) return;
          if (r?.estado === "aprobada" && r.token && r.usuario) {
            // El celular que la dejó entrar queda emparejado: escanea y manda fotos sin leer más códigos.
            if (r.puesto) guardarPuestoLocal(r.puesto);
            return entrar(r.token, r.usuario);
          }
          if (r?.estado === "vencida") return void pedir();
          esperar(CADA_MS, () => void preguntar());
        };
        esperar(CADA_MS, () => void preguntar());
      } catch (e) {
        if (!vigente) return;
        setQr(null);
        setError(e instanceof ErrorApi ? e.message : "No se pudo pedir el código. Reintentando…");
        esperar(5000, () => void pedir());
      }
    }
    void pedir();
    return () => { vigente = false; if (espera) clearTimeout(espera); };
  }, [activo, entrar]);
  return { qr, error };
}

// La entrada de la computadora (decisión 93): copia la imagen de referencia de Carlos. El verde
// con la marca a la izquierda; en el medio, la foto del local entre dos bordes curvos, con un
// celular que muestra una venta (una captura real de Vender); a la derecha, la tarjeta para
// entrar. En el celular la entrada es otra (celular/pantallas/Login.tsx) y no cambia.
function MarcoDeEntradaConCelular({ children }: { children: ReactNode }) {
  return (
    <main className="entrar-cc" data-testid="entrar">
      <div className="entrar-cc-foto" style={{ backgroundImage: `url(${fotoDelLocal})` }} aria-hidden="true" />
      <svg className="entrar-cc-fondo" viewBox="0 0 1536 1024" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="verde" d="M0 0H830C770 90 712 230 684 400C656 570 610 760 540 880C500 950 455 995 418 1024H0Z" />
        <path className="cinta" d="M872 0C826 90 796 190 805 300C815 420 868 520 880 640C890 760 912 870 878 1024" strokeDasharray="0 270 470 2000" />
        <path className="claro" d="M872 0C826 90 796 190 805 300C815 420 868 520 880 640C890 760 912 870 878 1024H1536V0Z" />
        <path className="curva" d="M872 0C826 90 796 190 805 300C815 420 868 520 880 640C890 760 912 870 878 1024H1536V1010C1360 1000 1150 930 1010 700C930 560 900 420 910 300C918 190 930 90 960 0Z" />
        <path className="curva-2" d="M1536 760C1420 820 1300 930 1250 1024H1536Z" />
        <path className="curva-3" d="M1536 60C1470 200 1480 380 1536 470Z" />
      </svg>
      <section className="entrar-cc-marca">
        <Marca tam={64} />
        <p className="entrar-cc-antetitulo">{TEXTOS_DE_ENTRADA.antetitulo}</p>
        <h1>Precios al día,<br />ventas y stock<br /><em>de la ferretería.</em></h1>
        <p className="entrar-cc-bajada">{TEXTOS_DE_ENTRADA.bajada}</p>
        <ul className="entrar-cc-puntos">
          {QUE_HACE.map((q) => <li key={q.icono}><span><Icono nombre={q.icono} tam={30} /></span>{q.texto}</li>)}
        </ul>
        <div className="entrar-cc-lema" aria-hidden="true">
          <p className="entrar-cc-manuscrito">{TEXTOS_DE_ENTRADA.manuscrito.map((l) => <span key={l}>{l}</span>)}</p>
          <svg className="entrar-cc-flecha" viewBox="0 0 122 70" focusable="false"><path d="M4 62C40 66 80 58 112 10M96 12 113 8 114 26" /></svg>
        </div>
      </section>
      <div className="entrar-cc-sombra" aria-hidden="true" />
      <div className="entrar-cc-celular" aria-hidden="true"><img src={celularVendiendo} alt="" /></div>
      <section className="entrar-cc-tarjeta">
        {children}
        <p className="entrar-cc-pie"><span><Icono nombre="candado" tam={18} />{TEXTOS_DE_ENTRADA.protegidos}</span><span className="raya" aria-hidden="true" /><img src={`${import.meta.env.BASE_URL}logotipo-ferrebress.png`} alt="Ferrebress" /></p>
      </section>
    </main>
  );
}

export function Entrar() {
  const enLinea = useEnLinea();
  const [cerrada] = useState(() => sesionCerradaPorElServidor);
  const conHuella = hayHuella() && huellaVinculadaAca();
  const { qr, error: errorDeCodigo } = useCodigoParaEntrar(enLinea);
  return (
    <MarcoDeEntradaConCelular>
      <h2>{TEXTOS_DE_ENTRADA.conElCelular}</h2>
      <p className="entrar-cc-rapido">{TEXTOS_DE_ENTRADA.rapido}</p>
      {cerrada && <Aviso tipo="alerta" testId="sesion-cerrada"><strong className="entrar-error-titulo">Hay que iniciar sesión</strong>La sesión de este dispositivo se cerró o venció. Entrá de nuevo para seguir.</Aviso>}
      {!enLinea && <Aviso tipo="alerta" testId="entrar-sin-conexion">{TEXTOS_DE_ENTRADA.sinConexion}</Aviso>}
      {enLinea && (
        <div className="entrar-codigo">
          <div className="entrar-qr" data-testid="qr-entrar">
            {qr ? <img src={qr} alt="Código para entrar con el celular" width={220} height={220} /> : <div className="esqueleto" aria-label="Generando el código" />}
          </div>
          <ol className="entrar-pasos">
            <li><span>{TEXTOS_DE_ENTRADA.pasoLeer}</span></li>
            <li><span>{TEXTOS_DE_ENTRADA.pasoHuella}</span></li>
          </ol>
        </div>
      )}
      {enLinea && <p className="entrar-como entrar-cc-renueva"><Icono nombre="reloj" tam={26} /><span>{TEXTOS_DE_ENTRADA.codigoSeRenueva}</span></p>}
      <Aviso tipo="error">{errorDeCodigo}</Aviso>
      <div className="entrar-o" aria-hidden="true"><span>o</span></div>
      {conHuella && <BotonHuella />}
      <BotonGoogle />
      <p className="entrar-nota">
        <Icono nombre="error" tam={18} />
        <span>{TEXTOS_DE_ENTRADA.nota}</span>
      </p>
    </MarcoDeEntradaConCelular>
  );
}
