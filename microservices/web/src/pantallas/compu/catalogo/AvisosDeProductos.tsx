import { SIN_FILTROS } from "../../../negocio/catalogo";
import { cuantosProductos, TEXTOS } from "../../textos";
import { irA } from "../base/rutas";
import { Aviso, Boton, Progreso, Vacio } from "../base/ui";
import type { EstadoDeProductos } from "./useProductos";

// Debajo de la búsqueda: buscando, el error, el catálogo vacío, cuántos con los filtros puestos y,
// si no encontró nada, qué probar.
const t = TEXTOS.catalogo;

export function AvisosDeProductos({ x }: { x: EstadoDeProductos }) {
  const { lista } = x;
  const listo = estaLista(x);
  const sinResultados = listo && !lista.error && lista.productos.length === 0;
  return (
    <>
      {!listo && <Progreso texto="Buscando…" />}
      <Aviso tipo="error">{x.error ?? lista.error}</Aviso>
      {sinResultados && <CatalogoVacio x={x} />}
      {x.conFiltros && <ConFiltros x={x} />}
      {sinResultados && <SinResultados x={x} />}
    </>
  );
}

// Lista para mostrar: ya llegó, o tiene lo de antes mientras busca.
const estaLista = (x: EstadoDeProductos) => !x.lista.cargando || x.lista.productos.length > 0;

function ConFiltros({ x }: { x: EstadoDeProductos }) {
  return (
    <p className="con-filtros detalle" data-testid="con-filtros">{cuantosProductos(x.lista.total)} {t.conFiltros.largo}
      <button type="button" className="enlace" onClick={() => x.setFiltros(SIN_FILTROS)} data-testid="sacar-filtros">{t.sacarFiltros.largo}</button></p>
  );
}

// Sin nada buscado ni filtros y sin productos: el catálogo está vacío.
function CatalogoVacio({ x }: { x: EstadoDeProductos }) {
  if (x.consultaEstable.trim() || x.conFiltros) return null;
  return (
    <Vacio icono="productos" titulo="Todavía no hay productos" accion={<Boton variante="principal" icono="listas" onClick={() => irA("listas")}>Cargar una lista de precios</Boton>}>
      Los productos entran solos al cargar la lista de precios de un proveedor.
    </Vacio>
  );
}

function SinResultados({ x }: { x: EstadoDeProductos }) {
  const buscado = x.consultaEstable.trim();
  if (x.conFiltros) {
    return <div data-testid="sin-resultados"><Vacio icono="buscar" titulo={t.sinProductosConFiltros.largo} accion={<Boton onClick={() => x.setFiltros(SIN_FILTROS)}>{t.sacarFiltros.largo}</Boton>}>{buscado ? `Lo que se buscó, «${x.consultaEstable}», no tiene productos con esos filtros.` : "Ningún producto del catálogo cumple esos filtros."}</Vacio></div>;
  }
  if (!buscado) return null;
  return <div data-testid="sin-resultados"><Vacio icono="buscar" titulo={`Nada con «${x.consultaEstable}»`}>Probá con menos palabras, o con el código del proveedor.</Vacio></div>;
}
