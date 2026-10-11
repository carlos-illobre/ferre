import { useEffect, useMemo, type ComponentType } from "react";
import { ProveedorDeSesion, useSesion } from "../sesion";
import { Estructura } from "./Estructura";
import { AvisosFlotantes } from "./piezas";
import { useRuta } from "./rutas";
import { ContextoDeUsuario, type UsuarioEnPantalla } from "./usuario";
import { Actividad } from "./pantallas/Actividad";
import { Contar } from "./pantallas/Contar";
import { Duplicados } from "./pantallas/Duplicados";
import { Entrar, PantallaDeCarga } from "./pantallas/Entrar";
import { Listas } from "./pantallas/Listas";
import { Mas } from "./pantallas/Mas";
import { Negocio } from "./pantallas/Negocio";
import { OfrecerHuella } from "./pantallas/OfrecerHuella";
import { Productos } from "./pantallas/Productos";
import { Recibir } from "./pantallas/Recibir";
import { Stock } from "./pantallas/Stock";
import { Usuarios } from "./pantallas/Usuarios";
import { Vender } from "./pantallas/Vender";
import { VentasDelDia } from "./pantallas/VentasDelDia";
import { VincularCelular } from "./pantallas/VincularCelular";

// Una pantalla por dirección: #/vender, #/ventas, … Todas van dentro de la estructura (menú o
// pestañas). Sin sesión, cualquier dirección muestra la entrada.
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

export function App() {
  return (
    <ProveedorDeSesion>
      <Pantallas />
      <AvisosFlotantes />
    </ProveedorDeSesion>
  );
}

function Pantallas() {
  const { sesion, salir } = useSesion();
  const { camino, parametros } = useRuta();
  const codigoDeVinculacion = camino === "vincular-celular" ? parametros.get("codigo") : null;
  const conSesion = sesion.estado === "con-sesion";
  const Pantalla = PANTALLAS[camino];

  // Una dirección vacía o desconocida lleva a Vender.
  useEffect(() => {
    if (conSesion && !Pantalla && !codigoDeVinculacion) window.location.replace("#/vender");
  }, [conSesion, Pantalla, codigoDeVinculacion]);
  useEffect(() => { if (!conSesion) document.title = "Ferrebress"; }, [conSesion]);

  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const enPantalla = useMemo<UsuarioEnPantalla | null>(
    () => (usuario ? { nombre: usuario.nombre, correo: usuario.email, rol: "Administrador", salir: () => { void salir(); } } : null),
    [usuario, salir],
  );

  if (sesion.estado === "cargando") return <PantallaDeCarga />;
  if (codigoDeVinculacion) return <VincularCelular codigo={codigoDeVinculacion} />;
  if (!conSesion) return <Entrar />;
  if (!Pantalla) return <PantallaDeCarga />;

  return (
    <ContextoDeUsuario.Provider value={enPantalla}>
      {/* La primera vez que se entra con Google desde un celular; si no corresponde, no dibuja nada. */}
      <OfrecerHuella>
        <Estructura><Pantalla key={camino} /></Estructura>
      </OfrecerHuella>
    </ContextoDeUsuario.Provider>
  );
}
