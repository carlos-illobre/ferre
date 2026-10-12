import { pausarEspejo, useEspejo } from "../espejo";
import { soltarEmparejamiento } from "../puesto";
import "./espejo-estado.css";

// El estado del espejo (decisión 60), siempre a la vista en los dos: con quién se está en
// espejo, si el otro no está abierto o si está en pausa; y los dos botones, «Pausar» (los
// separa un rato sin desemparejarlos) y «Desvincular» (el corte definitivo).
export function EspejoEstado() {
  const e = useEspejo();
  if (!e.emparejado) return null;
  const otro = e.lado === "computadora" ? "el celular" : "la computadora";
  const texto = !e.conectado ? `Conectando con ${otro}…`
    : !e.otroPresente ? `${e.lado === "computadora" ? "El celular no está abierto" : "La computadora no está abierta"}: trabajás solo acá`
    : e.pausado ? "Espejo en pausa: cada uno por su lado"
    : `En espejo con ${otro}`;
  return (
    <div className={`espejo ${e.enEspejo ? "activo" : ""}`} role="status" data-testid="espejo">
      <span className="espejo-texto" data-testid="espejo-estado"><span className="espejo-punto" aria-hidden="true" />{texto}</span>
      <span className="espejo-botones">
        {e.conectado && e.otroPresente && <button type="button" onClick={() => pausarEspejo(!e.pausado)} data-testid="pausar-espejo">{e.pausado ? "Reanudar" : "Pausar"}</button>}
        <button type="button" onClick={() => void soltarEmparejamiento()} data-testid="desvincular-espejo">Desvincular</button>
      </span>
    </div>
  );
}
