import { useEffect, useRef, useState } from "react";
import { useFoto } from "../negocio/tickets";
import { porQueNoSeSubio, subirFotoDelComprobante } from "../negocio/compras";
import { PedirFotoAlCelular } from "./PedirFoto";
import "./foto-de-factura.css";

// La foto del comprobante reemplaza al número tipeado (RF-50, decisión 32): se le saca una
// foto a la factura o al remito y, cuando hace falta el número o cualquier otro dato, se
// toca la foto y se lee de ahí. La computadora no tiene cámara: muestra un código QR, el
// celular lo lee, saca la foto y la foto aparece sola en la computadora (como al vincular el
// celular para escanear).
const rutaDe = (foto: string) => (foto.startsWith("/") ? foto : `/compras/fotos/${foto}`);

function useSubirComprobante(alCambiar: (foto: string | null) => void) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function subir(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Eso no es una foto. Elegí una imagen."); return; }
    setSubiendo(true); setError(null);
    try { alCambiar(await subirFotoDelComprobante(f)); }
    catch (e) { setError(porQueNoSeSubio(e)); }
    finally { setSubiendo(false); }
  }
  return { subiendo, error, setError, subir };
}
type Subida = ReturnType<typeof useSubirComprobante>;

function FotoCargada({ foto, del, subida, alElegir, alQuitar }: { foto: string; del: string; subida: Subida; alElegir: () => void; alQuitar: () => void }) {
  const [grande, setGrande] = useState(false);
  return (
    <>
      <button type="button" className="ff-ver" onClick={() => setGrande(true)} aria-label={`Ver la foto ${del} en grande`} data-testid="ver-comprobante"><Imagen ruta={rutaDe(foto)} /></button>
      <div className="ff-texto">
        <strong>Foto {del} cargada</strong>
        <span>Tocá la foto para leer el número o cualquier otro dato.</span>
        <div className="ff-botones">
          <button type="button" className="ff-boton" disabled={subida.subiendo} onClick={alElegir}>{subida.subiendo ? "Subiendo…" : "Cambiar"}</button>
          <button type="button" className="ff-boton" onClick={alQuitar} data-testid="quitar-comprobante"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>Quitar</button>
        </div>
        {subida.error && <span className="ff-error" role="alert">{subida.error}</span>}
      </div>
      {grande && <FotoGrande ruta={rutaDe(foto)} titulo={`Foto ${del}`} alCerrar={() => setGrande(false)} />}
    </>
  );
}

const textoDelArchivo = (subiendo: boolean, conCelular: boolean, del: string) => (subiendo ? "Subiendo la foto…" : conCelular ? "Elegir un archivo" : `Sacar foto ${del}`);

function SinFoto({ del, conCelular, subida, alElegir, alPedir }: { del: string; conCelular: boolean; subida: Subida; alElegir: () => void; alPedir: () => void }) {
  return (
    <div className="ff-texto">
      <span>El número no se escribe: se lee de la foto.</span>
      <div className="ff-botones">
        {conCelular && <button type="button" className="ff-boton fuerte" onClick={() => { subida.setError(null); alPedir(); }} data-testid="foto-con-celular"><Camara />Sacar la foto con el celular</button>}
        <button type="button" className={`ff-boton ${conCelular ? "" : "fuerte"}`} disabled={subida.subiendo} onClick={alElegir} data-testid="sacar-comprobante">
          {!conCelular && <Camara />}{textoDelArchivo(subida.subiendo, conCelular, del)}
        </button>
      </div>
      {subida.error && <span className="ff-error" role="alert">{subida.error}</span>}
    </div>
  );
}

export function FotoDeFactura({ foto, alCambiar, conCelular = false, nombre }: { foto: string | null; alCambiar: (foto: string | null) => void; conCelular?: boolean; nombre: "factura" | "remito" }) {
  const subida = useSubirComprobante(alCambiar);
  const [pidiendo, setPidiendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const del = nombre === "remito" ? "del remito" : "de la factura";
  const elegir = () => archivo.current?.click();
  return (
    <div className={`ff ${foto ? "" : "vacia"}`.trim()} data-testid="foto-comprobante">
      <input ref={archivo} type="file" accept="image/*" capture={conCelular ? undefined : "environment"} hidden onChange={(e) => { void subida.subir(e.target.files?.[0]); e.target.value = ""; }} data-testid="archivo-comprobante" />
      {foto ? <FotoCargada foto={foto} del={del} subida={subida} alElegir={elegir} alQuitar={() => alCambiar(null)} />
        : pidiendo ? <PedirFotoAlCelular para={`la foto ${del}`} alCancelar={() => setPidiendo(false)} alRecibir={async (f) => { setPidiendo(false); await subida.subir(f); }} />
        : <SinFoto del={del} conCelular={conCelular} subida={subida} alElegir={elegir} alPedir={() => setPidiendo(true)} />}
    </div>
  );
}

// En las compras recientes: la foto chica, que se abre en grande para leerla.
export function VerComprobante({ ruta, texto }: { ruta: string; texto?: string }) {
  const [grande, setGrande] = useState(false);
  return (
    <>
      <button type="button" className={texto ? "ff-boton" : "ff-ver"} onClick={(e) => { e.stopPropagation(); setGrande(true); }} aria-label={texto ? undefined : "Ver la foto del comprobante en grande"} data-testid="ver-comprobante">
        {texto ? <><Camara />{texto}</> : <Imagen ruta={ruta} />}
      </button>
      {grande && <FotoGrande ruta={ruta} titulo="Foto del comprobante" alCerrar={() => setGrande(false)} />}
    </>
  );
}

function Imagen({ ruta }: { ruta: string }) {
  const url = useFoto(ruta);
  return url ? <img src={url} alt="" /> : <span className="ff-cargando" aria-hidden="true" />;
}

function FotoGrande({ ruta, titulo, alCerrar }: { ruta: string; titulo: string; alCerrar: () => void }) {
  const url = useFoto(ruta);
  const [zoom, setZoom] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && typeof d.showModal === "function" && !d.open) d.showModal(); }, []);
  return (
    <dialog ref={ref} className="ff-grande" aria-label={titulo} onCancel={(e) => { e.preventDefault(); alCerrar(); }} onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) alCerrar(); }}>
      <div className={`ff-lienzo ${zoom ? "zoom" : ""}`}>
        {url ? <img src={url} alt={titulo} onClick={() => setZoom(!zoom)} /> : <p>Abriendo la foto…</p>}
      </div>
      <div className="ff-botones">
        <button type="button" className="ff-boton" onClick={() => setZoom(!zoom)}>{zoom ? "Ver entera" : "Agrandar"}</button>
        <button type="button" className="ff-boton fuerte" autoFocus onClick={alCerrar}>Cerrar</button>
      </div>
    </dialog>
  );
}

const Camara = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4ZM12 16.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7Z" /></svg>
);
