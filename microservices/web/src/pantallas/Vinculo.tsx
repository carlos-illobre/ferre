import { useEspejo } from "../espejo";
import { puestoLocal, puestoRemoto, soltarEmparejamiento } from "../puesto";
import { fecha } from "../formato";
import "./vinculo.css";

// El vínculo entre un celular y una computadora (decisiones 73, 74, 99 y 100), en dos lugares que
// no se repiten: lo de cada uno, en Configuración, y cuántos días dura, en Más → Sistema (specs/020).

// En Configuración: a quien está vinculado le dice con qué y hasta cuándo, y le ofrece
// «Desvincular», que es el corte definitivo y por eso pregunta. Sin vínculo, no se ve.
export function VinculoPropio() {
  const { emparejado, lado } = useEspejo();
  if (!emparejado) return null;
  const computadora = lado === "computadora";
  const vence = (computadora ? puestoLocal() : puestoRemoto())?.expira_en;
  function desvincular() {
    if (window.confirm(`¿Desvincular ${computadora ? "el celular de esta computadora" : "este celular de la computadora"}? Para volver a trabajar juntos vas a tener que escanear el código.`)) void soltarEmparejamiento();
  }
  return (
    <section className="dias-de-vinculo" aria-labelledby="vinculo-propio" data-testid="vinculo">
      <h2 id="vinculo-propio">Vínculo entre celular y computadora</h2>
      <div className="dias-de-vinculo-fila" data-testid="vinculo-actual">
        <span className="dias-de-vinculo-estado">
          {computadora ? "Esta computadora está vinculada con tu celular." : "Este celular está vinculado con tu computadora."}
          {vence && <small className="dias-de-vinculo-vence">Hasta el {fecha(vence.slice(0, 10))}</small>}
        </span>
        <button type="button" className="peligro" onClick={desvincular} data-testid="desvincular-vinculo" aria-label={`Desvincular ${computadora ? "el celular" : "la computadora"}`}>Desvincular</button>
      </div>
    </section>
  );
}
