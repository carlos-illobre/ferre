import { Boton, Nota, Paso, Tarjetas, Titulo } from "./piezas";
import { Captura, TAREAS, Video } from "./CatalogoCelular-piezas";

// Secciones del capítulo de CatalogoCelular.tsx.
export function SeccionCatQue() {
  return (
    <>
      <Titulo id="cat-que">¿Qué querés hacer?</Titulo>
      <p>Tocá una para ir directo.</p>
      <Tarjetas tarjetas={TAREAS} testId="manual-tareas" />
    </>
  );
}

export function SeccionCatPantalla() {
  return (
    <>
      <Titulo id="cat-pantalla">La pantalla</Titulo>
      <Paso numero={1} titulo="Cada tarjeta es un producto" celular={
        <Captura captura="pantalla" alt="El Catálogo del celular, con el buscador y las tarjetas de los productos" numero="2.1" pie="Catálogo, en el celular." />
      }>
        <p>Arriba, cuánto hay. A la derecha, el precio de venta y el margen. Abajo, la marca, el proveedor y el costo.</p>
        <p>Arriba de todo, el buscador, el botón para escanear y los filtros.</p>
      </Paso>
    </>
  );
}

export function SeccionCatBuscar() {
  return (
    <>
      <Titulo id="cat-buscar">Buscar un producto</Titulo>
      <p>Escribí y la lista cambia al instante. Funciona también sin internet.</p>
      <Video nombre="buscar" etiqueta="se escribe «mecha» y después una marca" />
      <Paso numero={1} titulo="Tocá el buscador y escribí" celular={
        <Captura captura="buscar" alt="El buscador con la palabra mecha y las mechas encontradas" numero="2.2" pie="Buscando «mecha»." />
      }>
        <p>Parte del nombre, la marca o el código. Con «mecha» aparecen todas las mechas.</p>
      </Paso>
      <Paso numero={2} titulo="Tocá el producto"><p>Se abre su ficha, con todo lo del producto.</p></Paso>
      <Nota tipo="consejo"><b>¿No aparece?</b> Probá con menos palabras, o con el código del proveedor.</Nota>
    </>
  );
}

export function SeccionCatEscanear() {
  return (
    <>
      <Titulo id="cat-escanear">Buscar escaneando</Titulo>
      <p>Lo más rápido: apuntás la cámara al código de barras y se abre la ficha del producto.</p>
      <Video nombre="escanear" etiqueta="se toca el botón de escanear, la cámara lee el código y se abre la ficha del taladro" />
      <Paso numero={1} titulo="Tocá el botón de las barras"><p>Está al lado del buscador (el 2 de la figura 2.1). Se abre la cámara.</p></Paso>
      <Paso numero={2} titulo="Apuntá al código de barras" celular={
        <Captura captura="escanear" alt="La cámara del celular apuntando a un código de barras" numero="2.3" pie="La cámara, leyendo el código." />
      }>
        <p>Lo lee solo: no hay que sacar foto. Si no lo lee, tipeá el número abajo y tocá Enter.</p>
      </Paso>
      <Paso numero={3} titulo="Se abre la ficha" celular={
        <Captura captura="escanear-ficha" alt="La ficha del producto escaneado" numero="2.4" pie="La ficha, abierta sola." />
      }>
        <p>La del producto que tiene ese código.</p>
      </Paso>
      <Nota tipo="consejo">Si ningún producto tiene ese código, Ferrebress avisa. Buscá el producto y cargale el código (más abajo, «Cargar el código de barras»).</Nota>
    </>
  );
}

export function SeccionCatFiltros() {
  return (
    <>
      <Titulo id="cat-filtros">Filtrar por stock o marca</Titulo>
      <p>Para ver solo los que hay en el local, los que faltan, o los de una marca.</p>
      <Video nombre="filtros" etiqueta="se abren los filtros, se elige Con stock y la marca Stanley, y después se sacan" />
      <Paso numero={1} titulo="Tocá el botón de filtros"><p>Está a la derecha del buscador (el 3 de la figura 2.1). Sube una hoja.</p></Paso>
      <Paso numero={2} titulo="Elegí qué ver" celular={
        <Captura captura="filtros" alt="La hoja de filtros" numero="2.5" pie="Los filtros." />
      }>
        <p><Boton>Con stock</Boton>: los que hay. <Boton>Sin stock</Boton>: los que faltan. Abajo, tocá la marca; para encontrarla rápido, escribí su nombre.</p>
      </Paso>
      <Paso numero={3} titulo={<>Tocá <Boton>Ver …</Boton></>} celular={
        <Captura captura="filtros-puestos" alt="La lista con filtros puestos" numero="2.6" pie="Con filtros puestos." />
      }>
        <p>Se cierra la hoja y la lista queda filtrada. El botón de filtros muestra cuántos hay puestos.</p>
      </Paso>
      <Paso numero={4} titulo={<>Para ver todos, <Boton>Sacar filtros</Boton></>}><p>Vuelve a mostrar todos los productos.</p></Paso>
    </>
  );
}

export function SeccionCatAgregar() {
  return (
    <>
      <Titulo id="cat-agregar">Agregar a la venta</Titulo>
      <p>Si el cliente lo lleva, agregalo desde acá.</p>
      <Video nombre="agregar" etiqueta="se agregan dos productos y se va a Vender, donde están" />
      <Paso numero={1} titulo={<>Tocá <Boton>Agregar</Boton></>} celular={
        <Captura captura="agregar" alt="El botón Agregar y el aviso de que se agregó" numero="2.7" pie="Agregado a la venta." />
      }>
        <p>Entra con cantidad 1. Si ya estaba, suma uno. Entra aunque no haya stock.</p>
      </Paso>
      <Paso numero={2} titulo="Cobrá en Vender"><p>Tocá <Boton>Vender</Boton>, abajo. El número sobre Vender dice cuántos productos lleva la venta.</p></Paso>
    </>
  );
}
