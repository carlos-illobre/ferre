import { useEffect, useState } from "react";
import { abreviarUnidad } from "../../../negocio/catalogo";
import css from "./Pedidos.module.css";

// La cantidad de un renglón: − y + (de a medio a granel) o tipeada; vacía o en cero, vuelve a la que tenía.
const granel = (unidad: string) => unidad !== "unidad";

export function CantidadDelPedido({ valor, unidad, nombre, alCambiar }: { valor: number; unidad: string; nombre: string; alCambiar: (c: number) => void }) {
  const paso = granel(unidad) ? 0.5 : 1;
  const [texto, setTexto] = useState(String(valor).replace(".", ","));
  useEffect(() => { setTexto(String(valor).replace(".", ",")); }, [valor]);
  const fijar = (crudo: string) => {
    const n = Number(crudo.replace(",", "."));
    const limpio = granel(unidad) ? Math.round(n * 10) / 10 : Math.floor(n);
    if (limpio > 0) alCambiar(limpio); else setTexto(String(valor).replace(".", ","));
  };
  return (
    <span className={css.cantidad}>
      <button type="button" onClick={() => alCambiar(Math.max(paso, Math.round((valor - paso) * 10) / 10))} aria-label={`Una menos de ${nombre}`}>−</button>
      <input inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={(e) => fijar(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        aria-label={`Cantidad de ${nombre}${granel(unidad) ? `, en ${unidad}` : ""}`} data-testid="cantidad-pedido" />
      <span className={css.unidad}>{abreviarUnidad(unidad)}</span>
      <button type="button" onClick={() => alCambiar(Math.round((valor + paso) * 10) / 10)} aria-label={`Una más de ${nombre}`}>+</button>
    </span>
  );
}

