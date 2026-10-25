import { irA } from "../base/rutas";
import { Boton, Vacio } from "../base/ui";

// Sin stock todavía: cómo se carga, registrando un ingreso o contando un sector.
export function InventarioVacio() {
  return (
    <Vacio icono="stock" titulo="Todavía no hay stock cargado" accion={
      <div className="stock-primeros-pasos">
        <Boton variante="principal" icono="compras" onClick={() => irA("ingreso")}>Registrar un ingreso</Boton>
        <Boton icono="contar" onClick={() => irA("contar")}>Contar un sector</Boton>
      </div>
    }>El stock arranca en cero. Se carga registrando la mercadería que llega o contando lo que ya hay en cada estantería.</Vacio>
  );
}
