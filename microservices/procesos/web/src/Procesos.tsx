import type { PropsDeProcesos } from "./tipos";

// La pantalla de Procesos. Se completa con el editor (011-T006) y el celular (011-T007).
export function Procesos({ puede }: PropsDeProcesos) {
  return (
    <main className="procesos" data-testid="procesos">
      <h1>Procesos</h1>
      <p>{puede.dibujar ? "Acá se van a dibujar los procesos del negocio." : "Acá se van a ver los procesos del negocio."}</p>
    </main>
  );
}
