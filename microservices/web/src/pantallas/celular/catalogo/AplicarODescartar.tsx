import { fraccionAplicada, type Avance, type Cargada } from "../../../negocio/catalogo";

// «Descartar» y «Aplicar»; aplicando, la barra de avance (guardar precios y después buscar duplicados).
const miles = (n: number | string) => Number(n).toLocaleString("es-AR");
type Props = { r: Cargada["resumen"]; progreso: Avance | null; ocupado: boolean; alAplicar: () => void; alDescartar: () => void };

export function AplicarODescartar({ r, progreso, ocupado, alAplicar, alDescartar }: Props) {
  if (progreso) return <Aplicando r={r} progreso={progreso} />;
  return (
    <div className="acciones auto-1fr">
      <button type="button" className="boton blanco" onClick={alDescartar} disabled={ocupado}>Descartar</button>
      <button type="button" className="boton coral principal centrado" onClick={alAplicar} disabled={ocupado} data-testid="aplicar">Aplicar · cambian {miles(r.nuevos + r.modificados)} precios</button>
    </div>
  );
}

function Aplicando({ r, progreso }: { r: Cargada["resumen"]; progreso: Avance }) {
  const hecho = Math.round(fraccionAplicada(progreso, r.leidas) * 100);
  const duplicados = progreso.etapa === "duplicados";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} data-testid="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hecho}>
      <div className={`barra-progreso ${duplicados ? "indeterminada" : ""}`}><div style={{ width: `${hecho}%` }} /></div>
      <small>{duplicados ? "Precios guardados. Buscando duplicados con otros proveedores…" : `Guardando precios… ${progreso.procesadas.toLocaleString("es-AR")} de ${(progreso.total ?? r.leidas).toLocaleString("es-AR")}`}</small>
    </div>
  );
}
