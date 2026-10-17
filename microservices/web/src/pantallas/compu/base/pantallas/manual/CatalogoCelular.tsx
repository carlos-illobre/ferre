import type { ReactNode } from "react";
import MARCAS from "../manual-catalogo-celular-marcas.json";
import { Boton, Clip, Figura, Nota, Paso, Tarjetas, Titulo, type Dispositivo } from "./piezas";

// El capítulo «Catálogo: los productos» en el celular (012-T014, maqueta manual-catalogo-celular.html):
// Catálogo → Productos del teléfono, para el empleado de mostrador. En el teléfono casi todo se hace
// desde la ficha del producto, así que el orden no es el de la computadora. Las capturas y los clips
// los arma tests/capturas/tutorial/catalogo_celular.py; las capturas van al lado del paso, como en «Entrar».
type Captura = keyof typeof MARCAS;
const Captura = (p: { captura: Captura; alt: string; numero: string; pie: string }) =>
  <Figura carpeta="catalogo-celular" marcas={MARCAS[p.captura]} celular {...p} />;
const Video = ({ nombre, etiqueta, children }: { nombre: string; etiqueta: string; children?: ReactNode }) => (
  <Clip carpeta="catalogo-celular" nombre={`clip-${nombre}`} testId={`manual-clip-celu-${nombre}`} etiqueta={`Clip: ${etiqueta}`} celular>
    <b>Mirá cómo se hace.</b>{children ? <> {children}</> : null}
  </Clip>
);

export const SECCIONES_DE_CATALOGO_CELULAR: { id: string; nombre: string; de: Dispositivo }[] = [
  { id: "cat-que", nombre: "¿Qué querés hacer?", de: "celu" },
  { id: "cat-pantalla", nombre: "La pantalla", de: "celu" },
  { id: "cat-buscar", nombre: "Buscar un producto", de: "celu" },
  { id: "cat-escanear", nombre: "Buscar escaneando", de: "celu" },
  { id: "cat-filtros", nombre: "Filtrar por stock o marca", de: "celu" },
  { id: "cat-agregar", nombre: "Agregar a la venta", de: "celu" },
  { id: "cat-ficha", nombre: "La ficha del producto", de: "celu" },
  { id: "cat-margen", nombre: "Poner el margen", de: "celu" },
  { id: "cat-precio", nombre: "De dónde sale el precio", de: "celu" },
  { id: "cat-proveedor", nombre: "Usar otro proveedor", de: "celu" },
  { id: "cat-codigo", nombre: "Cargar el código de barras", de: "celu" },
  { id: "cat-foto", nombre: "Sacarle una foto", de: "celu" },
  { id: "cat-lista", nombre: "Bajar la lista", de: "celu" },
  { id: "cat-problemas", nombre: "Si algo no funciona", de: "celu" },
];

const TAREAS = [
  { id: "cat-buscar", nombre: "Buscar", detalle: "Un producto, por nombre, marca o código." },
  { id: "cat-escanear", nombre: "Buscar escaneando", detalle: "Con la cámara, apuntando al código de barras." },
  { id: "cat-filtros", nombre: "Filtrar", detalle: "Ver solo los que hay, los que faltan o una marca." },
  { id: "cat-agregar", nombre: "Agregar a la venta", detalle: "Sin ir a Vender." },
  { id: "cat-ficha", nombre: "Abrir la ficha", detalle: "Todo el producto en un solo lugar." },
  { id: "cat-margen", nombre: "Poner el margen", detalle: "Cuánto le ganás. El precio se calcula solo." },
  { id: "cat-precio", nombre: "Ver el precio", detalle: "De dónde sale cada número." },
  { id: "cat-proveedor", nombre: "Cambiar de proveedor", detalle: "Tomar el costo del que cobra menos." },
  { id: "cat-codigo", nombre: "Cargar el código", detalle: "Escaneándolo con la cámara." },
  { id: "cat-foto", nombre: "Sacarle una foto", detalle: "Con la cámara del celular." },
  { id: "cat-lista", nombre: "Bajar la lista", detalle: "El Excel que mandó el proveedor." },
];

