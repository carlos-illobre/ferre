import { useProcesos } from "./estado";
import { EditorCompu } from "./compu/EditorCompu";
import { ProcesosCelu } from "./celu/ProcesosCelu";
import type { PropsDeProcesos } from "./tipos";

// La pantalla de Procesos (specs/011-procesos). La aplicación dice en qué interfaz está; las
// reglas y los textos son los mismos en las dos.
export function Procesos({ interfaz, pedir, puede, pantallas, guardarLocal }: PropsDeProcesos) {
  const procesos = useProcesos({ pedir, puede, guardarLocal });
  if (!puede.ver && !puede.dibujar) return <p role="alert">No tenés permiso para ver los procesos. Hace falta: Ver procesos o Dibujar procesos.</p>;
  return interfaz === "compu"
    ? <EditorCompu procesos={procesos} puede={puede} pantallas={pantallas} guardarLocal={guardarLocal} />
    : <ProcesosCelu procesos={procesos} puede={puede} pantallas={pantallas} />;
}
