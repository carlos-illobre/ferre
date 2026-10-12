import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api, leerToken, urlApi } from "../api";
import { puestoLocal } from "../puesto";
import "./foto-de-factura.css";

// La computadora no tiene cámara: donde haga falta una foto muestra un código QR, el celular
// lo lee, saca la foto y la foto llega sola acá, como un archivo más (decisión 41). Sirve
// para la factura de un ingreso, la foto de un producto o la captura de un ticket.
const ESPERA_MS = 2000;
// Solo en la aplicación: las versiones históricas no reciben funcionalidad nueva (decisión 46).
export const hayQueUsarElCelular = () => window.innerWidth >= 900 && !/\/historico\//.test(location.pathname);

export function PedirFotoAlCelular({ para, alRecibir, alCancelar }: { para: string; alRecibir: (foto: File) => void | Promise<void>; alCancelar: () => void }) {
  const [pedido, setPedido] = useState<{ codigo: string; qr: string; vence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recibiendo, setRecibiendo] = useState(false);
  // Con un celular emparejado (decisión 58) no hace falta leer el código: el pedido le aparece solo.
  const [emparejado] = useState(() => Boolean(puestoLocal()));

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const { codigo, expiraEnSegundos } = await api<{ codigo: string; expiraEnSegundos: number }>("/pedidos-de-foto", { method: "POST", body: JSON.stringify({ para }) });
        const enlace = `${location.origin}${location.pathname}#/foto?codigo=${encodeURIComponent(codigo)}`;
        const qr = await QRCode.toDataURL(enlace, { width: 240, margin: 1, color: { dark: "#17312b", light: "#ffffff" } });
        // Para probar sin celular: el enlace que el celular abriría.
        (window as unknown as { __enlaceDeFoto?: string }).__enlaceDeFoto = enlace;
        if (vigente) setPedido({ codigo, qr, vence: Date.now() + expiraEnSegundos * 1000 });
      } catch (e) { const err = e as { estado?: number; message: string }; if (vigente) setError(err.estado ? `${err.message}.` : "Sin conexión: para usar el celular hace falta internet."); }
    })();
    return () => { vigente = false; };
  }, [para]);

  useEffect(() => {
    if (!pedido) return;
    let vigente = true;
    const reloj = setInterval(async () => {
      if (Date.now() > pedido.vence) { setPedido(null); setError("El código venció. Cancelá y pedí otro."); return; }
      try {
        const estado = await api<{ lista: boolean }>(`/pedidos-de-foto/${pedido.codigo}`);
        if (!vigente || !estado.lista) return;
        clearInterval(reloj); setRecibiendo(true);
        const r = await fetch(urlApi(`/pedidos-de-foto/${pedido.codigo}/foto`), { headers: { Authorization: `Bearer ${leerToken() ?? ""}` } });
        if (!r.ok) throw new Error("no llegó");
        const b = await r.blob();
        if (vigente) await alRecibir(new File([b], `foto.${b.type === "image/png" ? "png" : b.type === "image/webp" ? "webp" : "jpg"}`, { type: b.type || "image/jpeg" }));
      } catch (e) {
        if (!vigente) return;
        if ((e as { estado?: number }).estado === 404) { setPedido(null); setError("El código venció. Cancelá y pedí otro."); }
        else if (recibiendo) setError("No se pudo traer la foto. Cancelá y probá de nuevo.");
      }
    }, ESPERA_MS);
    return () => { vigente = false; clearInterval(reloj); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  return (
    <div className="ff-pedido" role="status" data-testid="pedido-de-foto">
      {pedido ? <img src={pedido.qr} alt="Código para sacar la foto con el celular" width={150} height={150} /> : <span className="ff-qr-vacio" aria-hidden="true" />}
      <div className="ff-texto">
        <strong>{recibiendo ? "Llegó la foto, un momento…" : emparejado ? "Pedida a tu celular" : "Sacá la foto con el celular"}</strong>
        {emparejado ? (
          <ol data-testid="pedida-al-celular">
            <li>Abrí Ferrebress en el celular: te aparece «La computadora pide una foto».</li>
            <li>Tocá «Sacar la foto». La foto aparece sola acá.</li>
            <li>Si no te aparece, apuntá la cámara del celular a este código.</li>
          </ol>
        ) : (
          <ol>
            <li>Abrí la cámara del celular y apuntá a este código.</li>
            <li>Tocá el enlace que aparece y sacá la foto.</li>
            <li>La foto aparece sola acá.</li>
          </ol>
        )}
        {error && <span className="ff-error" role="alert">{error}</span>}
        <div className="ff-botones"><button type="button" className="ff-boton" onClick={alCancelar}>Cancelar</button></div>
      </div>
    </div>
  );
}
