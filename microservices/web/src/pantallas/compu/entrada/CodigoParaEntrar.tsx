import { useEffect, useState, type CSSProperties } from "react";
import { QR_DE_ENTRADA, useCodigoParaEntrar } from "../../../negocio/entrada";
import { ISOTIPO_SOBRE_CLARO } from "../../isotipo";
import { TEXTOS_DE_ENTRADA } from "../../comun/entrada/textos-de-entrada";
import { Aviso } from "../base/ui";

const ISOTIPO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ISOTIPO_SOBRE_CLARO)}`;

// El código para entrar con el celular, con cuánto falta para que cambie, y los dos pasos.
export function CodigoParaEntrar({ enLinea }: { enLinea: boolean }) {
  const { qr, error, vence, duracion } = useCodigoParaEntrar(enLinea);
  const listo = enLinea && qr;
  return (
    <>
      <div className="entrar-codigo">
        <div>
          <Qr qr={enLinea ? qr : null} enLinea={enLinea} />
          {listo && vence && <Cuenta vence={vence} duracion={duracion} />}
        </div>
        <ol className="entrar-pasos">
          {TEXTOS_DE_ENTRADA.pasos.map((p) => <li key={p.titulo}><span><b>{p.titulo}</b>{p.detalle}</span></li>)}
        </ol>
      </div>
      <Aviso tipo="error">{enLinea ? error : null}</Aviso>
    </>
  );
}

function Qr({ qr, enLinea }: { qr: string | null; enLinea: boolean }) {
  return (
    <div className={`entrar-qr${enLinea ? "" : " apagado"}`} data-testid="qr-entrar">
      {qr ? <img src={qr} alt="Código para entrar con el celular" width={220} height={220} /> : <div className="esqueleto" aria-label={enLinea ? "Generando el código" : "Sin conexión"} />}
      {qr && <span className="entrar-qr-isotipo" aria-hidden="true" style={{ width: `${QR_DE_ENTRADA.isotipo * 100}%`, backgroundImage: `url("${ISOTIPO}")` }} />}
    </div>
  );
}

// Cuánto falta para que el código cambie, de a un segundo, con un anillo que se vacía.
function Cuenta({ vence, duracion }: { vence: number; duracion: number }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const quedan = Math.max(0, Math.round((vence - ahora) / 1000));
  const parte = Math.min(1, quedan / Math.max(1, duracion));
  return (
    <p className="entrar-cc-cuenta" data-testid="entrar-cuenta">
      <span><i className="anillo" style={{ "--parte": parte } as CSSProperties} aria-hidden="true" />{TEXTOS_DE_ENTRADA.cambiaEn} <b>{Math.floor(quedan / 60)}:{String(quedan % 60).padStart(2, "0")}</b></span>
      <span>{TEXTOS_DE_ENTRADA.sirveUnaVez}</span>
    </p>
  );
}
