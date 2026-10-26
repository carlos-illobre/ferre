import { afterAll } from "vitest";
import { crearBase } from "../conexion.js";

// La base de este archivo de pruebas (base-propia.ts), que se cierra al terminar.
export function baseDePrueba() {
  const base = crearBase(process.env.BASE_DE_TICKETS!);
  afterAll(() => base.destroy());
  return base;
}
