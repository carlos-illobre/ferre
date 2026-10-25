import type { KeyboardEvent } from "react";
import { incompleto, type Renglon } from "../../../negocio/deposito";
import { Boton, Vacio, pesosCortos } from "../base/ui";
import { CantidadDelRenglon, CostoDelRenglon, NombreDelRenglon, SegunLaLista } from "./CeldasDelIngreso";
import type { IngresoDeLaCompu } from "./useIngresoDeLaCompu";

// Los renglones del ingreso, en una tabla: producto, cantidad, costo, la diferencia con la lista y el subtotal.
export function RenglonesDelIngreso({ x }: { x: IngresoDeLaCompu }) {
  const { renglones, proveedor } = x.ingreso;
  if (renglones.length === 0) {
    return (
      <Vacio icono="compras" titulo={proveedor ? "Buscá el primer producto que llegó" : "Elegí el proveedor y buscá el primer producto"}>
        El costo viene de la última lista del proveedor: en el caso común solo ponés la cantidad. Si el comprobante dice otro costo, escribilo y pasa a ser el vigente.
      </Vacio>
    );
  }
  return (
    <div className="tabla-marco">
      <table className="tabla compras-tabla" data-testid="renglones">
        <thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario sin IVA</th><th>Según la lista</th><th className="num">Subtotal</th><th><span className="solo-lectores">Quitar</span></th></tr></thead>
        <tbody>{renglones.map((r) => <RenglonDelIngreso key={r.clave} x={x} r={r} />)}</tbody>
      </table>
    </div>
  );
}

// Enter termina el renglón: de la descripción a la cantidad, de la cantidad al costo si falta, y
// si no de vuelta al buscador.
const DESPUES: Record<string, (r: Renglon) => string | null> = { "descripcion-nueva": () => "cantidad", cantidad: (r) => (r.costo === null ? "costo" : null), costo: () => null };
function teclasDeRenglon(e: KeyboardEvent<HTMLElement>, r: Renglon, caja: HTMLInputElement | null) {
  const despues = DESPUES[(e.target as HTMLElement).dataset.testid ?? ""];
  if (e.key !== "Enter" || !despues) return;
  e.preventDefault();
  const siguiente = despues(r);
  if (siguiente) e.currentTarget.querySelector<HTMLInputElement>(`[data-testid='${siguiente}']`)?.focus();
  else caja?.focus();
}

function RenglonDelIngreso({ x, r }: { x: IngresoDeLaCompu; r: Renglon }) {
  return (
    <tr className={incompleto(r) ? "incompleto" : ""} data-clave={r.clave} data-testid="renglon" onKeyDown={(e) => teclasDeRenglon(e, r, x.caja.current)}>
      <td><NombreDelRenglon x={x} r={r} /></td>
      <td className="angosta"><CantidadDelRenglon x={x} r={r} /></td>
      <td className="angosta"><CostoDelRenglon x={x} r={r} />{r.costo === null && <span className="falta-texto compras-bajo-nombre">Falta el costo</span>}</td>
      <td><SegunLaLista r={r} /></td>
      <td className="num"><span className="importe chico">{r.costo === null ? "—" : pesosCortos(r.costo * r.cantidad)}</span></td>
      <td className="angosta"><Boton tam="chico" icono="basura" variante="peligro" title="Quitar del ingreso" aria-label={`Quitar ${r.descripcion || "el producto nuevo"}`} onClick={() => x.quitar(r.clave)} data-testid="quitar" /></td>
    </tr>
  );
}
