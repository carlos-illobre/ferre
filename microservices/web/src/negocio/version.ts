import { avisos } from "../datos/conexion";

// La versión nueva, sin consultas propias (RF-142, decisión 160): el servidor dice la suya en cada
// respuesta, y cuando cambia se busca la de la aplicación. Si la aplicación no se usa, no se
// consulta nada. Devuelve cómo dejar de escuchar.
export const alCambiarLaVersion = (buscar: () => void) => avisos.vigilar({ tema: "version", aCuestas: true, alAviso: buscar });
