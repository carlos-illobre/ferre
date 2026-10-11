import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, reducirImagen } from "../api";
import { useFoto } from "./tickets";
import "./foto-de-factura.css";

// La foto del comprobante reemplaza al número tipeado (RF-50, decisión 32): se le saca una
// foto a la factura o al remito y, cuando hace falta el número o cualquier otro dato, se
// toca la foto y se lee de ahí. La computadora no tiene cámara: muestra un código QR, el
// celular lo lee, saca la foto y la foto aparece sola en la computadora (como al vincular el
// celular para escanear).
const ESPERA_MS = 2000;
const rutaDe = (foto: string) => (foto.startsWith("/") ? foto : `/compras/fotos/${foto}`);

export function FotoDeFactura({ foto, alCambiar, conCelular = false, nombre }: { foto: string | null; alCambiar: (foto: string | null) => void; conCelular?: boolean; nombre: "factura" | "remito" }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedido, setPedido] = useState<{ codigo: string; qr: string; vence: number } | null>(null);
  const [grande, setGrande] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const del = nombre === "remito" ? "del remito" : "de la factura";

  async function subir(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Eso no es una foto. Elegí una imagen."); return; }
    setSubiendo(true); setError(null);
    try {
      const datos = new FormData();
      datos.append("foto", await reducirImagen(f, 2000), "comprobante.jpg");
      alCambiar((await api<{ foto: string }>("/compras/fotos", { method: "POST", body: datos })).foto);
    } catch (e) { const err = e as { estado?: number; message: string }; setError(err.estado ? `${err.message}.` : "Sin conexión: la foto se sube cuando vuelva internet. Probá de nuevo."); }
    finally { setSubiendo(false); }
  }

  // La computadora pide la foto: recibe un código, lo muestra como QR y pregunta cada dos
  // segundos si el celular ya la subió.
  async function pedirAlCelular() {
    setError(null);
    try {
      const { codigo, expiraEnSegundos } = await api<{ codigo: string; expiraEnSegundos: number }>("/compras/fotos/pedidos", { method: "POST" });
      const enlace = `${location.origin}${location.pathname}#/foto-factura?codigo=${encodeURIComponent(codigo)}`;
      const qr = await QRCode.toDataURL(enlace, { width: 240, margin: 1, color: { dark: "#17312b", light: "#ffffff" } });
      // Para probar sin celular: el enlace que el celular abriría.
      (window as unknown as { __enlaceDeFoto?: string }).__enlaceDeFoto = enlace;
      setPedido({ codigo, qr, vence: Date.now() + expiraEnSegundos * 1000 });
    } catch (e) { const err = e as { estado?: number; message: string }; setError(err.estado ? `${err.message}.` : "Sin conexión: para usar el celular hace falta internet."); }
  }
  useEffect(() => {
    if (!pedido) return;
    let vigente = true;
    const reloj = setInterval(() => {
      if (Date.now() > pedido.vence) { setPedido(null); setError("El código venció. Pedí otro."); return; }
      api<{ foto: string | null }>(`/compras/fotos/pedidos/${pedido.codigo}`)
        .then((r) => { if (vigente && r.foto) { setPedido(null); alCambiar(r.foto); } })
        .catch((e) => { if (vigente && (e as { estado?: number }).estado === 404) { setPedido(null); setError("El código venció. Pedí otro."); } });
    }, ESPERA_MS);
    return () => { vigente = false; clearInterval(reloj); };
  }, [pedido, alCambiar]);

  const elegir = <input ref={archivo} type="file" accept="image/*" capture={conCelular ? undefined : "environment"} hidden onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} data-testid="archivo-comprobante" />;

  if (foto) return (
    <div className="ff" data-testid="foto-comprobante">
      {elegir}
      <button type="button" className="ff-ver" onClick={() => setGrande(true)} aria-label={`Ver la foto ${del} en grande`} data-testid="ver-comprobante"><Imagen ruta={rutaDe(foto)} /></button>
      <div className="ff-texto">
        <strong>Foto {del} cargada</strong>
        <span>Tocá la foto para leer el número o cualquier otro dato.</span>
        <div className="ff-botones">
          <button type="button" className="ff-boton" disabled={subiendo} onClick={() => archivo.current?.click()}>{subiendo ? "Subiendo…" : "Cambiar"}</button>
          <button type="button" className="ff-boton" onClick={() => alCambiar(null)} data-testid="quitar-comprobante"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>Quitar</button>
        </div>
        {error && <span className="ff-error" role="alert">{error}</span>}
      </div>
      {grande && <FotoGrande ruta={rutaDe(foto)} titulo={`Foto ${del}`} alCerrar={() => setGrande(false)} />}
    </div>
  );

  return (
    <div className="ff vacia" data-testid="foto-comprobante">
      {elegir}
      {pedido ? (
        <div className="ff-pedido" role="status" data-testid="pedido-de-foto">
          <img src={pedido.qr} alt="Código para sacar la foto con el celular" width={150} height={150} />
          <div className="ff-texto">
            <strong>Sacá la foto con el celular</strong>
            <ol>
              <li>Abrí la cámara del celular y apuntá a este código.</li>
              <li>Tocá el enlace que aparece y sacale la foto {del.replace(/^de la |^del /, (m) => (m === "del " ? "al " : "a la "))}.</li>
              <li>La foto aparece sola acá.</li>
            </ol>
            <div className="ff-botones"><button type="button" className="ff-boton" onClick={() => setPedido(null)}>Cancelar</button></div>
          </div>
        </div>
      ) : (
        <div className="ff-texto">
          <span>El número no se escribe: se lee de la foto.</span>
          <div className="ff-botones">
            {conCelular && <button type="button" className="ff-boton fuerte" onClick={() => void pedirAlCelular()} data-testid="foto-con-celular"><Camara />Sacar la foto con el celular</button>}
            <button type="button" className={`ff-boton ${conCelular ? "" : "fuerte"}`} disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="sacar-comprobante">
              {!conCelular && <Camara />}{subiendo ? "Subiendo la foto…" : conCelular ? "Elegir un archivo" : `Sacar foto ${del}`}
            </button>
          </div>
          {error && <span className="ff-error" role="alert">{error}</span>}
        </div>
      )}
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
