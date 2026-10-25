import type { Linea } from "../../motor/tabla";

// Listas: Alt S elige el archivo, 1 a 9 abren la pendiente de ese número y «/» busca un proveedor.
// En la revisión, Espacio (con el foco en una fila) pliega la explicación, Alt D descarta y Ctrl
// Enter aplica.
export const DE_LISTAS: Linea[] = [
  { tecla: "Alt+S", accion: "listas.subir", etiqueta: "Alt S" },
  { tecla: "/", accion: "listas.buscar-proveedor" },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ tecla: String(n), accion: `listas.pendiente.${n}` })),
  { tecla: " ", accion: "previa.explicar", lugar: true, donde: "tr[data-fila]:focus", etiqueta: "Espacio" },
  { tecla: "Alt+D", accion: "listas.descartar", etiqueta: "Alt D" },
  { tecla: "Ctrl+Enter", accion: "listas.aplicar", etiqueta: "Ctrl Enter" },
];
