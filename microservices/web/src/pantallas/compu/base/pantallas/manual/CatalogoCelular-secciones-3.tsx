import { Boton, Paso, Titulo } from "./piezas";
import { Captura } from "./CatalogoCelular-piezas";

// Secciones del capítulo de CatalogoCelular.tsx.
export function SeccionCatLista() {
  return (
    <>
      <Titulo id="cat-lista">Bajar la lista del proveedor</Titulo>
      <Paso numero={1} titulo={<>En la ficha, bajá y tocá <Boton>Descargar Excel</Boton></>} celular={
        <Captura captura="lista" alt="El archivo de origen al final de la ficha" numero="2.18" pie="Archivo de origen." />
      }>
        <p>Está en «Archivo de origen». Se baja el Excel que mandó el proveedor, tal cual llegó.</p>
      </Paso>
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
