import { variacion, type Fila } from "../../../negocio/catalogo";
import { pesos, porcentaje } from "../../../formato";
import { Explicacion } from "../componentes/Explicacion";
import { Lista } from "../componentes/base";

// La vista previa, con los cambios primero: el costo nuevo (con de dónde sale) y cuánto cambia.
export function PreviaDeLaLista({ filas, total }: { filas: Fila[]; total: number }) {
  return (
    <>
      <h2 className="seccion">Vista previa · cambios primero{total > filas.length ? ` · primeras ${filas.length} de ${total}` : ""}</h2>
      <Lista data-testid="vista-previa">{filas.map((f) => <FilaDeLaPrevia key={f.codigo_proveedor} f={f} />)}</Lista>
    </>
  );
}

const cuantoCambia = (f: Fila, cambio: number | null) => (f.costo_anterior === null ? "nuevo" : cambio === null || cambio === 0 ? "sin cambio" : porcentaje(cambio));

function FilaDeLaPrevia({ f }: { f: Fila }) {
  const cambio = variacion(f);
  return (
    <div className="fila" role="row" aria-label={`${f.codigo_proveedor} ${f.descripcion}`}>
      <span className="nombre">{f.descripcion}</span>
      <span className="derecha">
        <Explicacion valor={pesos(f.costo_neto)} pasos={f.explicacion} className="importe" />
        <small style={{ color: cambio && cambio > 0 ? "var(--coral-texto)" : undefined, fontWeight: 600 }}>{cuantoCambia(f, cambio)}</small>
      </span>
      <span className="detalle"><code>{f.codigo_proveedor}</code>{f.marca ? ` · ${f.marca}` : ""}{f.costo_anterior !== null ? ` · antes ${pesos(f.costo_anterior)}` : ""}</span>
    </div>
  );
}
