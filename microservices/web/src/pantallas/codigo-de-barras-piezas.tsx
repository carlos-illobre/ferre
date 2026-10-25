import { useState, type ReactNode } from "react";
import { TEXTOS } from "./textos";
import { BarrasEan } from "./BarrasEan";

const t = TEXTOS.ficha;

export function BotonEscanear({ etiqueta, alTocar }: { etiqueta: string; alTocar: () => void }) {
  return (
    <button type="button" className="cb-boton oscuro" onClick={alTocar} data-testid="escanear-codigo">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2M7 9v6M11 9v6M14 9v6M17 9v6" /></svg>
      {etiqueta}
    </button>
  );
}

export function CajaDelCodigo({ codigo, caja, lectura, alCopiar }: { codigo: string | null; caja: React.RefObject<HTMLElement>; lectura: ReactNode; alCopiar: (codigo: string) => void }) {
  return (
    <div className="cb-caja">
      {codigo && <BarrasEan codigo={codigo} className="cb-barras" />}
      <span className="cb-texto">
        {codigo ? <code ref={caja} data-testid="codigo-actual">{codigo}</code> : <span className="cb-sin" data-testid="codigo-actual">{t.sinCodigo.largo}</span>}
        {lectura}
      </span>
      {codigo && (
        <button type="button" className="cb-copiar" onClick={() => alCopiar(codigo)} aria-label={t.copiar.largo} title={t.copiar.largo} data-testid="copiar-codigo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
        </button>
      )}
    </div>
  );
}

export function CodigoActualizado({ lectura }: { lectura: string | null }) {
  return (
    <div className="cb-ok" role="status" data-testid="codigo-guardado">
      <i aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></i>
      <span><b>{t.actualizado.largo}</b>{lectura && <span data-testid="ultima-lectura">{t.ultimaLectura.largo}: {lectura}</span>}</span>
    </div>
  );
}

const AYUDA = {
  conPuesto: "O escaneá el producto con el celular vinculado: el código queda guardado en este producto.",
  celular: "Este dispositivo no tiene cámara disponible: tipealo.",
  compu: "Para leerlo con la cámara, abrí este producto en el celular; o vinculá el celular desde Vender, con «Escanear con el celular», y escanealo desde ahí.",
};

export function PanelParaTipear({ error, conPuesto, celular, alGuardar, alCancelar, alTipear }: { error: string | null; conPuesto: boolean; celular: boolean; alGuardar: (codigo: string) => void; alCancelar: () => void; alTipear: () => void }) {
  const [tipeado, setTipeado] = useState("");
  return (
    <form className="cb-panel" onSubmit={(e) => { e.preventDefault(); alGuardar(tipeado); }} noValidate>
      <label className="cb-campo">
        <span>El número que figura debajo de las barras</span>
        <input value={tipeado} onChange={(e) => { setTipeado(e.target.value); alTipear(); }} inputMode="numeric" autoComplete="off" autoFocus placeholder="7790000000000" data-testid="codigo-tipeado" />
      </label>
      {error && <p className="cb-error" role="alert">{error}</p>}
      <div className="cb-acciones">
        <button type="button" className="cb-boton" onClick={alCancelar}>Cancelar</button>
        <button type="submit" className="cb-boton fuerte" data-testid="guardar-codigo">Guardar el código</button>
      </div>
      <p className="cb-ayuda" data-testid="ayuda-codigo">{conPuesto ? AYUDA.conPuesto : celular ? AYUDA.celular : AYUDA.compu}</p>
    </form>
  );
}

export function Avisos({ aviso, copiado, error }: { aviso: string | null; copiado: string | null; error: string | null }) {
  return (
    <>
      {aviso && <p className="cb-aviso" role="status" data-testid="codigo-en-otro">{aviso}</p>}
      {copiado && <p className="cb-copiado" role="status" data-testid="codigo-copiado">{copiado}</p>}
      {error && <p className="cb-error" role="alert">{error}</p>}
    </>
  );
}

export function Reloj() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2" /></svg>;
}
