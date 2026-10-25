import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { api, ErrorApi } from "../../../../datos/conexion";
import { useSesion } from "../../../../datos/sesion";
import QRCode from "qrcode";
import { dispositivoId, guardarPuestoLocal } from "../../../../puesto";
import { entrarConHuella, hayHuella, huellaVinculadaAca } from "../../../../datos/credenciales";
import { describirDispositivo, esCelular } from "../../../../plataforma/dispositivo";
import { marcarEntradaConGoogle } from "./OfrecerHuella";
import { Aviso, Boton, Icono, Marca, Progreso, type NombreDeIcono } from "../ui";
import "../estilos/entrar.css";
import "../estilos/entrar-con-celular.css";
// Las arma tests/capturas/entrada-compu.py con las capas de Carlos y una captura real de Vender.
import fondoDeLaEntrada from "../imagenes/entrar-fondo.jpg";
import celularVendiendo from "../imagenes/entrar-celular.png";
import { entrarConGoogle, useClienteDeGoogle } from "../../../../negocio/vinculo";
import { irA } from "../rutas";
import { urlApi } from "../../../../datos/conexion";
import { useResponde, type Disponibilidad } from "../../../../plataforma/servidor/useResponde";
import { ISOTIPO_SOBRE_CLARO } from "../../../isotipo";
import type { CodigoDeEntrada, ConsultaDeCodigo, EstadoDelCodigo, PedidoDeCodigo } from "@servidor/sesiones";


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
  if (e.estado === 401 && medio === "huella") return { texto: "Este dispositivo no está vinculado a ninguna cuenta. Entrá con Google; después lo vinculás desde Más → Configuración." };
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
// `estirar`: Google lo dibuja de 400 px como mucho; estirado, se agranda en proporción hasta
// ocupar el ancho de su lugar (la tarjeta de la entrada de la computadora, decisión 93).
export function BotonGoogle({ tema = "filled_blue", estirar = false }: { tema?: "outline" | "filled_blue" | "filled_black"; estirar?: boolean }) {
  const { entrar } = useSesion();
  const [error, setError] = useState<ErrorDeEntrada | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [estado, setEstado] = useState<"esperando" | "listo" | "sin-google">("esperando");
  const lugar = useRef<HTMLDivElement>(null);
  const { clienteId, fallo } = useClienteDeGoogle();

  useEffect(() => {
    if (!clienteId || !lugar.current) return;
    const desde = Date.now();
    let dibujado = 400; // el ancho con que Google dibujó el botón
    const intervalo = setInterval(() => {
      const google = window.google;
      if (!google || !lugar.current) {
        // El script de Google no llegó: se avisa, y se sigue esperando por si llega.
        if (Date.now() - desde > 8000) setEstado("sin-google");
        return;
      }
      clearInterval(intervalo);
      google.accounts.id.initialize({
        client_id: clienteId,
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
            // Al volver, el botón de Google queda con el foco y se ve más claro: se lo suelta y se
            // lo vuelve a dibujar, con su color de siempre (007-T030, como en el celular).
            if (document.activeElement instanceof HTMLElement && lugar.current?.contains(document.activeElement)) document.activeElement.blur();
            dibujar();
          }
        },
      });
      // Google pide el ancho en píxeles (entre 200 y 400): el del lugar que le toca.
      const dibujar = () => {
        if (!lugar.current) return;
        const ancho = Math.round(Math.min(400, Math.max(200, lugar.current.clientWidth || 320)));
        lugar.current.replaceChildren();
        google.accounts.id.renderButton(lugar.current, { theme: tema, size: "large", shape: "pill", text: "continue_with", locale: "es", width: ancho });
        dibujado = ancho;
        if (estirar) ajustar();
      };
      dibujar();
      setEstado("listo");
    }, 200);
    // El lugar puede ser más ancho que el botón: la escala es la que lo llena, y se vuelve a
    // calcular cada vez que el lugar cambia de ancho.
    const ajustar = () => { const l = lugar.current; if (l) l.style.setProperty("--escala-google", String(Math.max(1, l.clientWidth / dibujado))); };
    const observador = estirar && typeof ResizeObserver !== "undefined" ? new ResizeObserver(ajustar) : null;
    if (observador && lugar.current) observador.observe(lugar.current);
    return () => { clearInterval(intervalo); observador?.disconnect(); };
  }, [entrar, tema, estirar, clienteId]);

  return (
    <div className="entrar-google">
      <div className={`entrar-google-lugar ${estirar ? "estirado" : ""} ${estado === "listo" ? "" : "esperando"} ${entrando ? "ocupado" : ""}`} ref={lugar} aria-busy={estado === "esperando" || entrando} />
      {estado === "esperando" && <span className="solo-lectores" role="status">Cargando el botón de Google…</span>}
      {(estado === "sin-google" || fallo) && <Aviso tipo="alerta" accion={<Boton tam="chico" onClick={() => location.reload()}>Reintentar</Boton>}>{TEXTOS_DE_ENTRADA.googleNoResponde}{hayHuella() ? " Si este dispositivo ya está vinculado, podés entrar con la huella." : ""}</Aviso>}
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
  lema: "Vendé, contá y cobrá desde el mostrador o el depósito.", // la versión corta, para la entrada del celular (decisión 117)
  bajada: "Ferrebress es el sistema del mostrador: se usa desde el celular y desde la computadora, con los mismos datos.",
  entrar: "Entrar",
  conElCelular: "Entrá con tu celular",
  pasoLeer: "En el celular, abrí Ferrebress, tocá «Escanear el código de la computadora» y apuntá acá. También sirve la cámara del teléfono.",
  pasoHuella: "Poné la huella en el celular. Esta pantalla entra sola.",
  codigoSeRenueva: "El código se renueva solo cada 5 minutos. No hay contraseñas.",
  comoConHuella: "Acá no hay contraseñas. Entrás con la huella, si ya vinculaste este dispositivo, o con tu cuenta de Google.",
  comoSinHuella: "Acá no hay contraseñas. Entrás con tu cuenta de Google.",
  nota: "Solo entran las personas que un Administrador del negocio autorizó. Si es tu primera vez, pedile que agregue tu correo de Google.",
  // Solo en la entrada de la computadora (decisiones 93 y 118).
  antetitulo: "El sistema del mostrador",
  masRapida: "La forma más rápida",
  conTuUsuario: "Entra con tu usuario, sin contraseñas, en cuanto ponés tu huella.",
  pasos: [
    { titulo: "Apuntá el celular a este código", detalle: "Con la cámara o con «Escanear» en la entrada de Ferrebress." },
    { titulo: "Poné la huella en el celular", detalle: "Si todavía no la vinculaste, entrás con Google ahí mismo." },
  ],
  cambiaEn: "Cambia en",
  sirveUnaVez: "y sirve una vez",
  estaComputadora: "Computadora del mostrador",
  conexion: { "conectando": "Conectando…", "en-linea": "En línea", "sin-conexion": "Sin conexión" } satisfies Record<Disponibilidad, string>,
  protegidos: "Tus datos están protegidos",
  tutorial: "Ver tutorial",
  sinConexion: "Sin conexión. Para entrar se necesita internet: cuando vuelva, probá de nuevo.",
  googleNoResponde: "Google no responde. Revisá la conexión y reintentá.",
};

