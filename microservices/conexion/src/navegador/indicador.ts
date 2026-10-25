import { crearAvisos, type Avisos } from "../comun/avisos.js";
import type { Suceso } from "./central.js";

// Un indicador de conexión (ADR-030): no pregunta nada; dice lo que muestra lo último que pasó.
// Con el canal abierto es exacto; sin él, dice lo último que se supo (025-E14). Para un indicador
// distinto se le pasa su tabla: qué estado sale de cada suceso (los que no están, no cambian nada).
export type Disponibilidad = "conectando" | "en-linea" | "sin-conexion";
export type TablaDelIndicador = Partial<Record<Suceso, Disponibilidad>>;

export const TABLA_DE_SIEMPRE: TablaDelIndicador = {
  contesto: "en-linea",
  abierto: "en-linea",
  "con-red": "en-linea",
  abriendo: "conectando",
  fallo: "sin-conexion",
  cortado: "sin-conexion",
  "sin-red": "sin-conexion",
};

export function crearIndicador(sucesos: Avisos<Suceso>, inicial: Disponibilidad, tabla: TablaDelIndicador = TABLA_DE_SIEMPRE) {
  const cambios = crearAvisos<Disponibilidad>();
  let estado = inicial;
  sucesos.escuchar((suceso) => {
    const nuevo = tabla[suceso];
    if (!nuevo || nuevo === estado) return;
    estado = nuevo;
    cambios.avisar(estado);
  });
  return {
    estado: () => estado,
    // Cada vez que cambia.
    cambios,
  };
}

export type Indicador = ReturnType<typeof crearIndicador>;
