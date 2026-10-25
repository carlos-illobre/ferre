import { abreviarUnidad } from "../../../negocio/catalogo";
import { Icono } from "../componentes/base";
import css from "./VentasDelDia.module.css";

// − cantidad +, con un paso de 1 (o de 0,5 si es a granel) y un mínimo (y, si hay, un máximo).
const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 3 });
const redondo = (n: number) => Math.round(n * 1000) / 1000;
type Props = { valor: number; unidad?: string; min: number; max?: number; alCambiar: (v: number) => void; etiqueta: string };

export function MasMenos({ valor, unidad, min, max, alCambiar, etiqueta }: Props) {
  const paso = Number.isInteger(valor) && Number.isInteger(max ?? 1) ? 1 : 0.5;
  return (
    <span className={`${css.vhcCantidad} ${css.cantidad}`}>
      <button type="button" aria-label={`Menos ${etiqueta}`} disabled={valor - paso < min - 1e-9} onClick={() => alCambiar(redondo(valor - paso))} data-testid="menos"><Icono nombre="menos" tam={16} /></button>
      <span className="n" data-testid="cantidad">{numero(valor)}</span><span className="u" data-testid="unidad-cantidad">{abreviarUnidad(unidad || "unidad")}</span>
      <button type="button" aria-label={`Más ${etiqueta}`} disabled={max !== undefined && valor + paso > max + 1e-9} onClick={() => alCambiar(redondo(valor + paso))} data-testid="mas"><Icono nombre="mas" tam={16} /></button>
    </span>
  );
}
