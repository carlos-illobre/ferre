import { abreviarUnidad } from "../../../negocio/catalogo";
import type { Item } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./Renglon.module.css";

// Lo que se lleva es más de lo que hay.
const num = (n: number) => n.toLocaleString("es-AR");

export function StockQueNoAlcanza({ stock, item: it }: { stock: number; item: Item }) {
  return (
    <div className={css.stock} data-testid="stock-no-alcanza"><Icono nombre="alerta" tam={16} />
      {stock <= 0 ? TEXTOS.vender.sinStock.corto : `Hay ${num(stock)} ${abreviarUnidad(it.unidad)}: no alcanza para ${num(it.cantidad)}`}
    </div>
  );
}
