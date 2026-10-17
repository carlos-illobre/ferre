import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConectandoConGoogle } from "../ConectandoConGoogle";
import { useSesion, type Usuario } from "../../../sesion";
import { entrarConHuella, hayHuella } from "../../../credenciales";
import { marcarEntradaConGoogle } from "../componentes/OfrecerHuella";
import { AvisoError, Icono } from "../componentes/base";
import { entrarConGoogle } from "../../../negocio/vinculo";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Cuánto se espera la cuenta de Google después de volver de su ventana antes de dar por cancelado.
export const ESPERA_DE_GOOGLE_MS = 6000;

// Dos formas de entrar, sin contraseñas (ADR-011): la huella del celular vinculado o la
// cuenta de Google.
// `conPantallaDeCarga`: al volver de Google, mientras se abre la sesión, se tapa la entrada con
// «Conectando tu cuenta de Google» (007-T021): si no, parece que no se pudo entrar.
export function BotonGoogle({ conPantallaDeCarga = false }: { conPantallaDeCarga?: boolean } = {}) {
  const { entrar } = useSesion();
  const [error, setError] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);
  const boton = useRef<HTMLDivElement>(null);
  const sinRespuesta = useRef<number | undefined>(undefined);

  // Google avisa la cuenta un instante después de que se vuelve de su ventana, y en ese instante
  // se veía la entrada. Por eso la pantalla de carga sale apenas se vuelve a la página después de
  // tocar el botón de Google (el foco se fue a su recuadro); si Google no manda la cuenta (se
  // canceló), a los pocos segundos vuelve la entrada.
  useEffect(() => {
    if (!conPantallaDeCarga) return;
    let fueAGoogle = false;
    const alSalir = () => { const activo = document.activeElement; if (activo instanceof HTMLIFrameElement && boton.current?.contains(activo)) fueAGoogle = true; };
    const alVolver = () => {
      if (!fueAGoogle || document.visibilityState !== "visible") return;
      fueAGoogle = false;
      setConectando(true);
      window.clearTimeout(sinRespuesta.current);
      sinRespuesta.current = window.setTimeout(() => setConectando(false), ESPERA_DE_GOOGLE_MS);
    };
    window.addEventListener("blur", alSalir);
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => { window.removeEventListener("blur", alSalir); window.removeEventListener("focus", alVolver); document.removeEventListener("visibilitychange", alVolver); window.clearTimeout(sinRespuesta.current); };
  }, [conPantallaDeCarga]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !boton.current) return;
    const intervalo = setInterval(() => {
      const google = window.google;
      if (!google || !boton.current) return;
      clearInterval(intervalo);
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: "popup",
        callback: async ({ credential }) => {
          window.clearTimeout(sinRespuesta.current);
          if (conPantallaDeCarga) setConectando(true);
          try {
            const r = await entrarConGoogle(credential, describirDispositivo());
            marcarEntradaConGoogle();
            entrar(r.token, r.usuario);
          } catch (e) {
            setConectando(false);
            setError((e as Error).message);
            // Al volver, el botón de Google queda con el foco o «tocado» y se ve más claro: se lo
            // suelta y se lo vuelve a dibujar, con su azul de siempre (007-T029).
            if (document.activeElement instanceof HTMLElement && boton.current?.contains(document.activeElement)) document.activeElement.blur();
            dibujar();
          }
        },
      });
      // El botón original de Google, sin nada encima ni estilos nuestros (decisión 69).
      const dibujar = () => {
        if (!boton.current) return;
        const ancho = Math.round(Math.min(400, Math.max(200, boton.current.clientWidth || 320)));
        boton.current.replaceChildren();
        google.accounts.id.renderButton(boton.current, { theme: "filled_blue", size: "large", shape: "pill", text: "continue_with", locale: "es", width: ancho });
      };
      dibujar();
    }, 200);
    return () => clearInterval(intervalo);
  }, [entrar, conPantallaDeCarga]);

  return (
    <>
      {GOOGLE_CLIENT_ID ? <div className="boton-google" ref={boton} /> : <p className="ayuda-clara">El botón de Google no está configurado en esta versión (falta VITE_GOOGLE_CLIENT_ID).</p>}
      {error && <div data-testid="error-google"><AvisoError texto={error} /></div>}
      {conectando && createPortal(<ConectandoConGoogle />, document.body)}
    </>
  );
}

export function Login() {
  return (
    <main className="entrar" data-testid="entrar">
      <div className="arriba">
        <div className="logo">fe</div>
        <h1>El cuaderno,<br />sin cuaderno.</h1>
        <p className="lema">Vendé, comprá y contá desde el celular o la computadora. Sin contraseñas: entrás con tu cuenta de Google autorizada, o con la huella del celular.</p>
      </div>
      <div className="abajo">
        <BotonHuella />
        <p className="ayuda-clara">Entrá con tu cuenta de Google.</p>
        <BotonGoogle />
      </div>
    </main>
  );
}

// Entrar con la huella: solo en dispositivos que la tienen; el celular tiene que estar
// vinculado antes desde Negocio (entrando con Google una vez).
// `enseguida`: pide la huella apenas aparece, sin esperar el toque (se viene de escanear el
// código de la computadora, decisión 65). Si no se lee, el botón queda para probar de nuevo.
export function BotonHuella({ detalle, titulo = "Entrar con la huella", enseguida = false }: { detalle?: string; titulo?: string; enseguida?: boolean } = {}) {
  const { entrar } = useSesion();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const pedida = useRef(false);
  useEffect(() => {
    if (!enseguida || pedida.current || !hayHuella()) return;
    pedida.current = true;
    void conHuella();
  });
  if (!hayHuella()) return null;
  async function conHuella() {
    setOcupado(true); setError(null);
    try { const r = await entrarConHuella(describirDispositivo()); entrar(r.token, r.usuario); }
    catch (e) { setError((e as Error).name === "NotAllowedError" ? "No se leyó la huella. Probá de nuevo." : (e as Error).message); }
    finally { setOcupado(false); }
  }
  return (
    <>
      <button type="button" className={detalle ? "entrar-huella" : "boton blanco"} onClick={conHuella} disabled={ocupado} data-testid="entrar-huella"><Icono nombre="huella" tam={22} />{detalle ? <span><strong>{titulo}</strong><small>{detalle}</small></span> : titulo}</button>
      {error && <div data-testid="error-huella"><AvisoError texto={error} /></div>}
    </>
  );
}

// Celular = Android o iPhone/iPad. La oferta de huella al primer login es solo para ellos.
export const esCelular = () => /Android|iPhone|iPad/.test(navigator.userAgent);
export function describirDispositivo(): string {
  const ua = navigator.userAgent;
  const tipo = esCelular() ? "celular" : "computadora";
  const navegador = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${tipo} · ${navegador}`;
}