export function CapituloCatalogoCelular() {
  return (
    <>
      <p className="manual-capitulo">Capítulo 2</p>
      <h1>Catálogo: los productos</h1>
      <p className="manual-entrada">En el celular buscás cualquier artículo del local: cuánto hay y a cuánto se vende. Lo encontrás escaneándolo con la cámara, le ponés el margen, le sacás una foto y lo agregás a la venta.</p>
      <Nota tipo="importante"><b>Para llegar:</b> tocá <Boton>Catálogo</Boton>, abajo a la izquierda. Se abre en <b>Productos</b>.</Nota>

      <Titulo id="cat-que">¿Qué querés hacer?</Titulo>
      <p>Tocá una para ir directo.</p>
      <Tarjetas tarjetas={TAREAS} testId="manual-tareas" />

      <Titulo id="cat-pantalla">La pantalla</Titulo>
      <Paso numero={1} titulo="Cada tarjeta es un producto" celular={
        <Captura captura="pantalla" alt="El Catálogo del celular, con el buscador y las tarjetas de los productos" numero="2.1" pie="Catálogo, en el celular." />
      }>
        <p>Arriba, cuánto hay. A la derecha, el precio de venta y el margen. Abajo, la marca, el proveedor y el costo.</p>
        <p>Arriba de todo, el buscador, el botón para escanear y los filtros.</p>
      </Paso>

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

      <Titulo id="cat-agregar">Agregar a la venta</Titulo>
      <p>Si el cliente lo lleva, agregalo desde acá.</p>
      <Video nombre="agregar" etiqueta="se agregan dos productos y se va a Vender, donde están" />
      <Paso numero={1} titulo={<>Tocá <Boton>Agregar</Boton></>} celular={
        <Captura captura="agregar" alt="El botón Agregar y el aviso de que se agregó" numero="2.7" pie="Agregado a la venta." />
      }>
        <p>Entra con cantidad 1. Si ya estaba, suma uno. Entra aunque no haya stock.</p>
      </Paso>
      <Paso numero={2} titulo="Cobrá en Vender"><p>Tocá <Boton>Vender</Boton>, abajo. El número sobre Vender dice cuántos productos lleva la venta.</p></Paso>

      <Titulo id="cat-ficha">La ficha del producto</Titulo>
      <p>Todo de un producto en un solo lugar: foto, stock, código, proveedor y precio.</p>
      <Video nombre="ficha" etiqueta="se abre la ficha de un producto, se mira el proveedor, la cuenta del precio y la lista, y se cierra" />
      <Paso numero={1} titulo="Tocá el producto"><p>La ficha sube desde abajo.</p></Paso>
      <Paso numero={2} titulo="Mirá la ficha" celular={
        <Captura captura="ficha" alt="La ficha del producto en el celular" numero="2.8" pie="La ficha." />
      }>
        <p>Arriba, la foto, cuánto hay y el nombre. Después, el código, el proveedor y el precio. Bajá para ver el resto.</p>
      </Paso>
      <Paso numero={3} titulo={<>Cerrá con <Boton>Listo</Boton></>}><p>Está abajo de todo, siempre a la vista.</p></Paso>

      <Titulo id="cat-margen">Poner el margen</Titulo>
      <p>El margen es cuánto le sumás al costo. Ferrebress calcula el precio solo: costo, más margen, más IVA, redondeado.</p>
      <Video nombre="margen" etiqueta="se abre un producto sin margen, se elige 100 % y después 50 %" />
      <Paso numero={1} titulo="Buscá el producto" celular={
        <Captura captura="sin-margen" alt="Un producto sin margen en la lista" numero="2.9" pie="Sin margen." />
      }>
        <p>Si no tiene margen, la tarjeta dice «sin margen».</p>
      </Paso>
      <Paso numero={2} titulo="Abrí la ficha y tocá un porcentaje" celular={
        <Captura captura="margen" alt="La ficha de un producto sin margen, con los porcentajes" numero="2.10" pie="Para elegir el margen." />
      }>
        <p>300, 200, 100, 50 o 25 %.</p>
      </Paso>
      <Paso numero={3} titulo="Listo" celular={
        <Captura captura="margen-listo" alt="La ficha con el margen de 100 % y su precio" numero="2.11" pie="Con margen y precio." />
      }>
        <p>El precio cambia al instante y queda guardado para todos.</p>
      </Paso>
      <Nota tipo="consejo"><b>¿Otro porcentaje?</b> Escribilo en «Otro margen» y tocá Listo en el teclado.</Nota>

      <Titulo id="cat-precio">De dónde sale el precio</Titulo>
      <Paso numero={1} titulo={<>En la ficha, tocá <Boton>Así se calcula</Boton></>} celular={
        <Captura captura="ficha-calculo" alt="La cuenta del precio en la ficha" numero="2.12" pie="Así se calcula." />
      }>
        <p>Se abre la cuenta: el costo, el margen, el IVA y el redondeo. Tocalo otra vez para cerrarla.</p>
      </Paso>

      <Titulo id="cat-proveedor">Usar el costo de otro proveedor</Titulo>
      <p>Si varios proveedores venden el mismo producto, la ficha muestra lo que cobra cada uno.</p>
      <Paso numero={1} titulo="En la ficha, tocá el proveedor" celular={
        <Captura captura="ficha-proveedores" alt="Los otros proveedores en la ficha" numero="2.13" pie="Los otros proveedores." />
      }>
        <p>Aparecen los otros, con lo que cobran. La estrella marca al más barato.</p>
      </Paso>
      <Paso numero={2} titulo={<>Tocá <Boton>Usar</Boton></>}><p>El costo y el precio de venta pasan a ser los de ese proveedor.</p></Paso>

      <Titulo id="cat-codigo">Cargar el código de barras</Titulo>
      <p>Con el código cargado, el producto se encuentra escaneándolo, en el Catálogo y en Vender.</p>
      <Video nombre="codigo" etiqueta="en la ficha se toca Escanear código, la cámara lo lee y queda guardado" />
      <Paso numero={1} titulo={<>En la ficha, tocá <Boton>Escanear código</Boton></>} celular={
        <Captura captura="codigo" alt="La ficha con el botón Escanear código" numero="2.14" pie="Escanear código." />
      }>
        <p>Se abre la cámara.</p>
      </Paso>
      <Paso numero={2} titulo="Apuntá al código de barras"><p>Como en la figura 2.3. Si no lo lee, tipeá el número abajo y tocá Enter.</p></Paso>
      <Paso numero={3} titulo="Listo" celular={
        <Captura captura="codigo-listo" alt="El código guardado, con el botón para copiarlo" numero="2.15" pie="El código, guardado." />
      }>
        <p>Dice «Código actualizado». El botón de al lado lo copia.</p>
      </Paso>
      <Nota tipo="importante">Si otro producto ya tiene ese código, Ferrebress avisa. Si son el mismo artículo, unilos en <b>Catálogo → Duplicados</b>.</Nota>

      <Titulo id="cat-foto">Sacarle una foto</Titulo>
      <p>Con foto, el producto se reconoce de un vistazo, también al vender.</p>
      <Video nombre="foto" etiqueta="en la ficha se toca Sacar foto y la foto aparece">La cámara del teléfono no aparece en el clip.</Video>
      <Paso numero={1} titulo={<>En la ficha, tocá <Boton>Sacar foto</Boton></>} celular={
        <Captura captura="foto" alt="La ficha con el botón Sacar foto" numero="2.16" pie="Sacar foto." />
      }>
        <p>Se abre la cámara del teléfono.</p>
      </Paso>
      <Paso numero={2} titulo="Sacá la foto"><p>Como cualquier foto. Después tocá «Usar foto» (o el tilde).</p></Paso>
      <Paso numero={3} titulo="Listo" celular={
        <Captura captura="foto-lista" alt="La ficha con la foto nueva" numero="2.17" pie="Con foto." />
      }>
        <p>La foto queda en el producto. <Boton>Cambiar foto</Boton> saca otra.</p>
      </Paso>

      <Titulo id="cat-lista">Bajar la lista del proveedor</Titulo>
      <Paso numero={1} titulo={<>En la ficha, bajá y tocá <Boton>Descargar Excel</Boton></>} celular={
        <Captura captura="lista" alt="El archivo de origen al final de la ficha" numero="2.18" pie="Archivo de origen." />
      }>
        <p>Está en «Archivo de origen». Se baja el Excel que mandó el proveedor, tal cual llegó.</p>
      </Paso>

      <Titulo id="cat-problemas">Si algo no funciona</Titulo>
      <table className="manual-problemas">
        <thead><tr><th>Qué pasa</th><th>Qué hacer</th></tr></thead>
        <tbody>
          <tr><td>Dice «Bajando el catálogo…»</td><td>Es la primera vez en ese celular. Esperá: después busca al instante, también sin internet.</td></tr>
          <tr><td>Dice «Nada con …»</td><td>Probá con menos palabras, o con el código del proveedor.</td></tr>
          <tr><td>Dice que ningún producto cumple los filtros</td><td>Tocá «Sacar filtros».</td></tr>
          <tr><td>Dice «No se pudo abrir la cámara»</td><td>El celular no le dio permiso a Ferrebress. Permitilo en los ajustes del navegador, o tipeá el código.</td></tr>
          <tr><td>Dice «Ningún producto tiene el código …»</td><td>Buscá el producto por su nombre, abrí la ficha y cargale el código.</td></tr>
          <tr><td>Dice «sin margen» o «elegí un margen»</td><td>Ese producto no tiene margen. Ponele uno en la ficha.</td></tr>
          <tr><td>Dice «sin costo»</td><td>Ningún proveedor lo tiene en su lista. Cargá una lista que lo traiga, en <b>Catálogo → Listas</b>.</td></tr>
          <tr><td>Dice «No se pudo guardar»</td><td>Revisá que haya internet y probá de nuevo.</td></tr>
          <tr><td>Dice «Todavía no hay productos»</td><td>Los productos entran al cargar la lista de un proveedor.</td></tr>
          <tr><td>No veo el costo, o no puedo cambiar el margen</td><td>Tu rol no lo permite. Pedíselo a un Administrador, en <b>Más → Usuarios</b>.</td></tr>
        </tbody>
      </table>
    </>
  );
}
