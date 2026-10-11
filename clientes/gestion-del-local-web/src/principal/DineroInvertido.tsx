import { useEffect, useState } from "react";
import { api } from "../api";
import { pesos } from "../formato";
import "./dinero-invertido.css";

// Dinero invertido en inventario (RF-53): lo que hay de cada producto por su costo vigente,
// sin IVA, en total y por proveedor. Va en Cómo va el negocio y no en Inventario, que es de
// quien compra y solo muestra cantidades (decisión 31).
type Datos = { valor_total: number; por_proveedor: Record<string, { unidades: number; valor: number; productos: number }> };
const enteros = (n: number) => pesos(Math.round(n)).replace(/,00$/, "");

export function DineroInvertido() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [falla, setFalla] = useState(false);
  useEffect(() => { api<Datos>("/stock").then(setDatos).catch(() => setFalla(true)); }, []);
  const proveedores = Object.entries(datos?.por_proveedor ?? {}).filter(([, v]) => v.valor > 0).sort((a, b) => b[1].valor - a[1].valor);
  const mayor = Math.max(1, proveedores[0]?.[1].valor ?? 1);
  return (
    <section className="di" aria-labelledby="di-titulo" data-testid="dinero-invertido">
      <h2 id="di-titulo">Dinero invertido en inventario</h2>
      {falla && <p className="di-detalle">Sin conexión: se ve cuando vuelva internet.</p>}
      {!datos && !falla && <p className="di-detalle" aria-busy="true">Calculando…</p>}
      {datos && (
        <>
          <p className="di-total" data-testid="dinero-invertido-total">{enteros(datos.valor_total)}</p>
          <p className="di-detalle">Lo que hay de cada producto por su costo vigente, sin IVA.</p>
          {proveedores.length > 0 && (
            <ul className="di-lista" aria-label="Dinero invertido por proveedor">
              {proveedores.map(([nombre, v]) => (
                <li key={nombre}>
                  <span className="di-nombre">{nombre}</span>
                  <span className="di-importe">{enteros(v.valor)}</span>
                  <span className="di-riel" aria-hidden="true"><i style={{ width: `${Math.max(1, Math.round((v.valor / mayor) * 100))}%` }} /></span>
                  <span className="di-detalle">{v.productos} {v.productos === 1 ? "producto" : "productos"}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
