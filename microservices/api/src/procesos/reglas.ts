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

// Qué se anota de cada cambio. Guardar el borrador no se anota: pasa a cada rato mientras se dibuja.
function eventoDe(pedido: PedidoAProcesos, enviado: Record<string, unknown>): string | null {
  const [, , id, sub] = pedido.ruta.split("/");
  if (pedido.metodo === "POST" && !id) return typeof enviado.bpmn === "string" ? "proceso.importado" : "proceso.creado";
  if (pedido.metodo === "PATCH" && id && !sub) return "proceso.renombrado";
  if (pedido.metodo === "DELETE" && id && !sub) return "proceso.borrado";
  if (pedido.metodo === "POST" && sub === "vigente") return "proceso.vigente";
  if (pedido.metodo === "DELETE" && sub === "borrador") return "proceso.borrador_descartado";
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
  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.procesosUrl}${pedido.ruta}${pedido.consulta}`, { method: pedido.metodo, headers: cabeceras, body: pedido.cuerpo });
  } catch {
    return Response.json({ error: "Procesos no responde ahora. Probá de nuevo en un rato" }, { status: 502 });
  }
  const texto = await respuesta.text();
  if (respuesta.ok) {
    const enviado = pedido.cuerpo ? leerJson(new TextDecoder().decode(pedido.cuerpo)) : {};
    const tipo = eventoDe(pedido, enviado);
    if (tipo) {
      const recibido = leerJson(texto);
      const id = typeof recibido.id === "string" ? recibido.id : pedido.ruta.split("/")[2];
      await anotarEvento(base, { tipo, usuarioId: usuario.id, contenido: { id, ...(typeof recibido.nombre === "string" ? { nombre: recibido.nombre } : {}) } });
    }
  }
  return new Response(respuesta.status === 204 ? null : texto, { status: respuesta.status, headers: { "Content-Type": respuesta.headers.get("Content-Type") ?? "application/json" } });
}
