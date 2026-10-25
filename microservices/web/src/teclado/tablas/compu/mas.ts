import type { Linea } from "../../motor/tabla";

// Lo de Más. Para revisar: ↑ ↓ eligen, A acepta y D descarta. Mejoras y errores: Ctrl Enter envía
// y Alt F elige archivos. Configuración: Alt A cambia las animaciones; con el celular vinculado, Alt
// O lo desconecta y Alt U lo desvincula. El manual: Ctrl F abre su buscador.
export const DE_MAS: Linea[] = [
  { tecla: "ArrowDown", accion: "revisar.siguiente" },
  { tecla: "ArrowUp", accion: "revisar.anterior" },
  { tecla: "A", accion: "revisar.aceptar" },
  { tecla: "D", accion: "revisar.descartar" },
  { tecla: "Ctrl+Enter", accion: "tickets.enviar", enCampos: true, etiqueta: "Ctrl Enter" },
  { tecla: "Alt+F", accion: "tickets.archivos", enCampos: true, etiqueta: "Alt F" },
  { tecla: "Alt+A", accion: "configuracion.animaciones", etiqueta: "Alt A" },
  { tecla: "Alt+O", accion: "configuracion.desconectar", etiqueta: "Alt O" },
  { tecla: "Alt+U", accion: "configuracion.desvincular", etiqueta: "Alt U" },
  { tecla: "Ctrl+F", accion: "manual.buscar", enCampos: true, etiqueta: "Ctrl + F" },
];
