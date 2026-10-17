import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Producto } from "./celular/pantallas/Productos";
import { escucharPuesto, puestoLocal } from "../puesto";
import { Escaner, hayCamara } from "../plataforma/camara/Escaner";
import { copiarTexto } from "../plataforma/portapapeles/copiar";
import { ultimaLectura } from "../negocio/catalogo/ficha";
import { TEXTOS } from "./textos";
import "./codigo-de-barras.css";

// El código de barras de un producto, en su ficha (RF-08): se ve el que tiene y se le carga
// uno escaneándolo. En el celular, con la cámara; en la computadora, con el celular vinculado
// o tipeándolo. Lo usan las dos interfaces, para que la regla y las palabras sean las mismas.
// Una vez guardado, el producto se encuentra escaneándolo en Vender, Catálogo, Ingreso y Estanterías.
// Guarda la pantalla que lo contiene (`alGuardar`), que es la que tiene el catálogo; `quienLoTiene`
// dice si otro producto ya tiene ese código. En la ficha renovada (specs/016) el código se copia
// con un toque y, después de cargarlo, dice «Código actualizado» con la hora de la lectura.
export function CodigoDeBarras({ producto: p, celular = false, alGuardar, quienLoTiene }: {
  producto: Producto; celular?: boolean; alGuardar: (codigo: string) => void | Promise<unknown>; quienLoTiene: (codigo: string) => Producto | undefined;
}) {
  const [abierto, setAbierto] = useState(false);
  const [tipeado, setTipeado] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recien, setRecien] = useState(false); // el código se cargó en esta ficha
  const [copiado, setCopiado] = useState<string | null>(null);
  const caja = useRef<HTMLElement>(null);
  const conCamara = celular && hayCamara();
  const puesto = celular ? null : puestoLocal();
  const t = TEXTOS.ficha;
  const texto = (x: { largo: string; corto: string }) => (celular ? x.corto : x.largo);
  const lectura = ultimaLectura(p.codigo_leido_en);
  useEffect(() => { if (!copiado) return; const r = setTimeout(() => setCopiado(null), 2500); return () => clearTimeout(r); }, [copiado]);

  async function copiar(codigo: string) {
    if (await copiarTexto(codigo)) { setCopiado(t.copiado.largo); return; }
    // Si el navegador no deja, el código queda seleccionado para copiarlo a mano.
    const rango = document.createRange();
    if (caja.current) { rango.selectNodeContents(caja.current); window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(rango); }
    setCopiado(t.noCopiado.largo);
  }

  const guardar = useCallback(async (crudo: string) => {
    const codigo = crudo.trim();
    if (!codigo) { setError("Escribí el código que figura debajo de las barras."); return; }
    setError(null);
    try {
      const otro = quienLoTiene(codigo);
      await alGuardar(codigo);
      setRecien(true);
      setAviso(otro ? `También lo tiene «${otro.descripcion}»: si son el mismo artículo, unilos en Duplicados.` : null);
      setAbierto(false); setTipeado("");
    } catch (e) { setError(`No se pudo guardar el código: ${(e as Error).message}`); }
  }, [alGuardar, quienLoTiene]);

  // En la computadora, con el panel abierto, lo que escanea el celular vinculado es el código de este producto.
  const alLlegar = useRef(guardar);
  useEffect(() => { alLlegar.current = guardar; }, [guardar]);
  // El escáner reinicia la cámara si le cambia la función: se le da siempre la misma.
  const alDetectar = useCallback((codigo: string) => void alLlegar.current(codigo), []);
  const puestoId = abierto && puesto ? puesto.id : null;
  useEffect(() => { if (puestoId) return escucharPuesto(puestoId, (codigo) => void alLlegar.current(codigo), undefined, true); }, [puestoId]);

  const etiqueta = conCamara ? texto(t.escanear) : puesto ? t.escanear.largo : p.codigo_barras ? t.cambiar.largo : t.cargar.largo;
  return (
    <section className="cb" aria-label={t.codigo.largo} data-testid="codigo-de-barras">
      <h3 className="cb-titulo">{t.codigo.largo}</h3>
      <div className="cb-fila">
        <div className="cb-caja">
          {p.codigo_barras ? <code ref={caja} data-testid="codigo-actual">{p.codigo_barras}</code> : <span className="cb-sin" data-testid="codigo-actual">{t.sinCodigo.largo}</span>}
          {p.codigo_barras && (
            <button type="button" className="cb-copiar" onClick={() => void copiar(p.codigo_barras!)} aria-label={t.copiar.largo} title={t.copiar.largo} data-testid="copiar-codigo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
          )}
        </div>
        {!abierto && (
          <button type="button" className="cb-boton" onClick={() => { setAbierto(true); setAviso(null); setError(null); }} data-testid="escanear-codigo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2M7 9v6M11 9v6M14 9v6M17 9v6" /></svg>
            {etiqueta}
          </button>
        )}
      </div>
      {recien ? (
        <div className="cb-ok" role="status" data-testid="codigo-guardado">
          <i aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></i>
          <span><b>{t.actualizado.largo}</b>{lectura && <span data-testid="ultima-lectura">{t.ultimaLectura.largo}: {lectura}</span>}</span>
        </div>
      ) : lectura && <p className="cb-lectura" data-testid="ultima-lectura">{t.ultimaLectura.largo}: {lectura}</p>}
      {aviso && <p className="cb-aviso" role="status" data-testid="codigo-en-otro">{aviso}</p>}
      {copiado && <p className="cb-copiado" role="status" data-testid="codigo-copiado">{copiado}</p>}
      {error && !abierto && <p className="cb-error" role="alert">{error}</p>}
      {abierto && conCamara && createPortal(<Escaner alDetectar={alDetectar} alCerrar={() => setAbierto(false)} ultimo={error} />, document.body)}
      {abierto && !conCamara && (
        <form className="cb-panel" onSubmit={(e) => { e.preventDefault(); void guardar(tipeado); }} noValidate>
          <label className="cb-campo">
            <span>El número que figura debajo de las barras</span>
            <input value={tipeado} onChange={(e) => { setTipeado(e.target.value); setError(null); }} inputMode="numeric" autoComplete="off" autoFocus placeholder="7790000000000" data-testid="codigo-tipeado" />
          </label>
          {error && <p className="cb-error" role="alert">{error}</p>}
          <div className="cb-acciones">
            <button type="button" className="cb-boton" onClick={() => { setAbierto(false); setError(null); }}>Cancelar</button>
            <button type="submit" className="cb-boton fuerte" data-testid="guardar-codigo">Guardar el código</button>
          </div>
          <p className="cb-ayuda" data-testid="ayuda-codigo">
            {puesto ? "O escaneá el producto con el celular vinculado: el código queda guardado en este producto."
              : celular ? "Este dispositivo no tiene cámara disponible: tipealo."
              : "Para leerlo con la cámara, abrí este producto en el celular; o vinculá el celular desde Vender, con «Escanear con el celular», y escanealo desde ahí."}
          </p>
        </form>
      )}
    </section>
  );
}
