import { Boton, Nota, Paso, Titulo } from "./piezas";
import { Captura, Video } from "./CatalogoCelular-piezas";

// Secciones del capítulo de CatalogoCelular.tsx.
export function SeccionCatFicha() {
  return (
    <>
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
    </>
  );
}

export function SeccionCatMargen() {
  return (
    <>
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
    </>
  );
}

export function SeccionCatPrecio() {
  return (
    <>
      <Titulo id="cat-precio">De dónde sale el precio</Titulo>
      <Paso numero={1} titulo={<>En la ficha, tocá <Boton>Así se calcula</Boton></>} celular={
        <Captura captura="ficha-calculo" alt="La cuenta del precio en la ficha" numero="2.12" pie="Así se calcula." />
      }>
        <p>Se abre la cuenta: el costo, el margen, el IVA y el redondeo. Tocalo otra vez para cerrarla.</p>
      </Paso>
    </>
  );
}

export function SeccionCatProveedor() {
  return (
    <>
      <Titulo id="cat-proveedor">Usar el costo de otro proveedor</Titulo>
      <p>Si varios proveedores venden el mismo producto, la ficha muestra lo que cobra cada uno.</p>
      <Paso numero={1} titulo="En la ficha, tocá el proveedor" celular={
        <Captura captura="ficha-proveedores" alt="Los otros proveedores en la ficha" numero="2.13" pie="Los otros proveedores." />
      }>
        <p>Aparecen los otros, con lo que cobran. La estrella marca al más barato.</p>
      </Paso>
      <Paso numero={2} titulo={<>Tocá <Boton>Usar</Boton></>}><p>El costo y el precio de venta pasan a ser los de ese proveedor.</p></Paso>
    </>
  );
}

export function SeccionCatCodigo() {
  return (
    <>
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
    </>
  );
}

export function SeccionCatFoto() {
  return (
    <>
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
    </>
  );
}
