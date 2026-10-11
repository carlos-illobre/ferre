import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { hayCamara } from "../../componentes/Escaner";
import { Boton, clases } from "./basicas";
import { Campo } from "./campos";
import { Icono } from "./Icono";

// ---------------------------------------------------------------- Hoja

type PropsDeHoja = {
  abierta: boolean;
  /** Se llama al cerrar con la cruz, con Escape o tocando afuera. */
  alCerrar: () => void;
  titulo: string;
  children: ReactNode;
  /** Botones fijos al pie de la hoja (quedan a la vista aunque el contenido sea largo). */
  pie?: ReactNode;
  /** `camara` es la hoja oscura del escáner. */
  variante?: "normal" | "camara";
  testId?: string;
};

const CAMPOS = "input:not([type=hidden]):not(:disabled), textarea:not(:disabled), select:not(:disabled)";

/**
 * Ventana sobre la pantalla: sube desde abajo en el celular y va centrada en la computadora.
 * Es un `<dialog>` nativo: cierra con Escape, oscurece el fondo y atrapa el foco.
 * Al abrirse, el foco va a lo que tenga `autoFocus` adentro; si no hay, al primer campo; y si
 * no hay campos, a la hoja misma. Nunca a la cruz (la barra espaciadora la cerraría).
 */
export function Hoja({ abierta, alCerrar, titulo, children, pie, variante = "normal", testId }: PropsDeHoja) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  // El contenido se monta recién con el diálogo abierto: así el `autoFocus` de adentro funciona.
  const [montada, setMontada] = useState(false);

  useLayoutEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    // Un navegador sin <dialog> modal (y jsdom, en las pruebas) la abre como atributo.
    if (abierta && !d.open) { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); }
    if (!abierta && d.open) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); }
    setMontada(abierta);
  }, [abierta]);

  useLayoutEffect(() => {
    const c = caja.current;
    if (!montada || !c) return;
    const enfocado = document.activeElement;
    const respetar = enfocado instanceof HTMLElement && c.contains(enfocado) && enfocado !== c && !enfocado.classList.contains("hoja__cerrar");
    if (!respetar) (c.querySelector(".hoja__cuerpo")?.querySelector<HTMLElement>(CAMPOS) ?? c).focus();
  }, [montada]);

  return (
    <dialog
      ref={dialogo}
      className={`hoja hoja--${variante}`}
      aria-labelledby={idTitulo}
      data-testid={testId}
      onClose={() => { if (abierta) alCerrar(); }}
      onClick={(e) => { if (e.target === dialogo.current) alCerrar(); }}
    >
      {abierta && montada && (
        <div className="hoja__caja" ref={caja} tabIndex={-1}>
          <header className="hoja__cabeza">
            <h2 id={idTitulo}>{titulo}</h2>
            <button type="button" className="hoja__cerrar" aria-label="Cerrar" onClick={alCerrar}><Icono nombre="cerrar" /></button>
          </header>
          <div className="hoja__cuerpo">{children}</div>
          {pie && <footer className="hoja__pie">{pie}</footer>}
        </div>
      )}
    </dialog>
  );
}

// ---------------------------------------------------------------- Confirmar

type PropsDeConfirmar = {
  abierta: boolean;
  /** La pregunta: «¿Anular la venta de $8.000?». */
  titulo: string;
  /** Qué va a pasar, y campos si hacen falta (un motivo). */
  children?: ReactNode;
  /** Texto del botón rojo: «Sí, anular». */
  confirmar: string;
  alConfirmar: () => void;
  alCancelar: () => void;
  cancelar?: string;
  /** Mientras se confirma: el botón rojo queda deshabilitado. */
  ocupado?: boolean;
  testId?: string;
};

/** Solo para lo que no se puede recuperar: anular una venta, anular una compra, cerrar un conteo. */
export function Confirmar({ abierta, titulo, children, confirmar, alConfirmar, alCancelar, cancelar = "Volver", ocupado, testId = "confirmar" }: PropsDeConfirmar) {
  return (
    <Hoja abierta={abierta} alCerrar={alCancelar} titulo={titulo} testId={testId} pie={<>
      <Boton variante="secundario" onClick={alCancelar}>{cancelar}</Boton>
      <Boton variante="peligro" disabled={ocupado} onClick={alConfirmar} data-testid="confirmar-si">{confirmar}</Boton>
    </>}>
      {children}
    </Hoja>
  );
}

// ---------------------------------------------------------------- Explicado

type PropsDeExplicado = {
  /** El número ya formateado: `pesos(4000)`. */
  valor: string;
  /** Los pasos de la cuenta, en orden (los da `precioDeVenta` o `cuentaDeRenglon`). */
  pasos: string[];
  /** De qué es la cuenta: «Precio de Mecha 6 mm madera». */
  titulo?: string;
  className?: string;
};

/**
 * Un número que se toca y abre «De dónde sale» en pasos numerados. El disparador es un botón
 * en línea (vale dentro de un `<p>` o un `<span>`); la hoja se monta aparte, en `<body>`.
 * Sin pasos, es solo el número. `data-testid`: `explicacion` y `hoja-explicacion`.
 */
export function Explicado({ valor, pasos, titulo = "De dónde sale", className }: PropsDeExplicado) {
  const [abierto, setAbierto] = useState(false);
  if (pasos.length === 0) return <span className={className}>{valor}</span>;
  return (
    <>
      <button type="button" className={clases("explicado", className)} onClick={() => setAbierto(true)} aria-label={`${valor}. Ver de dónde sale`} data-testid="explicacion">{valor}</button>
      {abierto && createPortal(
        <Hoja abierta={abierto} alCerrar={() => setAbierto(false)} titulo={titulo} testId="hoja-explicacion">
          <p className="explicado__valor">{valor}</p>
          <p className="explicado__ayuda">De dónde sale</p>
          <ol className="explicado__pasos">
            {pasos.map((paso, i) => <li key={i}><span>{paso}</span></li>)}
          </ol>
        </Hoja>,
        document.body,
      )}
    </>
  );
}