// Debajo de la tarjeta de la computadora, cada uno en dos renglones: las tres características
// técnicas que más importan (decisión 118).
export const SELLOS: { icono: NombreDeIcono; renglones: [string, string] }[] = [
  { icono: "sin-internet", renglones: ["Una vez dentro, resiste", "cortes de internet"] },
  { icono: "escanear", renglones: ["Busca productos", "por código de barras"] },
  { icono: "dispositivos", renglones: ["Maneja la computadora", "desde el celular"] },
];

// El código para entrar lleva el isotipo en el centro (decisión 118). El isotipo tapa cerca del 5 % del
// código; con la corrección de errores más alta, que recupera hasta el 30 %, queda margen para una
// cámara real (reflejos, foco, la pantalla en ángulo). Entrar.qr.test.ts comprueba que el escáner de
// la aplicación lo lee igual.
export const QR_DE_ENTRADA = { nivel: "H", isotipo: 0.22 } as const;

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
function useCodigoParaEntrar(activo: boolean): { qr: string | null; error: string | null; vence: number | null; duracion: number } {
  const { entrar } = useSesion();
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vence, setVence] = useState<number | null>(null);
  const [duracion, setDuracion] = useState(300);
  useEffect(() => {
    if (!activo) { setQr(null); setVence(null); return; }
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
        setQr(await QRCode.toDataURL(enlace, { errorCorrectionLevel: QR_DE_ENTRADA.nivel, width: 440, margin: 0, color: { dark: "#17312b", light: "#ffffff" } }));
        setError(null);
        const vence = Date.now() + expiraEnSegundos * 1000;
        setVence(vence); setDuracion(expiraEnSegundos);
        const preguntar = async () => {
          if (!vigente) return;
          if (Date.now() > vence) return void pedir();
          // Con la ventana tapada no se pregunta: nadie está por entrar.
          if (document.visibilityState === "hidden") return esperar(CADA_MS, () => void preguntar());
          const r = await api<EstadoDelCodigo>(`/sesiones/vinculaciones/${id}/estado`, { method: "POST", body: JSON.stringify({ clave, dispositivo_id: dispositivoId() } satisfies ConsultaDeCodigo) }).catch(() => null);
          if (!vigente) return;
          if (r?.estado === "aprobada" && r.token && r.usuario) {
            // El celular que la dejó entrar queda emparejado: escanea y manda fotos sin leer más códigos.
            // Primero la sesión: guardar el emparejamiento conecta el espejo, y sin sesión el servidor lo rechaza.
            entrar(r.token, r.usuario);
            if (r.puesto) guardarPuestoLocal(r.puesto);
            return;
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
  return { qr, error, vence, duracion };
}

// La entrada de la computadora (decisión 93): copia la imagen de referencia de Carlos, armada con
// sus capas. El verde con la marca a la izquierda; en el medio, la foto del local entre dos bordes
// curvos, con un celular que muestra una venta (una captura real de Vender); a la derecha, la
// tarjeta para entrar. En el celular la entrada es otra (celular/pantallas/Login.tsx) y no cambia.
// Cada una de las tres cosas que hace va en dos renglones, cortada donde la corta la referencia:
// después del «;», antes de «con» o después de la primera coma.
function partirEnDos(texto: string): [string, string] {
  const puntoYComa = texto.indexOf("; ");
  if (puntoYComa >= 0) return [texto.slice(0, puntoYComa + 1), texto.slice(puntoYComa + 2)];
  const con = texto.indexOf(" con ");
  if (con >= 0) return [texto.slice(0, con), texto.slice(con + 1)];
  const coma = texto.indexOf(", ");
  if (coma >= 0) return [texto.slice(0, coma + 1), texto.slice(coma + 2)];
  return [texto, ""];
}

function MarcoDeEntradaConCelular({ conexion, children }: { conexion: Disponibilidad; children: ReactNode }) {
  return (
    <main className="entrar-cc" data-testid="entrar">
      <div className="entrar-cc-escena">
        <div className="entrar-cc-fondo" style={{ backgroundImage: `url(${fondoDeLaEntrada})` }} aria-hidden="true" />
        <section className="entrar-cc-marca">
          <Marca tam={64} />
          <p className="entrar-cc-antetitulo">{TEXTOS_DE_ENTRADA.antetitulo}</p>
          <h1>Precios al día,<br />ventas y stock<br /><em>de la ferretería.</em></h1>
          <p className="entrar-cc-bajada">{TEXTOS_DE_ENTRADA.bajada}</p>
          <ul className="entrar-cc-puntos">
            {QUE_HACE.map((q) => { const [a, b] = partirEnDos(q.texto); return <li key={q.icono}><span><Icono nombre={q.icono} tam={30} /></span><span className="texto">{a}<br />{b}</span></li>; })}
          </ul>
          {/* Abre el manual de uso, en la misma pestaña (RF-97). */}
        <button type="button" className="entrar-cc-tutorial" onClick={() => irA("manual")} data-testid="ver-tutorial"><Icono nombre="reproducir" tam={22} />{TEXTOS_DE_ENTRADA.tutorial}</button>
        </section>
        <img className="entrar-cc-celular" src={celularVendiendo} alt="" aria-hidden="true" />
        {/* Esta computadora y si llega al servidor (decisión 118): sin servidor no se puede entrar. */}
        <p className="entrar-cc-estado">
          <span><Icono nombre="computadora" tam={16} />{TEXTOS_DE_ENTRADA.estaComputadora}</span>
          <span className={`entrar-cc-conexion ${conexion}`} role="status" data-testid="entrar-conexion" data-estado={conexion}>{TEXTOS_DE_ENTRADA.conexion[conexion]}</span>
        </p>
        <div className="entrar-cc-derecha">
          <section className="entrar-cc-tarjeta">
            {children}
            <p className="entrar-cc-pie"><span><Icono nombre="candado" tam={18} />{TEXTOS_DE_ENTRADA.protegidos}</span><span className="raya" aria-hidden="true" /><img src={`${import.meta.env.BASE_URL}logotipo-ferrebress.png`} alt="Ferrebress" /></p>
          </section>
          <ul className="entrar-cc-sellos" data-testid="sellos">
            {SELLOS.map((s) => <li key={s.icono}><Icono nombre={s.icono} tam={26} grosor={1.7} /><span>{s.renglones[0]}<br />{s.renglones[1]}</span></li>)}
          </ul>
        </div>
      </div>
    </main>
  );
}

// Cuánto falta para que el código cambie, de a un segundo, con un anillo que se vacía.
function Cuenta({ vence, duracion }: { vence: number; duracion: number }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const quedan = Math.max(0, Math.round((vence - ahora) / 1000));
  const parte = Math.min(1, quedan / Math.max(1, duracion));
  return (
    <p className="entrar-cc-cuenta" data-testid="entrar-cuenta">
      <span><i className="anillo" style={{ "--parte": parte } as CSSProperties} aria-hidden="true" />{TEXTOS_DE_ENTRADA.cambiaEn} <b>{Math.floor(quedan / 60)}:{String(quedan % 60).padStart(2, "0")}</b></span>
      <span>{TEXTOS_DE_ENTRADA.sirveUnaVez}</span>
    </p>
  );
}

const ISOTIPO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ISOTIPO_SOBRE_CLARO)}`;

export function Entrar() {
  const conexion = useResponde(urlApi("/health"));
  const enLinea = conexion === "en-linea";
  const [cerrada] = useState(() => sesionCerradaPorElServidor);
  const conHuella = hayHuella() && huellaVinculadaAca();
  const { qr, error: errorDeCodigo, vence, duracion } = useCodigoParaEntrar(enLinea);
  return (
    <MarcoDeEntradaConCelular conexion={conexion}>
      <div className="entrar-cc-titulo">
        <h2>{TEXTOS_DE_ENTRADA.conElCelular}</h2>
        <span className="entrar-cc-pastilla"><Icono nombre="celular" tam={14} />{TEXTOS_DE_ENTRADA.masRapida}</span>
      </div>
      <p className="entrar-cc-rapido">{TEXTOS_DE_ENTRADA.conTuUsuario}</p>
      {cerrada && <Aviso tipo="alerta" testId="sesion-cerrada"><strong className="entrar-error-titulo">Hay que iniciar sesión</strong>La sesión de este dispositivo se cerró o venció. Entrá de nuevo para seguir.</Aviso>}
      <div className="entrar-codigo">
        <div>
          <div className={`entrar-qr${enLinea ? "" : " apagado"}`} data-testid="qr-entrar">
            {enLinea && qr ? <img src={qr} alt="Código para entrar con el celular" width={220} height={220} /> : <div className="esqueleto" aria-label={enLinea ? "Generando el código" : "Sin conexión"} />}
            {enLinea && qr && <span className="entrar-qr-isotipo" aria-hidden="true" style={{ width: `${QR_DE_ENTRADA.isotipo * 100}%`, backgroundImage: `url("${ISOTIPO}")` }} />}
          </div>
          {enLinea && qr && vence && <Cuenta vence={vence} duracion={duracion} />}
        </div>
        <ol className="entrar-pasos">
          {TEXTOS_DE_ENTRADA.pasos.map((p) => <li key={p.titulo}><span><b>{p.titulo}</b>{p.detalle}</span></li>)}
        </ol>
      </div>
      {conexion === "sin-conexion" && <Aviso tipo="alerta" testId="entrar-sin-conexion">{TEXTOS_DE_ENTRADA.sinConexion}</Aviso>}
      <Aviso tipo="error">{enLinea ? errorDeCodigo : null}</Aviso>
      <div className="entrar-o" aria-hidden="true"><span>o</span></div>
      {/* Sin servidor tampoco se entra con Google ni con la huella: quedan apagados y no se pueden tocar (decisión 118). */}
      <div className={`entrar-cc-otras${conexion === "sin-conexion" ? " apagado" : ""}`} data-testid="entrar-otras" aria-disabled={conexion === "sin-conexion"} {...(conexion === "sin-conexion" ? { inert: "" } : {})}>
        {conHuella && <BotonHuella />}
        <BotonGoogle estirar />
      </div>
      <p className="entrar-nota">
        <Icono nombre="escudo" tam={18} />
        <span>{TEXTOS_DE_ENTRADA.nota}</span>
      </p>
    </MarcoDeEntradaConCelular>
  );
}
