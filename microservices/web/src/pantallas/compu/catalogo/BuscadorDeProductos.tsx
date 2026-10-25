import { cuantosFiltros } from "../../../negocio/catalogo";
import { useEtiqueta, type Acciones } from "../../../plataforma/comandos";
import { TEXTOS } from "../../textos";
import { Boton, Buscador } from "../base/ui";
import { PanelDeFiltros } from "./PanelDeFiltros";
import type { EstadoDeProductos } from "./useProductos";

// La búsqueda, con «Filtros» y cuántos hay puestos; el panel se abre debajo del botón. En la
// búsqueda valen las acciones de la pantalla (elegir, abrir, agregar).
const t = TEXTOS.catalogo;

export function BuscadorDeProductos({ x, acciones }: { x: EstadoDeProductos; acciones: Acciones }) {
  const cuantos = cuantosFiltros(x.filtros);
  const tecla = useEtiqueta("productos.filtros");
  return (
    <Buscador valor={x.consulta} alCambiar={x.setConsulta} cajaRef={x.caja} autoFoco acciones={acciones} placeholder={t.buscar.largo} etiqueta="Buscar productos"
      extra={<div className="filtros-lugar">
        <Boton icono="filtros" onClick={() => x.setViendoFiltros((v) => !v)} aria-expanded={x.viendoFiltros} aria-keyshortcuts={tecla} aria-label={x.conFiltros ? `${t.filtros.largo}: ${cuantos}` : undefined} data-testid="filtros">
          {t.filtros.largo}{x.conFiltros && <b className="cuenta-filtros" data-testid="cuantos-filtros">{cuantos}</b>}
        </Boton>
        {x.viendoFiltros && <PanelDeFiltros filtros={x.filtros} marcas={x.marcas} alCambiar={x.setFiltros} alCerrar={() => { x.setViendoFiltros(false); x.caja.current?.focus(); }} />}
      </div>} />
  );
}
