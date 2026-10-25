import type { Linea } from "../motor/tabla";

// Una tecla que vale con el cursor en la búsqueda de la pantalla (la acción es de ese lugar) y
// también fuera de cualquier campo.
export const enLaBusquedaYFuera = (tecla: string, accion: string, etiqueta?: string): Linea[] => [
  { tecla, accion, lugar: true, enCampos: true, etiqueta },
  { tecla, accion, etiqueta },
];
