import { conUnidad, useCatalogo, type Producto } from "../../../negocio/catalogo";
import { estadoDelStock, type useStock } from "../../../negocio/deposito";
import { FotoDeProducto } from "./FotoDeProducto";
import css from "./Stock.module.css";

// Cada producto con su stock en color; tocarlo abre su hoja.
type Props = { filas: Producto[]; porId: ReturnType<typeof useStock>["porId"]; alAbrir: (id: string) => void };

export function FilasDelStock({ filas, porId, alAbrir }: Props) {
  const { actualizarProducto } = useCatalogo();
  return (
    <ul className={css.lista} data-testid="tabla-stock">
      {filas.map((p) => {
        const n = Number(porId.get(p.id)?.stock ?? 0);
        return (
          <li key={p.id} className={css.r} data-testid="fila-stock">
            <FotoDeProducto producto={p} alCambiar={(f) => { actualizarProducto(p.id, { foto_url: f }).catch(() => undefined); }} />
            <button type="button" className={css.rBoton} onClick={() => alAbrir(p.id)} data-testid="stock" aria-haspopup="dialog">
              <span className={css.rTexto}><span className={css.t}>{p.descripcion}</span><span className={css.d}>{[p.marca, p.proveedor].filter(Boolean).join(" · ") || "Sin marca"}</span></span>
              <span className={`${css.dato} ${estadoDelStock(n)}`}><span className={css.et}>Stock</span><span className={css.va}>{conUnidad(n, p.unidad).replace("-", "−")}</span></span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
