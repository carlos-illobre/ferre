import { useEffect, useRef } from "react";
import { stockDe } from "../../../negocio/catalogo";
import { cuantosProductos, TEXTOS } from "../../textos";
import { Atajo } from "../base/ui";
import { FilaProducto } from "./FilaProducto";
import type { EstadoDeProductos } from "./useProductos";
import css from "./Productos.module.css";

// Lo encontrado, de a 50: al llegar al final se traen los siguientes (specs/018). El elegido con las
// flechas queda siempre a la vista. Debajo, las teclas.
const t = TEXTOS.catalogo;

export function ListaDeProductos({ x }: { x: EstadoDeProductos }) {
  const { lista } = x;
  const centinela = useTraerMasAlLlegar(lista.hayMas, lista.cargarMas, lista.productos.length);
  useEffect(() => { document.querySelector(".productos [data-testid='producto'][aria-selected='true']")?.scrollIntoView?.({ block: "nearest" }); }, [x.elegido]);
  const buscado = x.consultaEstable.trim();
  return (
    <>
      {lista.productos.length > 0 && <p className={css.cuenta}><span>{buscado ? `${cuantosProductos(lista.total)} con «${buscado}»` : cuantosProductos(lista.total)}</span><span>{t.precioYMargen.largo}</span></p>}
      {lista.productos.length > 0 && (
        <ul className={css.filas} data-flechas-propias data-testid="resultados">
          {lista.productos.map((p, i) => <FilaProducto key={p.id} producto={p} stock={stockDe(p, x.stock)} elegido={i === x.elegido} alElegir={() => x.setElegido(i)} alAgregar={x.puedeVender ? () => { x.setElegido(i); x.agregar(p); } : undefined} />)}
          {lista.hayMas && <li ref={centinela} className="detalle productos-mas" data-testid="cargar-mas">{t.cargandoMas.largo}</li>}
        </ul>
      )}
      <p className={`${css.teclas} detalle`}>
        {x.puedeVender && <span><Atajo accion="productos.agregar" kbd /> {t.teclaAgregar.largo}</span>}
        {x.fijaMargen && <span><Atajo accion="productos.margenes" kbd /> margen</span>}
        <span><Atajo accion="productos.filtros" kbd /> {t.filtros.largo.toLowerCase()}</span>
      </p>
    </>
  );
}

// Trae más resultados al llegar al final de los que están a la vista.
function useTraerMasAlLlegar(hayMas: boolean, cargarMas: () => void, cuantos: number) {
  const centinela = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const obs = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) cargarMas(); }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hayMas, cargarMas, cuantos]);
  return centinela;
}
