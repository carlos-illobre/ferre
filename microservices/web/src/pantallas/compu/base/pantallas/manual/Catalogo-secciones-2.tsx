import { Boton, Nota, Paso, Tecla, Titulo } from "./piezas";
import { Captura, Video } from "./Catalogo-piezas";

// Secciones del capítulo de Catalogo.tsx.
export function SeccionCatLista() {
  return (
    <>
      <Titulo id="cat-lista">Bajar la lista del proveedor</Titulo>
      <p>Para ver la lista de precios original, la que mandó el proveedor.</p>
      <Paso numero={1} titulo={<>Hacé clic en <Boton>lista del …</Boton></>}><p>Está debajo del nombre del proveedor (el 1 de la figura 2.9). Se baja el Excel, tal cual llegó.</p></Paso>
      <Nota tipo="consejo">En la ficha del producto está lo mismo, en <b>Archivo de origen</b>: <Boton>Descargar Excel</Boton>.</Nota>
    </>
  );
}

export function SeccionCatFoto() {
  return (
    <>
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
    </>
  );
}

export function SeccionCatAgregar() {
  return (
    <>
      <Titulo id="cat-agregar">Agregar a la venta</Titulo>
      <p>Si el cliente lo lleva, agregalo desde acá. No hace falta ir a Vender para buscarlo.</p>
      <Video nombre="agregar" etiqueta="se agregan dos productos y se va a Vender, donde están" />
      <Paso numero={1} titulo={<>Hacé clic en <Boton>Agregar</Boton></>}>
        <p>Entra con cantidad 1. Si ya estaba, suma uno. Entra aunque no haya stock.</p>
        <Captura captura="agregar" alt="El botón Agregar y el aviso de que se agregó" numero="2.13" pie="Agregado a la venta." />
      </Paso>
      <Paso numero={2} titulo="Cobrá en Vender"><p>Cuando termines, hacé clic en <Boton>Vender</Boton>, a la izquierda. Los productos están ahí.</p></Paso>
      <Nota tipo="consejo">Con el teclado: elegí la fila con las flechas y apretá <Tecla>+</Tecla>.</Nota>
    </>
  );
}

export function SeccionCatFicha() {
  return (
    <>
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
    </>
  );
}

export function SeccionCatCodigo() {
  return (
    <>
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
    </>
  );
}

export function SeccionCatEscanear() {
  return (
    <>
      <Titulo id="cat-escanear">Buscar escaneando con el celular</Titulo>
      <p>Si la computadora tiene el celular vinculado (capítulo 1), escaneás el producto con el celular y la computadora abre su ficha.</p>
      <Video nombre="escanear" etiqueta="el celular escanea un producto y la computadora abre su ficha">El celular no aparece en el clip.</Video>
      <Paso numero={1} titulo="En el celular, abrí el lector"><p>En Vender, tocá <Boton>Usar este celular como lector de la computadora</Boton>.</p></Paso>
      <Paso numero={2} titulo="Apuntá al código de barras">
        <p>La computadora abre la ficha de ese producto.</p>
        <Captura captura="escanear" alt="La computadora con la ficha del producto escaneado" numero="2.20" pie="La ficha, abierta sola." />
      </Paso>
      <Nota tipo="consejo">Si ningún producto tiene ese código, queda escrito en el buscador.</Nota>
    </>
  );
}
