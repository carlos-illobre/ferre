import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { hayHuella, useClienteDeGoogle, useEntrarConGoogle, useEntrarConHuella } from "../../../negocio/entrada";
import { useBotonDeGoogle } from "../../../plataforma/google";
import { TEXTOS_DE_ENTRADA } from "../../comun/entrada/textos-de-entrada";
import { AvisoError, Icono } from "../componentes/base";
import { ConectandoConGoogle } from "./ConectandoConGoogle";

// Cuánto se espera la cuenta de Google después de volver de su ventana antes de dar por cancelado.
export const ESPERA_DE_GOOGLE_MS = 6000;

// Google avisa la cuenta un instante después de que se vuelve de su ventana, y en ese instante se
// veía la entrada. Por eso «Conectando tu cuenta de Google» (007-T021) sale apenas se vuelve a la
// página después de tocar el botón de Google (el foco se fue a su recuadro); si Google no manda la
// cuenta (se canceló), a los pocos segundos vuelve la entrada.
function usePantallaDeCarga(activa: boolean, boton: RefObject<HTMLDivElement>) {
  const [conectando, setConectando] = useState(false);
  const sinRespuesta = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!activa) return;
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
  }, [activa, boton]);
  const llego = () => { window.clearTimeout(sinRespuesta.current); if (activa) setConectando(true); };
  return { conectando, llego, termino: () => setConectando(false) };
}

// Dos formas de entrar, sin contraseñas (ADR-011): la huella del celular vinculado o la cuenta de
// Google. El botón original de Google, sin nada encima ni estilos nuestros (decisión 69).
// `conPantallaDeCarga`: al volver de Google, mientras se abre la sesión, se tapa la entrada.
export function BotonGoogle({ conPantallaDeCarga = false }: { conPantallaDeCarga?: boolean } = {}) {
  const [error, setError] = useState<string | null>(null);
  const boton = useRef<HTMLDivElement>(null);
  const { clienteId, fallo } = useClienteDeGoogle();
  const conGoogle = useEntrarConGoogle();
  const carga = usePantallaDeCarga(conPantallaDeCarga, boton);
  const alRecibir = async (credencial: string) => {
    carga.llego();
    try { await conGoogle(credencial); return true; }
    catch (e) { carga.termino(); setError((e as Error).message); return false; }
  };
  useBotonDeGoogle({ lugar: boton, clienteId, tema: "filled_blue", alRecibir });
  return (
    <>
      <div className="boton-google" ref={boton} />
      {fallo && !clienteId && <AvisoError texto={TEXTOS_DE_ENTRADA.googleNoResponde} />}
      {error && <div data-testid="error-google"><AvisoError texto={error} /></div>}
      {carga.conectando && createPortal(<ConectandoConGoogle />, document.body)}
    </>
  );
}

const explicarLaHuella = (e: unknown) => ((e as Error).name === "NotAllowedError" ? "No se leyó la huella. Probá de nuevo." : (e as Error).message);

// Entrar con la huella: solo en dispositivos que la tienen; el celular tiene que estar vinculado
// antes desde Más → Configuración (entrando con Google una vez). `enseguida`: pide la huella apenas
// aparece, sin esperar el toque (se viene de escanear el código de la computadora, decisión 65).
// Si no se lee, el botón queda para probar de nuevo.
export function BotonHuella({ detalle, titulo = "Entrar con la huella", enseguida = false }: { detalle?: string; titulo?: string; enseguida?: boolean } = {}) {
  const h = useEntrarConHuella(explicarLaHuella);
  const pedida = useRef(false);
  useEffect(() => {
    if (!enseguida || pedida.current || !hayHuella()) return;
    pedida.current = true;
    void h.conHuella();
  });
  if (!hayHuella()) return null;
  return (
    <>
      <button type="button" className={detalle ? "entrar-huella" : "boton blanco"} onClick={h.conHuella} disabled={h.ocupado} data-testid="entrar-huella"><Icono nombre="huella" tam={22} />{detalle ? <span><strong>{titulo}</strong><small>{detalle}</small></span> : titulo}</button>
      {h.error && <div data-testid="error-huella"><AvisoError texto={h.error} /></div>}
    </>
  );
}
