import MARCAS from "../manual-catalogo-marcas.json";
import type { ReactNode } from "react";
import { Boton, Clip, Figura, Nota, Paso, Tarjetas, Tecla, Titulo, type Dispositivo } from "./piezas";

// El capítulo «Catálogo: los productos» en la computadora (012-T012, maqueta manual-catalogo.html):
// todo lo que se hace en la pantalla Productos, para el empleado de mostrador. Las capturas y los
// clips los arma tests/capturas/tutorial/catalogo.py. Las capturas de una parte de la pantalla están
// al doble de resolución; «agregar» y «escanear» son la pantalla entera.
type Captura = keyof typeof MARCAS;
const Captura = (p: { captura: Captura; alt: string; numero: string; pie: string; ancho?: number }) =>
  <Figura carpeta="catalogo" marcas={MARCAS[p.captura]} doble={p.captura !== "agregar" && p.captura !== "escanear"} {...p} />;
const Video = ({ nombre, etiqueta, children }: { nombre: string; etiqueta: string; children?: ReactNode }) => (
  <Clip carpeta="catalogo" nombre={`clip-${nombre}`} testId={`manual-clip-cat-${nombre}`} etiqueta={`Clip: ${etiqueta}`}>
    <b>Mirá cómo se hace.</b>{children ? <> {children}</> : null}
  </Clip>
);

export const SECCIONES_DE_CATALOGO: { id: string; nombre: string; de: Dispositivo }[] = [
  { id: "cat-que", nombre: "¿Qué querés hacer?", de: "compu" },
  { id: "cat-pantalla", nombre: "La pantalla", de: "compu" },
  { id: "cat-buscar", nombre: "Buscar un producto", de: "compu" },
  { id: "cat-filtros", nombre: "Filtrar por stock o marca", de: "compu" },
  { id: "cat-precio", nombre: "De dónde sale el precio", de: "compu" },
  { id: "cat-margen", nombre: "Poner el margen", de: "compu" },
  { id: "cat-proveedor", nombre: "Usar otro proveedor", de: "compu" },
  { id: "cat-lista", nombre: "Bajar la lista", de: "compu" },
  { id: "cat-foto", nombre: "Sacarle una foto", de: "compu" },
  { id: "cat-agregar", nombre: "Agregar a la venta", de: "compu" },
  { id: "cat-ficha", nombre: "La ficha del producto", de: "compu" },
  { id: "cat-codigo", nombre: "Cargar el código de barras", de: "compu" },
  { id: "cat-escanear", nombre: "Buscar escaneando", de: "compu" },
  { id: "cat-teclado", nombre: "Con el teclado", de: "compu" },
  { id: "cat-problemas", nombre: "Si algo no funciona", de: "compu" },
];

const TAREAS = [
  { id: "cat-buscar", nombre: "Buscar", detalle: "Un producto, por nombre, marca o código." },
  { id: "cat-filtros", nombre: "Filtrar", detalle: "Ver solo los que hay, los que faltan o una marca." },
  { id: "cat-precio", nombre: "Ver el precio", detalle: "De dónde sale cada número." },
  { id: "cat-margen", nombre: "Poner el margen", detalle: "Cuánto le ganás. El precio se calcula solo." },
  { id: "cat-proveedor", nombre: "Cambiar de proveedor", detalle: "Tomar el costo del que cobra menos." },
  { id: "cat-lista", nombre: "Bajar la lista", detalle: "El Excel que mandó el proveedor." },
  { id: "cat-foto", nombre: "Sacarle una foto", detalle: "Con el celular o desde un archivo." },
  { id: "cat-agregar", nombre: "Agregar a la venta", detalle: "Sin ir a Vender." },
  { id: "cat-ficha", nombre: "Abrir la ficha", detalle: "Todo el producto en un solo lugar." },
  { id: "cat-codigo", nombre: "Cargar el código", detalle: "Para encontrarlo escaneándolo." },
  { id: "cat-escanear", nombre: "Buscar escaneando", detalle: "Con el celular vinculado." },
  { id: "cat-teclado", nombre: "Usar el teclado", detalle: "Todo sin mouse." },
];

