import { Boton, Nota, Tecla } from "./piezas";
import { SeccionCatQue, SeccionCatPantalla, SeccionCatBuscar, SeccionCatFiltros, SeccionCatPrecio, SeccionCatMargen, SeccionCatProveedor } from "./Catalogo-secciones";
import { SeccionCatLista, SeccionCatFoto, SeccionCatAgregar, SeccionCatFicha, SeccionCatCodigo, SeccionCatEscanear } from "./Catalogo-secciones-2";
import { SeccionCatTeclado, SeccionCatProblemas } from "./Catalogo-secciones-3";

export { SECCIONES_DE_CATALOGO } from "./Catalogo-piezas";

export function CapituloCatalogo() {
  return (
    <>
      <p className="manual-capitulo">Capítulo 2</p>
      <h1>Catálogo: los productos</h1>
      <p className="manual-entrada">En Productos encontrás cualquier artículo del local: cuánto hay, cuánto cuesta y a cuánto se vende. También le ponés el margen, le sacás una foto y lo agregás a la venta.</p>
      <Nota tipo="importante"><b>Para llegar:</b> hacé clic en <Boton>Catálogo</Boton>, en el menú de la izquierda (o apretá <Tecla>Alt</Tecla> + <Tecla>1</Tecla>). Se abre en <b>Productos</b>.</Nota>
      <SeccionCatQue />
      <SeccionCatPantalla />
      <SeccionCatBuscar />
      <SeccionCatFiltros />
      <SeccionCatPrecio />
      <SeccionCatMargen />
      <SeccionCatProveedor />
      <SeccionCatLista />
      <SeccionCatFoto />
      <SeccionCatAgregar />
      <SeccionCatFicha />
      <SeccionCatCodigo />
      <SeccionCatEscanear />
      <SeccionCatTeclado />
      <SeccionCatProblemas />
    </>
  );
}