// ---------------------------------------------------------------- Escaner

type PropsDeEscaner = {
  abierto: boolean;
  alCerrar: () => void;
  /** Se llama con el código leído o escrito. */
  alLeer: (codigo: string) => void;
  /** Sigue abierto después de leer, para escanear varios seguidos. Sin esto, se cierra sola al leer. */
  seguido?: boolean;
  /** Con `seguido`: qué pasó con el último código («7790…: agregado»). */
  ultimo?: string | null;
};

/** La cámara leyendo códigos de barras, con «O escribí el código» para cuando no lee o no hay cámara. */
export function Escaner({ abierto, alCerrar, alLeer, seguido = false, ultimo }: PropsDeEscaner) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (abierto) { setCodigo(""); setError(null); } }, [abierto]);

  function leer(leido: string) { alLeer(leido); if (!seguido) alCerrar(); }
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (codigo.trim() === "") { setError("Escribí los números que están debajo de las barras."); return; }
    leer(codigo.trim());
    setCodigo("");
  }

  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo="Escanear" variante="camara" testId="escaner">
      <Camara alLeer={leer} />
      {ultimo && <p className="escaner__ultimo" role="status" data-testid="escaner-ultimo">{ultimo}</p>}
      <form className="escaner__a-mano" onSubmit={enviar} noValidate>
        <Campo etiqueta="O escribí el código" inputMode="numeric" value={codigo} error={error} onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "")); setError(null); }} placeholder="Los números de abajo de las barras" data-testid="codigo-manual" />
        <Boton type="submit" variante="secundario">Usar este código</Boton>
      </form>
    </Hoja>
  );
}

// La lectura es la de siempre (`componentes/Escaner`): detección nativa del navegador donde
// existe (Chrome en Android); si no, una librería de decodificación que se carga recién ahí.
function Camara({ alLeer }: { alLeer: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [activa, setActiva] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entregar = useRef(alLeer);
  entregar.current = alLeer;

  useEffect(() => {
    let vivo = true;
    let detener: (() => void) | null = null;
    (async () => {
      const v = video.current;
      if (!hayCamara() || !v) { setError("Este dispositivo no tiene cámara disponible. Escribí el código acá abajo."); return; }
      try {
        const flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        const soltar = () => flujo.getTracks().forEach((t) => t.stop());
        if (!vivo) { soltar(); return; }
        detener = soltar;
        v.srcObject = flujo;
        await v.play();
        if (!vivo) return;
        setActiva(true);
        let ultimoCodigo = "";
        let ultimoMomento = 0;
        const leido = (codigo: string) => {
          const ahora = Date.now();
          if (codigo === ultimoCodigo && ahora - ultimoMomento < 2500) return; // el mismo código, varias veces seguidas
          ultimoCodigo = codigo; ultimoMomento = ahora;
          navigator.vibrate?.(60);
          entregar.current(codigo);
        };
        if (window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
          const intervalo = setInterval(async () => {
            if (v.readyState < 2) return;
            try { const r = await detector.detect(v); if (r[0]) leido(r[0].rawValue); } catch { /* cuadro sin código */ }
          }, 250);
          detener = () => { clearInterval(intervalo); soltar(); };
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const controles = await new BrowserMultiFormatReader().decodeFromVideoElement(v, (resultado) => { if (resultado) leido(resultado.getText()); });
          detener = () => { controles.stop(); soltar(); };
          if (!vivo) detener();
        }
      } catch (e) {
        if (vivo) setError(`No se pudo abrir la cámara (${(e as Error).message}). Escribí el código acá abajo.`);
      }
    })();
    return () => { vivo = false; detener?.(); };
  }, []);

  return (
    <>
      <div className="escaner__camara">
        <video ref={video} muted playsInline className={activa ? "escaner__video escaner__video--activa" : "escaner__video"} />
        <div className="escaner__marco" aria-hidden="true">{activa && <span className="escaner__linea" />}</div>
      </div>
      {error
        ? <p className="escaner__ayuda" role="alert">{error}</p>
        : <p className="escaner__ayuda">{activa ? "Apuntá la cámara al código de barras. Se lee solo." : "Abriendo la cámara…"}</p>}
    </>
  );
}

// ---------------------------------------------------------------- Qr

/** Un código QR de verdad, para leer con la cámara del celular. Mientras se arma, queda el lugar. */
export function Qr({ texto, lado = 200, etiqueta = "Código para leer con la cámara del celular", testId }: { texto: string; lado?: number; etiqueta?: string; testId?: string }) {
  const [imagen, setImagen] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    setImagen(null);
    // Oscuro = el verde de la marca (`--verde`): la librería pide el color en hexadecimal.
    QRCode.toDataURL(texto, { width: lado * 2, margin: 2, color: { dark: "#17312b", light: "#ffffff" } })
      .then((url) => { if (vigente) setImagen(url); })
      .catch(() => undefined);
    return () => { vigente = false; };
  }, [texto, lado]);
  return imagen
    ? <img className="qr" src={imagen} width={lado} height={lado} alt={etiqueta} data-testid={testId} />
    : <span className="qr qr--armando" style={{ width: lado, height: lado }} role="img" aria-label="Armando el código" data-testid={testId} />;
}
