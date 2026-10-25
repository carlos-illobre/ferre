import { useEffect, useRef, useState } from "react";
import { useVolverCierra } from "../navegacion";

// Escaneo con la cámara del celular (issue #52). Detección nativa del navegador donde
// existe (Chrome en Android); si no, una librería de decodificación cargada recién ahí.
// También se puede tipear el código (y mandarlo con Enter): sirve cuando la cámara no lee o no hay.
// Apenas se lee o se manda un código, el escáner se cierra; con `seguido`, sigue leyendo (Vender en
// el celular, decisión 119: la cámara va arriba y la venta se sigue viendo debajo).
type Detector = { detect(fuente: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global { interface Window { BarcodeDetector?: new (opciones?: { formats?: string[] }) => Detector } }

export const hayCamara = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

type Referencia<T> = { current: T };

// Lo que se lee: el mismo código varias veces seguidas cuenta una sola vez. Leído un código, la
// cámara se cierra sola (pedido de Carlos del 2026-10-12): para leer otro se la vuelve a abrir.
// En Vender sigue abierta (decisión 119).
function crearEntrega(alDetectar: (codigo: string) => void, seguido: Referencia<boolean>, alCerrar: Referencia<() => void>) {
  let ultimoCodigo = "";
  let ultimoMomento = 0;
  return (codigo: string) => {
    const ahora = Date.now();
    if (codigo === ultimoCodigo && ahora - ultimoMomento < 2500) return;
    ultimoCodigo = codigo; ultimoMomento = ahora;
    navigator.vibrate?.(60);
    alDetectar(codigo);
    if (!seguido.current) alCerrar.current();
  };
}

// La detección nativa del navegador: un cuadro cada 250 ms. Devuelve cómo detenerla.
function leerConDetector(video: HTMLVideoElement, entregar: (codigo: string) => void): () => void {
  const detector = new window.BarcodeDetector!({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
  const intervalo = setInterval(async () => {
    if (video.readyState < 2) return;
    try { const r = await detector.detect(video); if (r[0]) entregar(r[0].rawValue); } catch { /* cuadro sin código */ }
  }, 250);
  return () => clearInterval(intervalo);
}

// Sin detección nativa, la librería, cargada recién ahora.
async function leerConLibreria(video: HTMLVideoElement, entregar: (codigo: string) => void): Promise<() => void> {
  const [{ BrowserMultiFormatReader }] = await Promise.all([import("@zxing/browser"), import("./esquinasDelQR")]);
  const controles = await new BrowserMultiFormatReader().decodeFromVideoElement(video, (resultado) => { if (resultado) entregar(resultado.getText()); });
  return () => controles.stop();
}

// Abre la cámara de atrás en el video y empieza a leer. Devuelve cómo detener todo, o null si
// ya no hacía falta.
async function abrirLaCamara(video: HTMLVideoElement, entregar: (codigo: string) => void, sigueVivo: () => boolean, alPrender: () => void): Promise<(() => void) | null> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
  const apagar = () => stream.getTracks().forEach((t) => t.stop());
  if (!sigueVivo()) { apagar(); return null; }
  video.srcObject = stream;
  await video.play();
  alPrender();
  const detenerLectura = window.BarcodeDetector ? leerConDetector(video, entregar) : await leerConLibreria(video, entregar);
  return () => { detenerLectura(); apagar(); };
}

function useCamara(video: Referencia<HTMLVideoElement | null>, alDetectar: (codigo: string) => void, alCerrar: () => void, seguido: boolean) {
  const [error, setError] = useState<string | null>(null);
  const [activa, setActiva] = useState(false);
  const alCerrarRef = useRef(alCerrar);
  useEffect(() => { alCerrarRef.current = alCerrar; }, [alCerrar]);
  const seguidoRef = useRef(seguido);
  useEffect(() => {
    let vivo = true;
    let detener: (() => void) | null = null;
    const el = video.current;
    if (!hayCamara() || !el) { setError("Este dispositivo no tiene cámara disponible. Podés tipear el código."); return; }
    const entregar = crearEntrega(alDetectar, seguidoRef, alCerrarRef);
    abrirLaCamara(el, entregar, () => vivo, () => setActiva(true))
      .then((d) => { detener = d; })
      .catch((e) => setError(`No se pudo abrir la cámara (${(e as Error).message}). Podés tipear el código.`));
    return () => { vivo = false; detener?.(); };
  }, [alDetectar, video]);
  return { error, activa };
}

// También se puede tipear el código y mandarlo con Enter.
function TipearCodigo({ alDetectar, alCerrar, seguido }: { alDetectar: (codigo: string) => void; alCerrar: () => void; seguido: boolean }) {
  const [manual, setManual] = useState("");
  return (
    <form className="en-linea" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { alDetectar(manual.trim()); setManual(""); if (!seguido) alCerrar(); } }}>
      <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="O tipeá el código y Enter" inputMode="numeric" enterKeyHint="send" aria-label="Tipear el código de barras" data-testid="codigo-manual" style={{ flex: 1 }} />
      <button type="button" className="grande" onClick={alCerrar}>Cerrar</button>
    </form>
  );
}

export function Escaner({ alDetectar, alCerrar, ultimo, seguido = false, className = "" }: { alDetectar: (codigo: string) => void; alCerrar: () => void; ultimo?: string | null; seguido?: boolean; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  // El botón de volver del celular cierra la cámara y deja la pantalla como estaba.
  useVolverCierra(alCerrar);
  const { error, activa } = useCamara(video, alDetectar, alCerrar, seguido);
  return (
    <div className={`escaner ${className}`} role="dialog" aria-label="Escanear código de barras" data-testid="escaner">
      <video ref={video} muted playsInline className={activa ? "activa" : ""} />
      {activa && <div className="guia" aria-hidden="true" />}
      <div className="escaner-abajo">
        {error && <p className="error">{error}</p>}
        {ultimo && <p className="escaner-leido" role="status" data-testid="escaner-ultimo">{ultimo}</p>}
        <TipearCodigo alDetectar={alDetectar} alCerrar={alCerrar} seguido={seguido} />
      </div>
    </div>
  );
}
