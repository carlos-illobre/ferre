import { PERMISOS, type Permiso } from "./permisos";
import "./sin-permiso.css";

// Lo que ve quien llega a una pantalla que sus roles no le permiten (RF-72). Dice qué permiso
// hace falta, para saber qué pedirle a quien administra los roles.
export function SinPermiso({ falta }: { falta: Permiso[] }) {
  return (
    <main id="contenido" className="sin-permiso" data-testid="sin-permiso" tabIndex={-1}>
      <h1>No tenés permiso para esta pantalla</h1>
      <p>Hace falta el permiso <strong>{falta.map((p) => `«${PERMISOS[p]}»`).join(" o ")}</strong>. Pedile a quien administra los roles que te lo dé.</p>
    </main>
  );
}
