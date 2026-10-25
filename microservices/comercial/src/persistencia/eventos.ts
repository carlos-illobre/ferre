import { bandejaDeAuditoria, type EventoDeAuditoria } from "auditoria-kit";
import { config } from "../config.js";
import { base } from "./conexion.js";
import type { Ejecutor } from "./transaccion.js";

// La bandeja de auditoría de Comercial (specs/027, decisión 167): cada acción deja su evento en la
// propia base, en la transacción de la acción, y el kit lo entrega a Auditoría. Sin AUDITORIA_URL
// no anota ni manda.
export const bandeja = bandejaDeAuditoria({ base, conexion: config.databaseUrl, servicio: "comercial", auditoria: config.auditoriaUrl, token: config.tokenServicio });

export const anotar = (e: Ejecutor, evento: EventoDeAuditoria) => bandeja.anotar(e, evento);

// Cómo se llama cada persona en este momento: el evento guarda el nombre de entonces.
export async function nombres(e: Ejecutor, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const filas = await e.selectFrom("usuario").select(["id", "nombre"]).where("id", "in", ids).execute();
  return new Map(filas.map((f) => [f.id, f.nombre]));
}
