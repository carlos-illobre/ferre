import { bandejaDeAuditoria } from "auditoria-kit";
import type { Base } from "./conexion.js";

// La bandeja de auditoría de Procesos (specs/027): cada cambio deja su evento en la propia base y el
// kit lo entrega a Auditoría. Sin la dirección de Auditoría, no anota ni manda (decisión 167).
export const crearBandeja = (base: Base, o: { conexion: string; auditoria: string | undefined; token: string }) =>
  bandejaDeAuditoria({ base, servicio: "procesos", ...o });
