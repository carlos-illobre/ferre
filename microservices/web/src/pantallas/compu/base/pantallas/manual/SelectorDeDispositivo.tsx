import type { ReactNode } from "react";
import type { Dispositivo } from "./piezas";
import { NOMBRE_DEL_DISPOSITIVO } from "./capitulos";

// El dispositivo elegido se recuerda en esa computadora; si no se puede guardar, abre en Computadora.
const GUARDADO = "ferre.manual-dispositivo";
export function leerDispositivo(): Dispositivo {
  try { return localStorage.getItem(GUARDADO) === "celu" ? "celu" : "compu"; } catch { return "compu"; }
}
export function guardarDispositivo(d: Dispositivo) {
  try { localStorage.setItem(GUARDADO, d); } catch { /* sin almacenamiento: solo por esta vez */ }
}

// «¿Dónde lo usás?»: Computadora o Celular, como un grupo de opciones.
export function SelectorDeDispositivo({ valor, alElegir }: { valor: Dispositivo; alElegir: (d: Dispositivo) => void }) {
  const opciones: { d: Dispositivo; icono: ReactNode }[] = [
    { d: "compu", icono: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></> },
    { d: "celu", icono: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></> },
  ];
  return (
    <div className="manual-donde">
      <span id="manual-donde-titulo">¿Dónde lo usás?</span>
      <div className="manual-donde-opciones" role="radiogroup" aria-labelledby="manual-donde-titulo" data-testid="manual-dispositivo">
        {opciones.map(({ d, icono }) => (
          <button key={d} type="button" role="radio" aria-checked={valor === d} tabIndex={valor === d ? 0 : -1} onClick={() => alElegir(d)} data-dispositivo={d} data-testid={`manual-dispositivo-${d}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{icono}</svg>{NOMBRE_DEL_DISPOSITIVO[d]}
          </button>
        ))}
      </div>
    </div>
  );
}

