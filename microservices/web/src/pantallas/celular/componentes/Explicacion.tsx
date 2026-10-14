import { useState } from "react";
import { useVeCostos } from "../../Costos";
import { Hoja, Pasos } from "./base";

// Todo número calculado explica de dónde sale (issue #47): el valor se ve subrayado con
// puntos y, al tocarlo, sube una hoja con los pasos en castellano, numerados.
// `conCosto`: los pasos dejan ver el costo; quien no tiene «Ver costos» ve el número sin explicación.
export function Explicacion({ valor, pasos, etiqueta, className, conCosto }: { valor: string; pasos: string[]; etiqueta?: string; className?: string; conCosto?: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const veCostos = useVeCostos();
  if (conCosto && !veCostos) return <span className={className} data-testid="sin-explicacion">{valor}</span>;
  return (
    <>
      <button type="button" className={`explicacion ${className ?? ""}`} title="¿De dónde sale este número?" aria-label={etiqueta ?? `De dónde sale ${valor}`} onClick={(e) => { e.stopPropagation(); setAbierta(true); }}>{valor}</button>
      {abierta && (
        <Hoja titulo={`De dónde sale ${valor}`} alCerrar={() => setAbierta(false)} testId="hoja-explicacion">
          <Pasos pasos={pasos} />
          <button type="button" className="boton tinta" onClick={() => setAbierta(false)}>Listo</button>
        </Hoja>
      )}
    </>
  );
}
