import { Buscador } from "../base/ui";
import { EscanearConElCelular } from "./EscanearConElCelular";
import { Sugerencias } from "./Sugerencias";
import type { EstadoDeVender } from "./useVender";
import css from "./BusquedaDeLaVenta.module.css";

// Arriba de la venta: la búsqueda con su desplegable y, con un celular vinculado, escanear con él.
export function BusquedaDeLaVenta({ v }: { v: EstadoDeVender }) {
  const { busqueda, venta } = v;
  const marcado = busqueda.resultados[busqueda.elegido];
  return (
    <div className={css.fila}>
      <div className={css.caja}>
        <Buscador valor={busqueda.consulta} alCambiar={busqueda.setConsulta} cajaRef={v.caja} autoFoco onKeyDown={v.alTeclear}
          placeholder="Buscá por nombre o código, o escaneá" etiqueta="Buscar un producto para agregarlo a la venta"
          controla="vender-sugerencias" activo={marcado ? `sug-${marcado.id}` : undefined} />
        {busqueda.resultados.length > 0 && (
          <Sugerencias resultados={busqueda.resultados} elegido={busqueda.elegido} stock={v.catalogo.stock}
            alElegir={(p) => v.conEntrada(() => venta.elegirSugerencia(p))} alMarcar={busqueda.setElegido} />
        )}
      </div>
      {v.celular.vinculado && <EscanearConElCelular alVincular={v.celular.alVincular} />}
    </div>
  );
}
