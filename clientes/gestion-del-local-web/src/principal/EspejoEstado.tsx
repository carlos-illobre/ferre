import { useEffect, useState } from "react";
import { alAvisoDelEspejo, pausarEspejo, useEspejo } from "../espejo";
import "./espejo-estado.css";

// El estado del vínculo, siempre a la vista en los dos: con quién se trabaja, si el otro no está
// abierto o si están desconectados. Y un solo botón (decisiones 73 y 75): «Desconectar» para que
// cada uno trabaje por su lado un rato, y «Reconectar» para volver a trabajar en espejo. «Desvincular», el
// corte definitivo, está solo en Usuarios y sesiones.
export const TEXTOS_DEL_VINCULO = { separar: "Desconectar", juntar: "Reconectar", vincular: "Vincular", desvincular: "Desvincular" };
// `sinBoton`: en el celular el botón va en el encabezado de la pantalla, no en la franja.
export function EspejoEstado({ sinBoton = false }: { sinBoton?: boolean } = {}) {
  const e = useEspejo();
  // Lo que terminó en el otro dispositivo («venta cobrada») se dice acá un momento.
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => alAvisoDelEspejo(setAviso), []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t); }, [aviso]);
  if (!e.emparejado) return null;
  const otro = e.lado === "computadora" ? "el celular" : "la computadora";
  const texto = !e.conectado ? `Conectando con ${otro}…`
    : !e.otroPresente ? `${e.lado === "computadora" ? "El celular no está abierto" : "La computadora no está abierta"}: trabajás solo acá`
    : e.pausado ? "Desconectados: cada uno por su lado"
    : `Conectado con ${otro}`;
  return (
    <div className={`espejo ${e.enEspejo ? "activo" : ""}`} role="status" data-testid="espejo">
      <span className="espejo-texto" data-testid="espejo-estado"><span className="espejo-punto" aria-hidden="true" />{texto}</span>
      {aviso && <span className="espejo-aviso" data-testid="espejo-aviso">{aviso}</span>}
      {!sinBoton && e.conectado && (
        <span className="espejo-botones">
          <button type="button" onClick={() => pausarEspejo(!e.pausado)} data-testid="pausar-espejo">
            {/* El mismo ícono que en el celular: flechas que se acercan para reconectar, que se alejan para desconectar. */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={e.pausado ? "M3 12h6M21 12h-6M7 8l4 4-4 4M17 8l-4 4 4 4" : "M10 12H3M14 12h7M7 8l-4 4 4 4M17 8l4 4-4 4"} />
            </svg>
            {e.pausado ? TEXTOS_DEL_VINCULO.juntar : TEXTOS_DEL_VINCULO.separar}
          </button>
        </span>
      )}
    </div>
  );
}
