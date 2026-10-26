import type { EventoDeAuditoria } from "auditoria-kit";
import type { DatosDeTickets, Persona } from "./persistencia/tickets.js";
export type { Persona };
import type { Ticket } from "./contratos/tickets.js";

// Tickets (RF-80, RF-81; specs/028): errores y mejoras que reporta quien usa el sistema, con texto
// y fotos. Todos los usuarios ven todos. Las mismas validaciones y mensajes que tenía Comercial.
const EXTENSION: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
export const MAXIMO_DE_FOTOS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TicketEntrada = { id: string; tipo: string; descripcion: string; dispositivo: string; version: string; fotos: File[] };
export type Rechazo = { error: string; estado: 400 | 413 };

export function validar(t: TicketEntrada): Rechazo | null {
  if (!UUID.test(t.id)) return { error: "Falta el identificador del ticket", estado: 400 };
  if (t.tipo !== "error" && t.tipo !== "mejora") return { error: "Decí si es un error o una mejora", estado: 400 };
  if (t.descripcion.length < 3) return { error: "Contá qué pasó o qué te gustaría, aunque sea en una línea", estado: 400 };
  if (t.descripcion.length > 5000) return { error: "El texto es demasiado largo: resumilo en menos de 5.000 letras", estado: 400 };
  if (t.fotos.length > MAXIMO_DE_FOTOS) return { error: `Son hasta ${MAXIMO_DE_FOTOS} fotos por ticket`, estado: 400 };
  for (const f of t.fotos) {
    if (!EXTENSION[f.type]) return { error: "Las fotos tienen que ser jpeg, png o webp", estado: 400 };
    if (f.size > 10 * 1024 * 1024) return { error: "Una foto pesa más de 10 MB", estado: 413 };
  }
  return null;
}

// Cada acción con sus palabras para «Quién hizo qué» (specs/027): Auditoría no conoce los tipos.
const cortar = (t: string, hasta: number) => (t.length <= hasta ? t : `${t.slice(0, hasta - 1)}…`);
const evento = (tipo: string, titulo: string, quien: Persona, id: string, detalle: string | null, contenido: Record<string, unknown>): EventoDeAuditoria => ({
  tipo, titulo, grupo: "Mejoras y errores", importancia: "normal", quien: { id: cortar(quien.id, 120), nombre: cortar(quien.nombre, 120) },
  detalle: detalle && cortar(detalle, 300), referencias: [{ cosa: "ticket", id }], contenido,
});
const queEs = (tipo: string) => (tipo === "error" ? "Error" : "Mejora");

export function crearReglas(datos: DatosDeTickets) {
  return {
    validar,
    ultimos: async (): Promise<Ticket[]> => (await datos.ultimos()).map((t) => ({
      ...t, creado_en: t.creado_en.toISOString(), resuelto_en: t.resuelto_en && t.resuelto_en.toISOString(),
    })),

    // Crea un ticket ya validado. Si ya había llegado (un reenvío), no se guarda nada de nuevo.
    async crear(t: TicketEntrada, quien: Persona): Promise<"creado" | "repetido"> {
      const fotos = await Promise.all(t.fotos.map(async (f) => ({ contenido: Buffer.from(await f.arrayBuffer()), extension: EXTENSION[f.type]! })));
      const detalle = `${queEs(t.tipo)} · ${t.fotos.length === 1 ? "1 foto" : `${t.fotos.length} fotos`}`;
      const nuevo = await datos.crear({ id: t.id, tipo: t.tipo as "error" | "mejora", descripcion: t.descripcion, dispositivo: t.dispositivo.slice(0, 80) || null, version: t.version.slice(0, 80) || null, fotos }, quien,
        evento("ticket.creado", "Pedido de mejora o error", quien, t.id, detalle, { id: t.id, tipo: t.tipo, fotos: t.fotos.length }));
      return nuevo ? "creado" : "repetido";
    },

    // Un id que no es uuid no es ningún ticket.
    resolver: async (id: string, nota: string | undefined, quien: Persona) => {
      if (!UUID.test(id)) return false;
      const limpia = nota?.trim().slice(0, 2000) || null;
      return datos.resolver(id, quien, limpia, evento("ticket.resuelto", "Pedido de mejora o error resuelto", quien, id, limpia, { id }));
    },

    reabrir: async (id: string, quien: Persona) => UUID.test(id) && datos.reabrir(id, evento("ticket.reabierto", "Pedido de mejora o error reabierto", quien, id, null, { id })),

    // Las fotos se piden con sesión: son capturas de pantalla y pueden mostrar datos del negocio. El
    // nombre se valida: nada de rutas a otras carpetas.
    async foto(nombre: string): Promise<{ contenido: Buffer; tipo: string } | null> {
      if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) return null;
      const contenido = await datos.leerFoto(nombre);
      if (!contenido) return null;
      return { contenido, tipo: nombre.endsWith(".png") ? "image/png" : nombre.endsWith(".webp") ? "image/webp" : "image/jpeg" };
    },
  };
}
export type Reglas = ReturnType<typeof crearReglas>;
