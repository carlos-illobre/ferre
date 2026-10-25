import { Boton, Nota, Paso, Tarjetas, Tecla, Titulo } from "./piezas";
import { Captura, TAREAS, Video } from "./Catalogo-piezas";

// Secciones del capítulo de Catalogo.tsx.
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
      <p>Cada fila es un producto. Arriba, el buscador; en cada fila, cuánto hay, el costo, el margen y el precio.</p>
      <Captura captura="pantalla" alt="La pantalla Productos, con el buscador y la lista de productos" numero="2.1" pie="Productos, en la computadora." />
    </>
  );
}

export function SeccionCatBuscar() {
  return (
    <>
      <Titulo id="cat-buscar">Buscar un producto</Titulo>
      <p>Escribí y la lista cambia al instante. Funciona también sin internet.</p>
      <Video nombre="buscar" etiqueta="se escribe «mecha», después una marca y después un código de barras">Se busca por nombre, por marca y por código.</Video>
      <Paso numero={1} titulo="Escribí en el buscador">
        <p>Escribí parte del nombre, la marca o el código. No hace falta escribirlo entero: con «mecha» aparecen todas las mechas.</p>
        <Captura captura="buscar" alt="El buscador con la palabra mecha y las mechas encontradas" numero="2.2" pie="Buscando «mecha»." />
      </Paso>
      <Paso numero={2} titulo="Mirá el resultado"><p>Cada fila dice cuánto hay y a cuánto se vende.</p></Paso>
      <Paso numero={3} titulo={<>Para buscar otra cosa, apretá <Tecla>Esc</Tecla></>}><p>Borra lo que escribiste.</p></Paso>
      <Nota tipo="consejo"><b>¿No aparece?</b> Probá con menos palabras, o con el código del proveedor.</Nota>
      <Captura captura="sin-resultados" alt="El aviso de que no hay productos con esas palabras" numero="2.3" pie="Cuando no hay ninguno." />
    </>
  );
}

export function SeccionCatFiltros() {
  return (
    <>
      <Titulo id="cat-filtros">Filtrar por stock o marca</Titulo>
      <p>Para ver solo los que hay en el local, los que faltan, o los de una marca.</p>
      <Video nombre="filtros" etiqueta="se abre Filtros, se elige Con stock y la marca Stanley, y después se sacan los filtros" />
      <Paso numero={1} titulo={<>Hacé clic en <Boton>Filtros</Boton></>}>
        <p>Está a la derecha del buscador. Se abre un panel.</p>
        <Captura captura="filtros" alt="El panel de filtros abierto" numero="2.4" pie="El panel de filtros." />
      </Paso>
      <Paso numero={2} titulo="Elegí qué ver">
        <p><Boton>Con stock</Boton>: los que hay. <Boton>Sin stock</Boton>: los que faltan.</p>
        <p>Abajo, hacé clic en la marca. Para encontrarla rápido, escribí su nombre.</p>
      </Paso>
      <Paso numero={3} titulo="Cerrá el panel">
        <p>Apretá <Tecla>Esc</Tecla> o hacé clic afuera. La lista queda filtrada.</p>
        <Captura captura="filtros-puestos" alt="La lista con dos filtros puestos y el enlace Sacar filtros" numero="2.5" pie="Con filtros puestos." />
      </Paso>
      <Paso numero={4} titulo={<>Para ver todos, <Boton>Sacar filtros</Boton></>}><p>Vuelve a mostrar todos los productos.</p></Paso>
    </>
  );
}

export function SeccionCatPrecio() {
  return (
    <>
      <Titulo id="cat-precio">De dónde sale el precio</Titulo>
      <p>Cada número con un «?» se explica.</p>
      <Video nombre="precio" etiqueta="se hace clic en el signo de pregunta del precio y del costo" />
      <Paso numero={1} titulo="Hacé clic en el «?» al lado del precio">
        <p>Se abre la cuenta: el costo, el margen, el IVA y el redondeo.</p>
        <Captura captura="precio" alt="La explicación del precio de venta, paso por paso" numero="2.6" pie="De dónde sale el precio." />
      </Paso>
      <Paso numero={2} titulo={<>Hacé clic en <Boton>Entendido</Boton></>}><p>Se cierra.</p></Paso>
      <Nota tipo="consejo">El «?» del <b>costo</b> explica de dónde sale el costo: la lista del proveedor y sus descuentos.</Nota>
    </>
  );
}

export function SeccionCatMargen() {
  return (
    <>
      <Titulo id="cat-margen">Poner el margen</Titulo>
      <p>El margen es cuánto le sumás al costo. Ferrebress calcula el precio solo: costo, más margen, más IVA, redondeado.</p>
      <Nota tipo="importante">Arriba, la etiqueta <b>«sin margen»</b> dice cuántos productos todavía no tienen precio.</Nota>
      <Video nombre="margen" etiqueta="se busca un producto sin margen, se elige 100 %, después 50 % y después se escribe 120" />
      <Paso numero={1} titulo="Buscá el producto"><p>Si no tiene margen, en el precio dice «elegí un margen».</p></Paso>
      <Paso numero={2} titulo="Hacé clic en un porcentaje">
        <p>300, 200, 100, 50 o 25 %.</p>
        <Captura captura="margen" alt="Un producto sin margen, con los botones de porcentaje" numero="2.7" pie="Un producto sin margen." />
      </Paso>
      <Paso numero={3} titulo="Listo">
        <p>El precio cambia al instante y queda guardado para todos.</p>
        <Captura captura="margen-listo" alt="El mismo producto con el margen de 100 % y su precio" numero="2.8" pie="Con margen y precio." />
      </Paso>
      <Nota tipo="consejo"><b>¿Otro porcentaje?</b> Escribilo en la caja «otro» y apretá <Tecla>Enter</Tecla>. Con el teclado: elegí la fila con las flechas y apretá <Tecla>Mayús</Tecla> + <Tecla>1</Tecla> a <Tecla>5</Tecla>.</Nota>
    </>
  );
}

export function SeccionCatProveedor() {
  return (
    <>
      <Titulo id="cat-proveedor">Usar el costo de otro proveedor</Titulo>
      <p>Si varios proveedores venden el mismo producto, la fila muestra lo que cobra cada uno.</p>
      <Video nombre="proveedor" etiqueta="se busca un producto con dos proveedores y se usa el costo del otro" />
      <Paso numero={1} titulo="Mirá quién cobra menos">
        <p>El que cobra menos dice «el más barato». El que se usa hoy dice «en uso».</p>
        <Captura captura="proveedores" alt="Los proveedores de un producto, con el más barato y el botón Usar" numero="2.9" pie="Dos proveedores para el mismo producto." ancho={420} />
      </Paso>
      <Paso numero={2} titulo={<>Hacé clic en <Boton>Usar</Boton></>}><p>El costo y el precio de venta pasan a ser los de ese proveedor.</p></Paso>
    </>
  );
}
