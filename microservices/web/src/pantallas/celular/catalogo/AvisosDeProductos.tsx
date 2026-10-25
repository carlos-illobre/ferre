import { SIN_FILTROS } from "../../../negocio/catalogo";
import { cuantosProductos, TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import type { ProductosDelCelular } from "./useProductosDelCelular";

// Arriba de la lista: cuántos productos están sin precio (los cuenta el servidor, la v2, decisión
// 145) o, con filtros, cuántos hay y «Sacar filtros».
const t = TEXTOS.catalogo;

export function AvisosDeProductos({ x }: { x: ProductosDelCelular }) {
  return (
    <>
      {x.resumen && x.resumen.sin_margen > 0 && !x.conFiltros && (
        <div className="avisos-catalogo"><span className="pastilla-sin-precio" data-testid="cuantos-sin-precio"><Icono nombre="alerta" tam={16} />{x.resumen.sin_margen.toLocaleString("es-AR")} {t.sinPrecio.corto}</span></div>
      )}
      {x.conFiltros && (
        <p className="con-filtros" data-testid="con-filtros">{cuantosProductos(x.lista.total)} {t.conFiltros.corto}
          <button type="button" onClick={() => x.setFiltros(SIN_FILTROS)} data-testid="sacar-filtros">{t.sacarFiltros.corto}</button></p>
      )}
    </>
  );
}

// Cuando no hay nada para mostrar: por los filtros, por lo buscado o porque no hay productos.
export function SinResultados({ x }: { x: ProductosDelCelular }) {
  const listo = !x.lista.cargando || x.lista.productos.length > 0;
  if (!listo || x.lista.error || x.lista.productos.length > 0) return null;
  if (x.conFiltros) return <div className="aviso-suave" data-testid="sin-resultados">{t.sinProductosConFiltros.corto} <button type="button" className="enlace" onClick={() => x.setFiltros(SIN_FILTROS)}>{t.sacarFiltros.corto}</button></div>;
  if (x.consultaEstable.trim()) return <div className="aviso-suave" data-testid="sin-resultados">Nada con "{x.consultaEstable}". Probá con menos palabras.</div>;
  return <div className="aviso-suave">Todavía no hay productos: cargá una lista de precios primero.</div>;
}
