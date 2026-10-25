import { Tecla, Titulo } from "./piezas";
import { Captura } from "./Catalogo-piezas";

// Secciones del capítulo de Catalogo.tsx.
export function SeccionCatTeclado() {
  return (
    <>
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
    </>
  );
}

export function SeccionCatProblemas() {
  return (
    <>
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
