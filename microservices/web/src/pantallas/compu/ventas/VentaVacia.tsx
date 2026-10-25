import type { Producto } from "../../../negocio/catalogo";
import { nombreDeProducto, pesosCortos } from "../../../negocio/formato";
import { precioDe, useSugeridos } from "../../sugeridos";
import { Icono } from "../base/ui";
import { MiniaturaDeProducto } from "./MiniaturaDeProducto";
import css from "./VentaVacia.module.css";

// La venta vacía, como la maqueta (decisión 131): el recuadro gris con el carrito y, debajo, los
// cuatro últimos productos vendidos, que se agregan con un clic. Se recalculan al cobrar.
export function VentaVacia({ catalogo, cobro, alAgregar }: { catalogo: Producto[] | null; cobro: unknown; alAgregar: (p: Producto) => void }) {
  const { ultimos } = useSugeridos(catalogo, cobro);
  return (
    <>
      <div className={`${css.vacia} anim-sube`} data-testid="venta-vacia">
        <span className={css.icono} aria-hidden="true"><Icono nombre="vender" tam={26} /></span>
        <b>La venta está vacía</b>
        <span>Buscá por nombre o código, escaneá con el lector o con el celular.</span>
      </div>
      {ultimos.length > 0 && (
        <section className={`${css.ultimos} anim-sube`} aria-label="Lo último que se vendió" data-testid="sugeridos-ultimos">
          <h2>Lo último que se vendió</h2>
          <ul data-sin-flechas>{ultimos.map((p) => <li key={p.id}><UltimoVendido producto={p} alAgregar={() => alAgregar(p)} /></li>)}</ul>
        </section>
      )}
    </>
  );
}

function UltimoVendido({ producto: p, alAgregar }: { producto: Producto; alAgregar: () => void }) {
  const precio = precioDe(p);
  return (
    <button type="button" className={css.ultimo} onClick={alAgregar}>
      <MiniaturaDeProducto url={p.foto_url} tam={20} />
      <span className={css.texto}><span className="nombre">{nombreDeProducto(p.descripcion)}</span><span className={precio === null ? "falta-texto" : "importe"}>{precio === null ? "Sin precio" : pesosCortos(precio)}</span></span>
    </button>
  );
}
