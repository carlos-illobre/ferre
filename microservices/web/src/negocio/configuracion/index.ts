// Configuración como la v2 (specs/009, decisión 148): lo que hacen las dos interfaces, una sola vez.
export * from "./configuracion";
export * from "./descarga";
export { cambiarPreferencia, guardaEnElDispositivo, useDescarga, usePreferencias } from "../../datos/almacenamiento";
