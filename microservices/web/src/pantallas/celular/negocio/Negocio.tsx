import type { ReactNode } from "react";
import { NOMBRES } from "../../textos";
import { Actividad } from "./Actividad";
import { usePuede } from "../../permisos";
import { UsuariosDelCelular } from "./UsuariosDelCelular";

// Usuarios y quién hizo qué: dos pestañas de Más → Usuarios (decisiones 88 y 100); la tercera,
// Roles, es su propia pantalla. Las sesiones y los celulares de cada persona van en su tarjeta; los
// propios, en Configuración. «Cómo va el negocio» tiene la suya (decisión 95). Las pestañas traen
// su encabezado (`cabeza`), con el título y las pestañas.
export type Parte = "usuarios" | "actividad";

export function Negocio({ parte, cabeza }: { parte: Parte; cabeza?: ReactNode }) {
  const puedeEsto = usePuede();
  return (
    <main className="contenido">
      <div className="encabezado">{cabeza ?? <h1 className="titulo">{NOMBRES.usuarios}</h1>}</div>
      <div className="dos-columnas">
      <div className="columna">
      {parte === "usuarios" && puedeEsto("admin.usuarios") && <UsuariosDelCelular />}
      {parte === "actividad" && puedeEsto("negocio.actividad") && <Actividad />}
      </div>
      </div>
    </main>
  );
}