export function CapituloCatalogo() {
  return (
    <>
      <p className="manual-capitulo">Capítulo 2</p>
      <h1>Catálogo: los productos</h1>
      <p className="manual-entrada">En Productos encontrás cualquier artículo del local: cuánto hay, cuánto cuesta y a cuánto se vende. También le ponés el margen, le sacás una foto y lo agregás a la venta.</p>
      <Nota tipo="importante"><b>Para llegar:</b> hacé clic en <Boton>Catálogo</Boton>, en el menú de la izquierda (o apretá <Tecla>Alt</Tecla> + <Tecla>1</Tecla>). Se abre en <b>Productos</b>.</Nota>

      <Titulo id="cat-que">¿Qué querés hacer?</Titulo>
      <p>Tocá una para ir directo.</p>
      <Tarjetas tarjetas={TAREAS} testId="manual-tareas" />

      <Titulo id="cat-pantalla">La pantalla</Titulo>
      <p>Cada fila es un producto. Arriba, el buscador; en cada fila, cuánto hay, el costo, el margen y el precio.</p>
      <Captura captura="pantalla" alt="La pantalla Productos, con el buscador y la lista de productos" numero="2.1" pie="Productos, en la computadora." />

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

      <Titulo id="cat-precio">De dónde sale el precio</Titulo>
      <p>Cada número con un «?» se explica.</p>
      <Video nombre="precio" etiqueta="se hace clic en el signo de pregunta del precio y del costo" />
      <Paso numero={1} titulo="Hacé clic en el «?» al lado del precio">
        <p>Se abre la cuenta: el costo, el margen, el IVA y el redondeo.</p>
        <Captura captura="precio" alt="La explicación del precio de venta, paso por paso" numero="2.6" pie="De dónde sale el precio." />
      </Paso>
      <Paso numero={2} titulo={<>Hacé clic en <Boton>Entendido</Boton></>}><p>Se cierra.</p></Paso>
      <Nota tipo="consejo">El «?» del <b>costo</b> explica de dónde sale el costo: la lista del proveedor y sus descuentos.</Nota>

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

      <Titulo id="cat-proveedor">Usar el costo de otro proveedor</Titulo>
      <p>Si varios proveedores venden el mismo producto, la fila muestra lo que cobra cada uno.</p>
      <Video nombre="proveedor" etiqueta="se busca un producto con dos proveedores y se usa el costo del otro" />
      <Paso numero={1} titulo="Mirá quién cobra menos">
        <p>El que cobra menos dice «el más barato». El que se usa hoy dice «en uso».</p>
        <Captura captura="proveedores" alt="Los proveedores de un producto, con el más barato y el botón Usar" numero="2.9" pie="Dos proveedores para el mismo producto." ancho={420} />
      </Paso>
      <Paso numero={2} titulo={<>Hacé clic en <Boton>Usar</Boton></>}><p>El costo y el precio de venta pasan a ser los de ese proveedor.</p></Paso>

      <Titulo id="cat-lista">Bajar la lista del proveedor</Titulo>
      <p>Para ver la lista de precios original, la que mandó el proveedor.</p>
      <Paso numero={1} titulo={<>Hacé clic en <Boton>lista del …</Boton></>}><p>Está debajo del nombre del proveedor (el 1 de la figura 2.9). Se baja el Excel, tal cual llegó.</p></Paso>
      <Nota tipo="consejo">En la ficha del producto está lo mismo, en <b>Archivo de origen</b>: <Boton>Descargar Excel</Boton>.</Nota>

      <Titulo id="cat-foto">Sacarle una foto</Titulo>
      <p>Con foto, el producto se reconoce de un vistazo, también al vender.</p>
      <Video nombre="foto" etiqueta="se abre la foto de un producto, se pide con el celular y la foto aparece sola">El celular no aparece en el clip.</Video>
      <Paso numero={1} titulo="Hacé clic en el cuadrito de la foto">
        <p>Está a la izquierda de cada producto.</p>
        <Captura captura="foto-chica" alt="Dos productos: uno con foto y otro sin foto" numero="2.10" pie="Con foto y sin foto." />
      </Paso>
      <Paso numero={2} titulo="Elegí cómo">
        <p><Boton>Sacar la foto con el celular</Boton>: aparece un código. <Boton>Elegir un archivo</Boton>: una foto que ya está en la computadora.</p>
        <Captura captura="foto-grande" alt="La foto grande, con los botones para sacarla" numero="2.11" pie="Para sacarle la foto." />
      </Paso>
      <Paso numero={3} titulo="Apuntá el celular al código">
        <p>Abrí la cámara del celular, apuntá al código, tocá el enlace y sacá la foto. En unos segundos aparece sola en la computadora.</p>
        <Captura captura="foto-qr" alt="El código para sacar la foto con el celular" numero="2.12" pie="El código para el celular." />
      </Paso>

      <Titulo id="cat-agregar">Agregar a la venta</Titulo>
      <p>Si el cliente lo lleva, agregalo desde acá. No hace falta ir a Vender para buscarlo.</p>
      <Video nombre="agregar" etiqueta="se agregan dos productos y se va a Vender, donde están" />
      <Paso numero={1} titulo={<>Hacé clic en <Boton>Agregar</Boton></>}>
        <p>Entra con cantidad 1. Si ya estaba, suma uno. Entra aunque no haya stock.</p>
        <Captura captura="agregar" alt="El botón Agregar y el aviso de que se agregó" numero="2.13" pie="Agregado a la venta." />
      </Paso>
      <Paso numero={2} titulo="Cobrá en Vender"><p>Cuando termines, hacé clic en <Boton>Vender</Boton>, a la izquierda. Los productos están ahí.</p></Paso>
      <Nota tipo="consejo">Con el teclado: elegí la fila con las flechas y apretá <Tecla>+</Tecla>.</Nota>

      <Titulo id="cat-ficha">La ficha del producto</Titulo>
      <p>Todo de un producto en un solo lugar: foto, stock, código, proveedor y precio.</p>
      <Video nombre="ficha" etiqueta="se abre la ficha de un producto, se mira la cuenta del precio y los proveedores, y se cierra" />
      <Paso numero={1} titulo={<>Hacé clic en la fila y apretá <Tecla>Enter</Tecla></>}>
        <p>La fila elegida queda marcada en verde.</p>
        <Captura captura="ficha-abrir" alt="Un producto elegido en la lista" numero="2.14" pie="El producto elegido." />
      </Paso>
      <Paso numero={2} titulo="Mirá la ficha">
        <p>Cada parte se explica abajo de la figura.</p>
        <Captura captura="ficha" alt="La ficha del producto" numero="2.15" pie="La ficha." />
      </Paso>
      <Paso numero={3} titulo={<>Para ver la cuenta, <Boton>Así se calcula</Boton></>}>
        <p>Muestra cómo se llega al precio.</p>
        <Captura captura="ficha-calculo" alt="La cuenta del precio en la ficha" numero="2.16" pie="Así se calcula." />
      </Paso>
      <Paso numero={4} titulo="Para ver los otros proveedores, hacé clic en el proveedor">
        <p>Se ven los otros y lo que cobran. <Boton>Usar</Boton> toma el costo de ese.</p>
        <Captura captura="ficha-proveedores" alt="Los otros proveedores en la ficha" numero="2.17" pie="Los otros proveedores." />
      </Paso>
      <Paso numero={5} titulo={<>Cerrá con <Boton>Listo</Boton></>}><p>O apretá <Tecla>Esc</Tecla>.</p></Paso>

      <Titulo id="cat-codigo">Cargar el código de barras</Titulo>
      <p>Con el código cargado, el producto se encuentra escaneándolo, en Vender y en todo Ferrebress.</p>
      <Video nombre="codigo" etiqueta="en la ficha se escribe el código de barras, se guarda y se copia" />
      <Paso numero={1} titulo={<>En la ficha, hacé clic en <Boton>Cargar el código</Boton></>}><p>Si ya tiene uno, dice <Boton>Cambiar el código</Boton>.</p></Paso>
      <Paso numero={2} titulo="Escribí el número y guardá">
        <p>El número que está debajo de las barras. Después, <Boton>Guardar el código</Boton>.</p>
        <Captura captura="codigo-tipear" alt="La caja para escribir el código de barras" numero="2.18" pie="Escribiendo el código." />
      </Paso>
      <Paso numero={3} titulo="Listo">
        <p>El código queda guardado y dice «Código actualizado». El botón de al lado lo copia.</p>
        <Captura captura="codigo-listo" alt="El código guardado, con el botón para copiarlo" numero="2.19" pie="El código, guardado." />
      </Paso>
      <Nota tipo="consejo"><b>Con el celular vinculado</b> no hace falta escribirlo: escanealo con el celular y queda cargado solo.</Nota>
      <Nota tipo="importante">Si otro producto ya tiene ese código, Ferrebress avisa. Si son el mismo artículo, unilos en <b>Catálogo → Duplicados</b>.</Nota>

      <Titulo id="cat-escanear">Buscar escaneando con el celular</Titulo>
      <p>Si la computadora tiene el celular vinculado (capítulo 1), escaneás el producto con el celular y la computadora abre su ficha.</p>
      <Video nombre="escanear" etiqueta="el celular escanea un producto y la computadora abre su ficha">El celular no aparece en el clip.</Video>
      <Paso numero={1} titulo="En el celular, abrí el lector"><p>En Vender, tocá <Boton>Usar este celular como lector de la computadora</Boton>.</p></Paso>
      <Paso numero={2} titulo="Apuntá al código de barras">
        <p>La computadora abre la ficha de ese producto.</p>
        <Captura captura="escanear" alt="La computadora con la ficha del producto escaneado" numero="2.20" pie="La ficha, abierta sola." />
      </Paso>
      <Nota tipo="consejo">Si ningún producto tiene ese código, queda escrito en el buscador.</Nota>

      <Titulo id="cat-teclado">Con el teclado</Titulo>
      <p>Todo se puede hacer sin mouse. Las teclas están escritas debajo del buscador.</p>
      <table className="manual-problemas">
        <thead><tr><th>Tecla</th><th>Qué hace</th></tr></thead>
        <tbody>
          <tr><td><Tecla>↑</Tecla> <Tecla>↓</Tecla></td><td>Eligen un producto de la lista.</td></tr>
          <tr><td><Tecla>Enter</Tecla></td><td>Abre la ficha del elegido.</td></tr>
          <tr><td><Tecla>Esc</Tecla></td><td>Borra la búsqueda. En la ficha, la cierra.</td></tr>
          <tr><td><Tecla>Mayús</Tecla> + <Tecla>1</Tecla> a <Tecla>5</Tecla></td><td>Ponen el margen del elegido: 300, 200, 100, 50 o 25 %.</td></tr>
          <tr><td><Tecla>+</Tecla></td><td>Agrega el elegido a la venta.</td></tr>
          <tr><td><Tecla>←</Tecla> <Tecla>→</Tecla></td><td>En la ficha, recorren los márgenes; <Tecla>Enter</Tecla> elige.</td></tr>
        </tbody>
      </table>

      <Titulo id="cat-problemas">Si algo no funciona</Titulo>
      <table className="manual-problemas">
        <thead><tr><th>Qué pasa</th><th>Qué hacer</th></tr></thead>
        <tbody>
          <tr><td>Dice «Bajando el catálogo…»</td><td>Es la primera vez en esa computadora. Esperá: después busca al instante, también sin internet.</td></tr>
          <tr><td>Dice «Nada con …»</td><td>Probá con menos palabras, o con el código del proveedor.</td></tr>
          <tr><td>Dice que ningún producto cumple los filtros</td><td>Hacé clic en «Sacar filtros».</td></tr>
          <tr><td>El precio dice «elegí un margen»</td><td>Ese producto no tiene margen. Ponele uno.</td></tr>
          <tr><td>Dice «sin costo»</td><td>Ningún proveedor lo tiene en su lista. Cargá una lista que lo traiga, en <b>Catálogo → Listas</b>.</td></tr>
          <tr><td>Dice «No se pudo guardar el cambio»</td><td>Revisá que haya internet y probá de nuevo.</td></tr>
          <tr><td>Dice «Todavía no hay productos»</td><td>Los productos entran al cargar la lista de un proveedor: «Cargar una lista de precios».</td></tr>
          <tr><td>No veo el costo, o no puedo cambiar el margen</td><td>Tu rol no lo permite. Pedíselo a un Administrador, en <b>Más → Usuarios</b>.</td></tr>
        </tbody>
      </table>
      <Captura captura="sin-permisos" alt="La lista vista por alguien que no puede ver costos ni cambiar márgenes" numero="2.21" pie="Sin permiso para costos ni márgenes." />
    </>
  );
}
