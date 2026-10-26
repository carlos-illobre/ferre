import { crearACuestas } from "conexion-entre-dispositivos/servidor";
import { config } from "../config.js";

// Lo que va a cuestas en cada respuesta (ADR-030): la versión del servidor; cuando cambia, la
// aplicación busca la suya (decisión 157). Los canales de los dispositivos son de Acceso (specs/029).
export const aCuestas = crearACuestas();
aCuestas.agregar("version", () => config.version);
