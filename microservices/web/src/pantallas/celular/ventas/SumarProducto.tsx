import { useState } from "react";
import { precioDelProducto, useCatalogo, type Producto } from "../../../negocio/catalogo";
import type { SeLleva } from "../../../negocio/ventas";
import { nombreDeProducto, pesosCortos } from "../../../negocio/formato";
import { Icono } from "../componentes/base";
import { FotoChica } from "./FotoChica";
import css from "./VentasDelDia.module.css";

// Un producto del catálogo para sumar (al corregir o en lo que se lleva), buscado como en Vender.
const comoRenglon = (p: Producto): SeLleva => {
  const precio = precioDelProducto(p);
  return { producto_id: p.id, descripcion: p.descripcion, foto_url: p.foto_url ?? null, unidad: p.unidad, cantidad: 1, precio_unitario: precio.valor!, margen_aplicado: p.margen_elegido, costo_neto: precio.costo };
};

export function SumarProducto({ alSumar, etiqueta }: { alSumar: (p: SeLleva) => void; etiqueta: string }) {
  const { buscarProductos } = useCatalogo();
  const [texto, setTexto] = useState("");
  const hallados = texto.trim() ? buscarProductos(texto, 5) : [];
  return (
    <div className={css.sumar}>
      <label className={css.buscarCaja}><Icono nombre="buscar" tam={20} />
        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Producto, código o marca" aria-label={etiqueta} data-testid="buscar-producto" />
      </label>
      {hallados.map((p) => <Hallado key={p.id} producto={p} alSumar={() => { alSumar(comoRenglon(p)); setTexto(""); }} />)}
    </div>
  );
}

function Hallado({ producto: p, alSumar }: { producto: Producto; alSumar: () => void }) {
  const precio = precioDelProducto(p).valor;
  return (
    <button type="button" className={`${css.renglon} ${css.hallado}`} disabled={precio === null} data-testid="producto-para-sumar" onClick={alSumar}>
      <FotoChica url={p.foto_url ?? null} /><span className={css.nom}><b>{nombreDeProducto(p.descripcion)}</b><small>{p.marca ?? ""}</small></span>
      <strong className="importe">{precio === null ? "Sin precio" : `+${pesosCortos(precio)}`}</strong>
    </button>
  );
}
