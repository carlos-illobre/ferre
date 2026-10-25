import { useDineroInvertido, type InvertidoDelProveedor } from "../negocio/deposito";
import { pesos } from "../negocio/formato";
import "./dinero-invertido.css";

// Dinero invertido en inventario (RF-53). Va en Cómo va el negocio → Inventario, con «Ver el dinero
// invertido» (decisión 95), y no en Depósito → Inventario, que solo muestra cantidades (decisión 31).
const enteros = (n: number) => pesos(Math.round(n)).replace(/,00$/, "");

function PorProveedor({ proveedores }: { proveedores: InvertidoDelProveedor[] }) {
  if (proveedores.length === 0) return null;
  return (
    <ul className="di-lista" aria-label="Dinero invertido por proveedor">
      {proveedores.map((v) => (
        <li key={v.nombre}>
          <span className="di-nombre">{v.nombre}</span>
          <span className="di-importe">{enteros(v.valor)}</span>
          <span className="di-riel" aria-hidden="true"><i style={{ width: `${v.ancho}%` }} /></span>
          <span className="di-detalle">{v.productos} {v.productos === 1 ? "producto" : "productos"}</span>
        </li>
      ))}
    </ul>
  );
}

export function DineroInvertido() {
  const { total, proveedores, falla } = useDineroInvertido();
  return (
    <section className="di" aria-labelledby="di-titulo" data-testid="dinero-invertido">
      <h2 id="di-titulo">Dinero invertido en inventario</h2>
      {falla && <p className="di-detalle">Sin conexión: se ve cuando vuelva internet.</p>}
      {total === null && !falla && <p className="di-detalle" aria-busy="true">Calculando…</p>}
      {total !== null && (
        <>
          <p className="di-total" data-testid="dinero-invertido-total">{enteros(total)}</p>
          <p className="di-detalle">Lo que hay de cada producto por su costo vigente, sin IVA.</p>
          <PorProveedor proveedores={proveedores} />
        </>
      )}
    </section>
  );
}
