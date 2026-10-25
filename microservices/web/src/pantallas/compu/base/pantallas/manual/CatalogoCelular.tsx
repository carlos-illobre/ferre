import { Boton, Nota } from "./piezas";
import { SeccionCatQue, SeccionCatPantalla, SeccionCatBuscar, SeccionCatEscanear, SeccionCatFiltros, SeccionCatAgregar } from "./CatalogoCelular-secciones";
import { SeccionCatFicha, SeccionCatMargen, SeccionCatPrecio, SeccionCatProveedor, SeccionCatCodigo, SeccionCatFoto } from "./CatalogoCelular-secciones-2";
import { SeccionCatLista, SeccionCatProblemas } from "./CatalogoCelular-secciones-3";

export { SECCIONES_DE_CATALOGO_CELULAR } from "./CatalogoCelular-piezas";

export function CapituloCatalogoCelular() {
  return (
    <>
      <p className="manual-capitulo">Capítulo 2</p>
      <h1>Catálogo: los productos</h1>
      <p className="manual-entrada">En el celular buscás cualquier artículo del local: cuánto hay y a cuánto se vende. Lo encontrás escaneándolo con la cámara, le ponés el margen, le sacás una foto y lo agregás a la venta.</p>
      <Nota tipo="importante"><b>Para llegar:</b> tocá <Boton>Catálogo</Boton>, abajo a la izquierda. Se abre en <b>Productos</b>.</Nota>
      <SeccionCatQue />
      <SeccionCatPantalla />
      <SeccionCatBuscar />
      <SeccionCatEscanear />
      <SeccionCatFiltros />
      <SeccionCatAgregar />
      <SeccionCatFicha />
      <SeccionCatMargen />
      <SeccionCatPrecio />
      <SeccionCatProveedor />
      <SeccionCatCodigo />
      <SeccionCatFoto />
      <SeccionCatLista />
      <SeccionCatProblemas />
    </>
  );
}
