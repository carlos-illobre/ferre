import { cuantosFiltros } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Boton, Buscador } from "../base/ui";
import { PanelDeFiltros } from "./PanelDeFiltros";
import type { EstadoDeProductos } from "./useProductos";

// La búsqueda, con «Filtros» (Alt F) y cuántos hay puestos; el panel se abre debajo del botón.
const t = TEXTOS.catalogo;

export function BuscadorDeProductos({ x }: { x: EstadoDeProductos }) {
  const cuantos = cuantosFiltros(x.filtros);
  return (
    <Buscador valor={x.consulta} alCambiar={x.setConsulta} cajaRef={x.caja} autoFoco placeholder={t.buscar.largo} etiqueta="Buscar productos"
      extra={<div className="filtros-lugar">
        <Boton icono="filtros" onClick={() => x.setViendoFiltros((v) => !v)} aria-expanded={x.viendoFiltros} aria-keyshortcuts="Alt+F" aria-label={x.conFiltros ? `${t.filtros.largo}: ${cuantos}` : undefined} data-testid="filtros">
          {t.filtros.largo}{x.conFiltros && <b className="cuenta-filtros" data-testid="cuantos-filtros">{cuantos}</b>}
        </Boton>
        {x.viendoFiltros && <PanelDeFiltros filtros={x.filtros} marcas={x.marcas} alCambiar={x.setFiltros} alCerrar={() => { x.setViendoFiltros(false); x.caja.current?.focus(); }} />}
      </div>} />
  );
}
