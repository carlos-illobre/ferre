import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../api";
import { guardarPuestoLocal, puestoLocal } from "../puesto";

// En la laptop: "Vincular celular" muestra un QR; cuando el celular lo lee, el puesto queda
// vinculado 12 horas y esta pantalla lo indica.
export function VincularCelular({ vinculado, alVincular }: { vinculado: boolean; alVincular: (puestoId: string) => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [puestoId, setPuestoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    try {
      const { id, codigo, expiraEnSegundos } = await api<{ id: string; codigo: string; expiraEnSegundos: number }>("/puestos", { method: "POST", body: JSON.stringify({ nombre: "computadora del mostrador" }) });
      const enlace = `${location.origin}${import.meta.env.BASE_URL}#/vincular-celular?codigo=${encodeURIComponent(codigo)}`;
      setQr(await QRCode.toDataURL(enlace, { width: 220, margin: 1 }));
      setPuestoId(id);
      setError(null);
      // Para las pruebas automáticas: el enlace que el celular abriría.
      (window as unknown as { __enlaceVinculacion?: string }).__enlaceVinculacion = enlace;
      const fin = Date.now() + expiraEnSegundos * 1000;
      const consulta = setInterval(async () => {
        if (Date.now() > fin) { clearInterval(consulta); setQr(null); return; }
        const estado = await api<{ vinculado_en: string | null; expira_en: string }>(`/puestos/${id}`).catch(() => null);
        if (estado?.vinculado_en) {
          clearInterval(consulta);
          guardarPuestoLocal({ id, expira_en: estado.expira_en });
          setQr(null);
          alVincular(id);
        }
      }, 2000);
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { const p = puestoLocal(); if (p && !vinculado) alVincular(p.id); }, [vinculado, alVincular]);

  if (vinculado) {
    return <span className="vinculado" data-testid="celular-vinculado">📱 Celular vinculado <button className="enlace chico" onClick={() => { guardarPuestoLocal(null); location.reload(); }}>desvincular</button></span>;
  }
  return (
    <span className="vincular">
      {qr ? (
        <span className="qr-vincular" data-testid="qr-vincular">
          <img src={qr} alt="Código para vincular el celular" width={160} height={160} />
          <small>Con el celular: abrí la cámara y apuntá al código. Vence en 5 minutos.</small>
        </span>
      ) : (
        <button className="enlace" onClick={generar} data-testid="vincular-celular">Vincular celular para escanear</button>
      )}
      {error && <span className="error">{error}</span>}
      {puestoId && !qr && !vinculado && <small> El código venció. <button className="enlace chico" onClick={generar}>Generar otro</button></small>}
    </span>
  );
}
