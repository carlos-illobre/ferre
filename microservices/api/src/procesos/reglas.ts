import { config } from "../config.js";
import { base } from "../base.js";
import { anotarEvento } from "../eventos.js";
import type { Usuario } from "../acceso/sesiones.js";

// Procesos es un servicio aparte que se lleva a otros proyectos (ADR-019): no sabe de sesiones.
// Ferrebress le pasa cada pedido con quién lo hace y qué puede, firmado con el token entre
// servicios, y anota en «Quién hizo qué» los cambios que salieron bien (011-E22).

export type PedidoAProcesos = { metodo: string; ruta: string; consulta: string; cuerpo: ArrayBuffer | null; tipo: string | undefined };

/** Lo que puede en Procesos, con las palabras del módulo. */
export function puedeEnProcesos(usuario: Usuario): string {
  return [usuario.permisos.includes("procesos.ver") && "ver", usuario.permisos.includes("procesos.dibujar") && "dibujar"].filter(Boolean).join(",");
}

// Qué se anota de cada cambio (plan, «Qué queda registrado»). El borrador se guarda solo a cada
// rato mientras se dibuja: se anota el primer guardado de cada persona en cada proceso y, si
// sigue, uno cada media hora, para que se sepa quién lo cambió sin llenar el registro.
const ANOTAR_BORRADOR_CADA_MS = 30 * 60 * 1000;
const borradorAnotado = new Map<string, number>();

function eventoDe(pedido: PedidoAProcesos, enviado: Record<string, unknown>, usuario: Usuario): string | null {
  const [, , id, sub] = pedido.ruta.split("/");
  if (pedido.metodo === "POST" && !id) return typeof enviado.bpmn === "string" ? "proceso.importado" : "proceso.creado";
  if (pedido.metodo === "PATCH" && id && !sub) return "proceso.renombrado";
  if (pedido.metodo === "DELETE" && id && !sub) return "proceso.borrado";
  if (pedido.metodo === "POST" && sub === "vigente") return "proceso.vigente";
  if (pedido.metodo === "DELETE" && sub === "borrador") return "proceso.borrador_descartado";
  if (pedido.metodo === "PUT" && sub === "borrador") {
    const clave = `${usuario.id}/${id}`;
    const ahora = Date.now();
    if (ahora - (borradorAnotado.get(clave) ?? -Infinity) < ANOTAR_BORRADOR_CADA_MS) return null;
    borradorAnotado.set(clave, ahora);
    return "proceso.borrador_cambiado";
  }
  return null;
}

function leerJson(texto: string): Record<string, unknown> {
  try {
    const datos = JSON.parse(texto);
    return datos && typeof datos === "object" ? (datos as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function reenviar(pedido: PedidoAProcesos, usuario: Usuario): Promise<Response> {
  const cabeceras: Record<string, string> = {
    "X-Token-Servicio": config.tokenServicio,
    "X-Usuario-Id": usuario.id,
    "X-Usuario-Nombre": encodeURIComponent(usuario.nombre),
    "X-Puede": puedeEnProcesos(usuario),
  };
  if (pedido.tipo) cabeceras["Content-Type"] = pedido.tipo;
  // Borrado, el servicio no devuelve nada: el nombre para «Quién hizo qué» se lee antes.
  const [, , idBorrado, subBorrado] = pedido.ruta.split("/");
  let nombreBorrado: string | undefined;
  if (pedido.metodo === "DELETE" && idBorrado && !subBorrado) {
    try {
      const antes = await fetch(`${config.procesosUrl}/procesos/${idBorrado}`, { method: "GET", headers: cabeceras });
      if (antes.ok) {
        const leido = leerJson(await antes.text());
        if (typeof leido.nombre === "string") nombreBorrado = leido.nombre;
      }
    } catch { /* si no responde, el borrado de abajo lo dice */ }
  }
  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.procesosUrl}${pedido.ruta}${pedido.consulta}`, { method: pedido.metodo, headers: cabeceras, body: pedido.cuerpo });
  } catch {
    return Response.json({ error: "Procesos no responde ahora. Probá de nuevo en un rato" }, { status: 502 });
  }
  const texto = await respuesta.text();
  if (respuesta.ok) {
    const enviado = pedido.cuerpo ? leerJson(new TextDecoder().decode(pedido.cuerpo)) : {};
    const tipo = eventoDe(pedido, enviado, usuario);
    if (tipo) {
      const recibido = leerJson(texto);
      const id = typeof recibido.id === "string" ? recibido.id : pedido.ruta.split("/")[2];
      await anotarEvento(base, { tipo, usuarioId: usuario.id, contenido: { id, ...(typeof recibido.nombre === "string" ? { nombre: recibido.nombre } : nombreBorrado ? { nombre: nombreBorrado } : {}) } });
    }
  }
  return new Response(respuesta.status === 204 ? null : texto, { status: respuesta.status, headers: { "Content-Type": respuesta.headers.get("Content-Type") ?? "application/json" } });
}
