import { useCallback, useEffect, useState } from "react";
import { api, leerToken, reducirImagen, urlApi } from "../api";
import { guardarMeta, leerMeta } from "../almacen";

// Tickets (RF-80): errores y mejoras que reporta quien usa la app. Un ticket se guarda
// primero en el dispositivo, con sus fotos, y se manda después: si no hay conexión queda
// esperando y sale solo cuando vuelve. El id lo pone el dispositivo, así reenviar no duplica.
export type Ticket = {
  id: string; tipo: "error" | "mejora"; descripcion: string; dispositivo: string | null; version: string | null; creado_en: string;
  estado: "abierto" | "resuelto"; resuelto_en: string | null; nota: string | null; usuario: string; resuelto_por: string | null; fotos: string[];
};
export type Pendiente = { id: string; tipo: Ticket["tipo"]; descripcion: string; dispositivo: string; version: string; creado_en: string; fotos: Blob[] };
export const MAXIMO_DE_FOTOS = 5;

const CLAVE = "tickets_por_enviar";
const AVISO = "ferre.tickets";
const leerPendientes = () => leerMeta<Pendiente[]>(CLAVE).then((p) => p ?? []).catch(() => [] as Pendiente[]);
const avisar = () => window.dispatchEvent(new Event(AVISO));

export async function crearTicket(datos: Omit<Pendiente, "id" | "creado_en" | "fotos">, fotos: File[]): Promise<void> {
  // Las capturas se achican antes de guardarlas: pesan mucho menos y se leen igual.
  const achicadas = await Promise.all(fotos.slice(0, MAXIMO_DE_FOTOS).map((f) => reducirImagen(f, 1600)));
  const pendiente: Pendiente = { ...datos, id: crypto.randomUUID(), creado_en: new Date().toISOString(), fotos: achicadas };
  await guardarMeta(CLAVE, [...(await leerPendientes()), pendiente]);
  avisar();
  await enviarPendientes();
}

let enviando: Promise<void> | null = null;
// Manda de a uno, en orden. Un corte de red frena y deja el resto para después; un rechazo
// del servidor (4xx) es un ticket que reintentar no arregla: se descarta.
export function enviarPendientes(): Promise<void> {
  if (enviando) return enviando;
  enviando = (async () => {
    try {
      for (const p of await leerPendientes()) {
        const formulario = new FormData();
        for (const clave of ["id", "tipo", "descripcion", "dispositivo", "version"] as const) formulario.append(clave, p[clave]);
        p.fotos.forEach((f, i) => formulario.append("fotos", f, `foto-${i}.${f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg"}`));
        try { await api("/tickets", { method: "POST", body: formulario }); }
        catch (e) { const estado = (e as { estado?: number }).estado; if (!estado || estado >= 500 || estado === 401 || estado === 429) return; }
        await guardarMeta(CLAVE, (await leerPendientes()).filter((x) => x.id !== p.id));
        avisar();
      }
    } finally { enviando = null; }
  })();
  return enviando;
}

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    setPendientes(await leerPendientes());
    try { setTickets(await api<Ticket[]>("/tickets")); setError(null); }
    catch (e) { const err = e as { estado?: number; message: string }; setError(err.estado ? err.message : "Sin conexión: los tickets ya enviados se ven cuando vuelva internet."); }
  }, []);
  useEffect(() => {
    void enviarPendientes().then(cargar);
    const alVolver = () => { void enviarPendientes().then(cargar); };
    window.addEventListener(AVISO, cargar);
    window.addEventListener("online", alVolver);
    return () => { window.removeEventListener(AVISO, cargar); window.removeEventListener("online", alVolver); };
  }, [cargar]);
  return { tickets, pendientes, error, cargar };
}

// Las fotos de los tickets se piden con la sesión (pueden mostrar datos del negocio), así
// que no sirven como dirección de una imagen: se bajan y se muestran desde la memoria.
export function useFoto(ruta: string | Blob): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true; let creada: string | null = null;
    const mostrar = (b: Blob) => { if (!vigente) return; creada = URL.createObjectURL(b); setUrl(creada); };
    if (typeof ruta !== "string") mostrar(ruta);
    else fetch(urlApi(ruta), { headers: { Authorization: `Bearer ${leerToken() ?? ""}` } }).then((r) => (r.ok ? r.blob() : Promise.reject(new Error("sin foto")))).then(mostrar).catch(() => undefined);
    return () => { vigente = false; if (creada) URL.revokeObjectURL(creada); };
  }, [ruta]);
  return url;
}
