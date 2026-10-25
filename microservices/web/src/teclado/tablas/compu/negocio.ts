import type { Linea } from "../../motor/tabla";

// Cómo va el negocio: F5 actualiza y ← → pasan de una sección a otra (con el foco en ellas).
// Usuarios: Alt R va a Roles y permisos, Alt N autoriza a alguien, «/» va al buscador y R cambia
// los roles de la elegida.
export const DEL_NEGOCIO: Linea[] = [
  { tecla: "F5", accion: "negocio.actualizar", enCampos: true },
  { tecla: "ArrowRight", accion: "secciones.siguiente", lugar: true },
  { tecla: "ArrowLeft", accion: "secciones.anterior", lugar: true },
  { tecla: "Alt+R", accion: "usuarios.roles", enCampos: true, etiqueta: "Alt R" },
  { tecla: "Alt+N", accion: "usuarios.autorizar", enCampos: true, etiqueta: "Alt N" },
  { tecla: "/", accion: "usuarios.buscar" },
  { tecla: "R", accion: "usuarios.cambiar-roles" },
];
