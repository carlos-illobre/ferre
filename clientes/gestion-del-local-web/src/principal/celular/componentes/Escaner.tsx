import { useEffect, useRef, useState } from "react";

// Escaneo con la cámara del celular (issue #52). Detección nativa del navegador donde
// existe (Chrome en Android); si no, una librería de decodificación cargada recién ahí.
// También se puede tipear el código: sirve cuando la cámara no lee o no hay.
type Detector = { detect(fuente: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global { interface Window { BarcodeDetector?: new (opciones?: { formats?: string[] }) => Detector } }

export const hayCamara = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

export function Escaner({ alDetectar, alCerrar, ultimo }: { alDetectar: (codigo: string) => void; alCerrar: () => void; ultimo?: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [activa, setActiva] = useState(false);

  useEffect(() => {
    let vivo = true;
    let detener: (() => void) | null = null;
    (async () => {
      if (!hayCamara() || !video.current) { setError("Este dispositivo no tiene cámara disponible. Podés tipear el código."); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!vivo) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.current.srcObject = stream;
        await video.current.play();
        setActiva(true);
        let ultimoCodigo = "";
        let ultimoMomento = 0;
        const entregar = (codigo: string) => {
          const ahora = Date.now();
          if (codigo === ultimoCodigo && ahora - ultimoMomento < 2500) return; // el mismo código, varias veces seguidas
          ultimoCodigo = codigo; ultimoMomento = ahora;
          navigator.vibrate?.(60);
          alDetectar(codigo);
        };
        if (window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
          const intervalo = setInterval(async () => {
            if (!video.current || video.current.readyState < 2) return;
            try { const r = await detector.detect(video.current); if (r[0]) entregar(r[0].rawValue); } catch { /* cuadro sin código */ }
          }, 250);
          detener = () => { clearInterval(intervalo); stream.getTracks().forEach((t) => t.stop()); };
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const lector = new BrowserMultiFormatReader();
          const controles = await lector.decodeFromVideoElement(video.current, (resultado) => { if (resultado) entregar(resultado.getText()); });
          detener = () => { controles.stop(); stream.getTracks().forEach((t) => t.stop()); };
        }
      } catch (e) {
        setError(`No se pudo abrir la cámara (${(e as Error).message}). Podés tipear el código.`);
      }
    })();
    return () => { vivo = false; detener?.(); };
  }, [alDetectar]);

  return (
    <div className="escaner" role="dialog" aria-label="Escanear código de barras" data-testid="escaner">
      <video ref={video} muted playsInline className={activa ? "activa" : ""} />
      {activa && <div className="guia" aria-hidden="true" />}
      <div className="escaner-abajo">
        {error && <p className="error">{error}</p>}
        {ultimo && <p className="exito" data-testid="escaner-ultimo">{ultimo}</p>}
        <form className="en-linea" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { alDetectar(manual.trim()); setManual(""); } }}>
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="O tipeá el código" inputMode="numeric" data-testid="codigo-manual" style={{ flex: 1 }} />
          <button type="submit" className="secundario">Enviar</button>
          <button type="button" className="grande" onClick={alCerrar}>Cerrar</button>
        </form>
      </div>
    </div>
  );
}
