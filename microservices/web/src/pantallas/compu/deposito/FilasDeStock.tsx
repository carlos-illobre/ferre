import { conUnidad } from "../../../negocio/catalogo";
import { estadoDelStock } from "../../../negocio/deposito";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { FotoDeProducto } from "./FotoDeProducto";
import { plural, type Producto } from "./deposito-comun";
import { TOPE, type Columna, type Inventario } from "./useInventario";
import css from "./Inventario.module.css";

// Cuántos son, cómo ordenarlos (por nombre, stock o último movimiento) y los productos, cada uno con
// su stock en color; el elegido muestra su cuenta a la derecha.
export function FilasDeStock({ x }: { x: Inventario }) {
  return (
    <>
      <p className={css.cuenta}><span>{plural(x.filas.length, "producto", "productos")}{x.hayMas ? ` de más de ${TOPE}` : ""}</span>
        <span className={css.ordenes}>Ordenar: <Orden x={x} columna="producto" nombre="nombre" /><Orden x={x} columna="stock" nombre="stock" /><Orden x={x} columna="ultimo" nombre="último movimiento" /></span></p>
      <ul className={css.filas} data-flechas-propias data-testid="tabla-stock">
        {x.filas.map((p) => <FilaDeStock key={p.id} x={x} p={p} />)}
      </ul>
    </>
  );
}

// Tocar la columna la ordena; otra vez, al revés; otra vez, sin orden.
function Orden({ x, columna, nombre }: { x: Inventario; columna: Columna; nombre: string }) {
  const activa = x.orden?.columna === columna;
  const ordenar = () => x.setOrden((o) => (o?.columna === columna ? (o.sube === (columna === "producto") ? { columna, sube: !o.sube } : null) : { columna, sube: columna === "producto" }));
  return (
    <button type="button" className={`${css.orden} ${activa ? "activo" : ""}`} onClick={ordenar} aria-pressed={activa}>
      {nombre}{activa ? (x.orden!.sube ? " ↑" : " ↓") : ""}
    </button>
  );
}

function FilaDeStock({ x, p }: { x: Inventario; p: Producto }) {
  const n = x.cantidadDe(p.id);
  const elegida = p.id === x.elegido?.id;
  return (
    <li className={`${css.fila} ${elegida ? "foco" : ""}`} aria-selected={elegida} data-testid="fila-stock" onClick={() => x.setElegidoId(p.id)}>
      <FotoDeProducto producto={p} alCambiar={(f) => { x.actualizarProducto(p.id, { foto_url: f }).catch(() => undefined); }} />
      <span className={css.texto}>
        <span className={css.nombre}>{p.descripcion}</span>
        <span className={css.detalle}>{[p.marca, p.codigo_proveedor].filter(Boolean).join(" · ") || "Sin marca"}
          {n < 0 && <span className={`${css.pastilla} error`}>{TEXTOS.stock.revisar.largo}</span>}
          {x.porEnviar.has(p.id) && <span className={`${css.pastilla} urgente`}>Se manda al volver internet</span>}
        </span>
      </span>
      <button type="button" className={`${css.dato} ${estadoDelStock(n)}`} onClick={(e) => { e.stopPropagation(); x.setElegidoId(p.id); }}
        aria-label={`${conUnidad(n, p.unidad)}. Ver los movimientos de ${p.descripcion}`} data-testid="stock">
        <span className={css.et}>Stock</span><span className={css.va}>{conUnidad(n, p.unidad).replace("-", "−")}</span>
      </button>
      <Icono nombre="chevron-right" className={css.flecha} />
    </li>
  );
}
