import { Aviso, Boton, Icono } from "../base/ui";
import type { EstadoDeVender } from "./useVender";

// Debajo de la búsqueda: si no se pudo traer el catálogo, un código que no es de ningún producto
// y, si lo escrito no está, agregarlo como ítem libre.
export function AvisosDeLaBusqueda({ v }: { v: EstadoDeVender }) {
  const { venta, busqueda, catalogo } = v;
  const texto = busqueda.consulta.trim();
  const noEsta = texto && busqueda.resultados.length === 0 && !catalogo.buscandoEnElServidor && !catalogo.error;
  return (
    <>
      <Aviso tipo="error">{catalogo.error}</Aviso>
      {venta.codigoDesconocido && (
        <Aviso tipo="alerta" testId="codigo-desconocido" accion={<Boton tam="chico" onClick={() => venta.setCodigoDesconocido(null)}>Ignorar</Boton>}>
          El código <code>{venta.codigoDesconocido}</code> no está en el catálogo. Buscá el producto y elegilo: el código le queda asociado.
        </Aviso>
      )}
      {noEsta && (
        <div className="lista" data-sin-flechas>
          <button type="button" className="renglon" onClick={() => venta.agregar(null, texto)} data-testid="agregar-libre">
            <span className="nombre">Agregar «{texto}» como ítem libre</span><Icono nombre="mas" />
            <span className="detalle">No está en ninguna lista. Le ponés el precio a mano. Enter lo agrega.</span>
          </button>
        </div>
      )}
    </>
  );
}
