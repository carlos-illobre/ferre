import { useEffect } from "react";
import { useCodigoParaVincular } from "../../../negocio/vinculo";
import { guardarPuestoLocal, puestoLocal } from "../../../negocio/vinculo";

// Cuando Vender del celular se ve en una pantalla ancha: "Vincular celular" muestra un QR; cuando
// el celular lo lee, quedan vinculados y esta pantalla lo indica. La regla está en negocio/vinculo.ts.
export function VincularCelular({ vinculado, alVincular }: { vinculado: boolean; alVincular: (puestoId: string) => void }) {
  const codigo = useCodigoParaVincular(alVincular, { ancho: 220 });
  const { qr, vencido, error, generar } = codigo;
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
      {vencido && !qr && !vinculado && <small> El código venció. <button className="enlace chico" onClick={generar}>Generar otro</button></small>}
    </span>
  );
}
