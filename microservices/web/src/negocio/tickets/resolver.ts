import { useState } from "react";
import { api } from "../../datos/conexion";
import type { ResolucionDeTicket } from "@servidor/tickets";

// Marcar resuelto un ticket, con una nota para quien avisó, o reabrirlo.
export function useResolverTicket(id: string, alCambiar: () => Promise<void>) {
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function pedir(accion: "resolver" | "reabrir") {
    setError(null);
    try { await api(`/tickets/${id}/${accion}`, { method: "POST", body: JSON.stringify((accion === "resolver" ? { nota } : {}) satisfies ResolucionDeTicket) }); await alCambiar(); }
    catch (e) { const err = e as { estado?: number; message: string }; setError(err.estado ? `${err.message}.` : "Sin conexión: probá de nuevo cuando vuelva internet."); }
  }
  return { nota, setNota, error, pedir };
}
