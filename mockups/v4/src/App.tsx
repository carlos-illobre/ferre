import { useEffect, type ComponentType } from "react";
import { Estructura } from "./estructura/Estructura";
import { AvisosFlotantes } from "./piezas";
import { useRuta } from "./ruta";
import Actividad from "./pantallas/Actividad";
import Contar from "./pantallas/Contar";
import Duplicados from "./pantallas/Duplicados";
import Entrar from "./pantallas/Entrar";
import Listas from "./pantallas/Listas";
import Mas from "./pantallas/Mas";
import Negocio from "./pantallas/Negocio";
import Productos from "./pantallas/Productos";
import Recibir from "./pantallas/Recibir";
import Stock from "./pantallas/Stock";
import Usuarios from "./pantallas/Usuarios";
import Vender from "./pantallas/Vender";
import VentasDelDia from "./pantallas/VentasDelDia";

// Una pantalla por dirección: #/vender, #/ventas, … Todas van dentro de la estructura
// (menú o pestañas), salvo «entrar».
const PANTALLAS: Record<string, ComponentType> = {
  vender: Vender,
  ventas: VentasDelDia,
  productos: Productos,
  recibir: Recibir,
  mas: Mas,
  listas: Listas,
  duplicados: Duplicados,
  stock: Stock,
  contar: Contar,
  negocio: Negocio,
  usuarios: Usuarios,
  actividad: Actividad,
};

export default function App() {
  const { camino } = useRuta();
  const Pantalla = PANTALLAS[camino];

  // Una dirección vacía o desconocida lleva a Entrar.
  useEffect(() => {
    if (!Pantalla && camino !== "entrar") window.location.replace("#/entrar");
  }, [Pantalla, camino]);

  return (
    <>
      {Pantalla ? <Estructura><Pantalla key={camino} /></Estructura> : <Entrar />}
      <AvisosFlotantes />
    </>
  );
}
