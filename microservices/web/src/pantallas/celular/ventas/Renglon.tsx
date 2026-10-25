import { useState } from "react";
import { enteras, type Unidad } from "../../../negocio/catalogo";
import { precioDe, type Item } from "../../../negocio/ventas";
import { Contador, Icono } from "../componentes/base";
import { FotoProducto } from "../componentes/Foto";
import { HojaComoSeCalculo } from "./HojaComoSeCalculo";
import { MargenDelRenglon, MargenesSinPrecio } from "./MargenesDelRenglon";
import { NombreDelRenglon } from "./NombreDelRenglon";
import { PrecioDelRenglon } from "./PrecioDelRenglon";
import { StockQueNoAlcanza } from "./StockQueNoAlcanza";
import { UnidadDelRenglon } from "./UnidadDelRenglon";
import { subtotalDe } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import css from "./Renglon.module.css";

// Un renglón de la venta (decisión 119): la foto, el nombre con su marca y stock y el precio por
// unidad en una pastilla que explica cómo se calculó; abajo la cantidad, la unidad, el margen y el
// total del renglón. Sin precio, los márgenes para elegir ahí mismo.
export type AccionesDelRenglon = {
  alCambiar: (c: Partial<Item>) => void; alQuitar: () => void; alElegirMargen: (m: number) => void; alCambiarUnidad: (u: Unidad) => void;
  alSubirFoto?: (archivo: File) => Promise<void>; alAbrir: () => void;
};

export function Renglon({ item: it, stock, recien, acciones: a }: { item: Item; stock: number | undefined; recien: boolean; acciones: AccionesDelRenglon }) {
  const [calculo, setCalculo] = useState(false);
  const p = precioDe(it);
  const sinPrecio = p.unitario === null;
  return (
    <div className={[css.renglon, sinPrecio && css.falta, recien && css.recien].filter(Boolean).join(" ")} data-testid="item" data-producto={it.producto?.id}>
      <div className={css.arriba}>
        <FotoDelRenglon item={it} alSubir={a.alSubirFoto} />
        <NombreDelRenglon item={it} stock={stock} alCambiar={a.alCambiar} alAbrir={a.alAbrir} />
        <PrecioDelRenglon item={it} alCambiar={a.alCambiar} alExplicar={() => setCalculo(true)} />
      </div>
      {sinPrecio && it.producto ? <MargenesSinPrecio conCosto={p.costo !== null} alElegir={a.alElegirMargen} alAMano={a.alAbrir} /> : <AbajoDelRenglon item={it} acciones={a} />}
      {noAlcanza(it, stock) && <StockQueNoAlcanza stock={stock!} item={it} />}
      {calculo && <HojaComoSeCalculo item={it} alCerrar={() => setCalculo(false)} />}
    </div>
  );
}

const noAlcanza = (it: Item, stock: number | undefined) => Boolean(it.producto) && stock !== undefined && it.cantidad > stock;

function FotoDelRenglon({ item: it, alSubir }: { item: Item; alSubir?: (archivo: File) => Promise<void> }) {
  if (!it.producto) return <span className={`miniatura foto-chica ${css.libre}`}><Icono nombre="caja" tam={22} /></span>;
  return <FotoProducto id={it.producto.id} url={it.producto.foto_url ?? null} descripcion={it.producto.descripcion} alSubir={alSubir} />;
}

// Abajo: el tacho debajo de la foto; la cantidad en blanco con la unidad adentro, como la v2
// (decisión 140), el margen y el total del renglón.
function AbajoDelRenglon({ item: it, acciones: a }: { item: Item; acciones: AccionesDelRenglon }) {
  const renglon = subtotalDe(it);
  return (
    <div className={css.abajo}>
      <button type="button" className={css.tacho} onClick={a.alQuitar} aria-label={`Quitar ${it.descripcion || "este renglón"} de la venta`} data-testid="quitar-renglon"><Icono nombre="tacho" tam={20} /></button>
      <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => a.alCambiar({ cantidad: v })} alQuitar={a.alQuitar}>
        <UnidadDelRenglon unidad={it.unidad} alCambiar={a.alCambiarUnidad} />
      </Contador>
      {it.producto && precioDe(it).costo !== null && <MargenDelRenglon item={it} alAbrir={a.alAbrir} />}
      <span className={`${css.subtotal} importe`} data-testid="subtotal">{renglon ? pesosCortos(renglon.valor) : ""}</span>
    </div>
  );
}
