import { useState, type ReactNode } from "react";
import { useVeCostos } from "../../Costos";
import { Boton, Ventana } from "../../../ui";

type Props = { valor: ReactNode; pasos: string[]; etiqueta?: string; className?: string; titulo?: string; conCosto?: boolean };

// Todo número calculado se toca y dice de dónde sale. La señal es el «?» en un círculo.
// `conCosto`: los pasos dejan ver el costo; quien no tiene «Ver costos» ve el número sin explicación.
export function Explicado({ valor, pasos, etiqueta, className, titulo, conCosto }: Props) {
  const veCostos = useVeCostos();
  if (!pasos.length || (conCosto && !veCostos)) return <span className={className}>{valor}</span>;
  return <ConExplicacion valor={valor} pasos={pasos} etiqueta={etiqueta} className={className} titulo={titulo} />;
}

function ConExplicacion({ valor, pasos, etiqueta, className, titulo }: Omit<Props, "conCosto">) {
  const [abierta, setAbierta] = useState(false);
  const texto = typeof valor === "string" ? valor : (etiqueta ?? "este número");
  return (
    <>
      <button type="button" className={`explicado ${className ?? ""}`} aria-label={`${etiqueta ?? texto}. Ver de dónde sale`} aria-haspopup="dialog"
        onClick={(e) => { e.stopPropagation(); setAbierta(true); }} data-testid="explicacion">
        <span>{valor}</span><span className="signo" aria-hidden="true">?</span>
      </button>
      {abierta && (
        <Ventana titulo={titulo ?? `De dónde sale ${texto}`} alCerrar={() => setAbierta(false)} testId="hoja-explicacion"
          pie={<Boton variante="marino" onClick={() => setAbierta(false)}>Entendido</Boton>}>
          <ol className="pasos">{pasos.map((p, i) => <li key={i}><span>{p}</span></li>)}</ol>
        </Ventana>
      )}
    </>
  );
}
