import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Producto } from "./celular/pantallas/Productos";
import { escucharPuesto, puestoLocal } from "../puesto";
import { Escaner, hayCamara } from "./celular/componentes/Escaner";
import "./codigo-de-barras.css";

// El código de barras de un producto, en su ficha (RF-08): se ve el que tiene y se le carga
// uno escaneándolo. En el celular, con la cámara; en la computadora, con el celular vinculado
// o tipeándolo. Lo usan las dos interfaces, para que la regla y las palabras sean las mismas.
// Una vez guardado, el producto se encuentra escaneándolo en Vender, Catálogo, Ingreso y Estanterías.
// Guarda la pantalla que lo contiene (`alGuardar`), que es la que tiene el catálogo; `quienLoTiene`
// dice si otro producto ya tiene ese código.
export function CodigoDeBarras({ producto: p, celular = false, alGuardar, quienLoTiene }: {
  producto: Producto; celular?: boolean; alGuardar: (codigo: string) => void | Promise<unknown>; quienLoTiene: (codigo: string) => Producto | undefined;
}) {
  const [abierto, setAbierto] = useState(false);
  const [tipeado, setTipeado] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conCamara = celular && hayCamara();
  const puesto = celular ? null : puestoLocal();

  const guardar = useCallback(async (crudo: string) => {
    const codigo = crudo.trim();
    if (!codigo) { setError("Escribí el código que figura debajo de las barras."); return; }
    setError(null);
    try {
      const otro = quienLoTiene(codigo);
      await alGuardar(codigo);
      setAviso(otro
        ? `Código ${codigo} guardado. También lo tiene «${otro.descripcion}»: si son el mismo artículo, unilos en Duplicados.`
        : `Código ${codigo} guardado. Ya se puede buscar este producto escaneándolo.`);
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

  return (
    <section className="cb" aria-label="Código de barras" data-testid="codigo-de-barras">
      <div className="cb-fila">
        <span className="cb-rotulo">Código de barras</span>
        {p.codigo_barras ? <code data-testid="codigo-actual">{p.codigo_barras}</code> : <span className="cb-sin" data-testid="codigo-actual">Todavía no tiene</span>}
        {!abierto && (
          <button type="button" className="cb-boton" onClick={() => { setAbierto(true); setAviso(null); setError(null); }} data-testid="escanear-codigo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2M7 9v6M11 9v6M14 9v6M17 9v6" /></svg>
            {conCamara ? (p.codigo_barras ? "Escanear otro código" : "Escanear el código") : p.codigo_barras ? "Cambiar el código" : "Cargar el código"}
          </button>
        )}
      </div>
      {aviso && <p className="cb-aviso" role="status" data-testid="codigo-guardado">{aviso}</p>}
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
