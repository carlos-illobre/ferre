import type { Procesos } from "../estado";
import type { Puede } from "../tipos";

// El celular (historia 4): «Pasos» y «Diagrama». Se completa en 011-T007.
export function ProcesosCelu({ procesos }: { procesos: Procesos; puede: Puede; pantallas: string[]; alVolver?: () => void }) {
  return <main className="procesos procesos-celu" data-testid="procesos"><h1>{procesos.abierto?.nombre ?? "Procesos"}</h1></main>;
}
