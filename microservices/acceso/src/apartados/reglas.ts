import { config } from "../config.js";
import { base } from "../persistencia/conexion.js";
import { enTransaccion } from "../persistencia/transaccion.js";
import { anotarEvento } from "../eventos/anotar.js";
import { hashear, usuarioConPermisos, type SesionActiva } from "../acceso/sesiones.js";
import type { Usuario } from "../acceso/sesiones.js";
import type { CambioParaApartar, CambiosApartados, CambiosParaRevisar } from "../contratos/apartados.js";
import type { Enviable } from "../enviable.js";
import * as datos from "../persistencia/apartados.js";

// Lo apartado (specs/014-cambios-apartados, ADR-021): lo que una persona hizo sin conexión y no
// llegó al servidor antes de que la desactivaran. Sube con el token de su sesión cerrada, se
// guarda sin aplicarse, y quien tiene «Administrar usuarios» lo acepta o lo descarta. Aceptar
// repite el pedido original, como quien lo hizo: corren las mismas reglas y los mismos permisos.
export type Resultado<T = unknown> = { ok: true; cuerpo: T } | { ok: false; estado: 401 | 404 | 409; error: string };
const mal = (estado: 401 | 404 | 409, error: string) => ({ ok: false as const, estado, error });

export async function subir(token: string | null, cambios: CambioParaApartar[]): Promise<Resultado<CambiosApartados>> {
  const sesion = token ? await datos.sesionDelToken(base, hashear(token)) : null;
  if (!sesion) return mal(401, "Hay que iniciar sesión");
  // Si la persona sigue activa (le cerraron la sesión a distancia), lo suyo sale cuando vuelva a entrar.
  if (sesion.activo) return mal(409, "Tu usuario sigue activo: lo que quedó sin mandar sale cuando vuelvas a entrar");
  await datos.apartar(base, sesion, cambios);
  return { ok: true, cuerpo: { apartados: cambios.length } };
}

// Lo que espera, con el nombre del producto al que apunta. Los productos son de Comercial: se le
// piden con la identidad de quien mira. Si no responde, el nombre queda vacío y lo demás anda.
export async function paraRevisar(quien: Usuario): Promise<Enviable<CambiosParaRevisar>> {
  const filas = await datos.pendientes(base);
  const ids = [...new Set(filas.map((f) => f.producto_id).filter((id): id is string => Boolean(id)))];
  const nombres = ids.length ? await nombresDeProductos(ids, quien) : new Map<string, string>();
  return { apartados: filas.map(({ producto_id, ...f }) => ({ ...f, producto: producto_id ? nombres.get(producto_id) ?? null : null })) };
}

const cabecerasDe = (u: Usuario) => ({
  "Content-Type": "application/json", "X-Token-Servicio": config.tokenServicio,
  "X-Usuario-Id": u.id, "X-Usuario-Nombre": encodeURIComponent(u.nombre), "X-Permisos": u.permisos.join(","),
});

async function nombresDeProductos(ids: string[], quien: Usuario): Promise<Map<string, string>> {
  try {
    const r = await fetch(`${config.destinoApartados}/productos?ids=${ids.join(",")}`, { headers: cabecerasDe(quien), signal: AbortSignal.timeout(10_000) });
    const lista = r.ok ? ((await r.json()) as { id: string; descripcion: string }[]) : [];
    return new Map(lista.map((p) => [p.id, p.descripcion]));
  } catch {
    return new Map();
  }
}

const yaDecidido = (decision: string, quien: string | null) => `Ya se decidió: lo ${decision === "aceptado" ? "aceptó" : "descartó"} ${quien ?? "otra persona"}`;

export async function aceptar(id: string, quien: Usuario): Promise<Resultado<{ aceptado: true }>> {
  return enTransaccion(async (trx) => {
    const cambio = await datos.paraDecidir(trx, id);
    if (!cambio) return mal(404, "Ese cambio apartado no existe");
    if (cambio.decision) return mal(409, yaDecidido(cambio.decision, cambio.decidido_por));
    // Puede que ya la hayan reactivado: lo apartado se acepta igual (014, casos de borde).
    const autor = (await usuarioConPermisos(base, cambio.usuario_id)) ?? (await usuarioConPermisos(base, cambio.usuario_id, true));
    if (!autor) return mal(404, "La persona que hizo ese cambio ya no existe");
    const error = await repetir(cambio, { id: cambio.sesion_id, usuario: autor });
    if (error) {
      await datos.anotarError(trx, id, error);
      return mal(409, `No se pudo aceptar: ${error}`);
    }
    await datos.decidir(trx, id, "aceptado", quien.id);
    await anotarEvento(trx, { tipo: "apartado.aceptado", usuarioId: quien.id, contenido: { apartado_id: id, de: cambio.usuario_id, tipo: cambio.tipo, ruta: cambio.ruta } });
    return { ok: true, cuerpo: { aceptado: true } };
  });
}

export async function descartar(id: string, quien: Usuario): Promise<Resultado<{ descartado: true }>> {
  return enTransaccion(async (trx) => {
    const cambio = await datos.paraDecidir(trx, id);
    if (!cambio) return mal(404, "Ese cambio apartado no existe");
    if (cambio.decision) return mal(409, yaDecidido(cambio.decision, cambio.decidido_por));
    await datos.decidir(trx, id, "descartado", quien.id);
    await anotarEvento(trx, { tipo: "apartado.descartado", usuarioId: quien.id, contenido: { apartado_id: id, de: cambio.usuario_id, tipo: cambio.tipo, ruta: cambio.ruta } });
    return { ok: true, cuerpo: { descartado: true } };
  });
}

// El pedido original, otra vez, en el servicio que lo atiende (specs/029: hoy, Comercial), por la red
// interna: con el token entre servicios y la identidad de quien lo hizo, como la pone la puerta, y
// la marca de que es lo apartado (ese servicio revisa lo suyo antes, como los productos unidos).
// Devuelve el motivo si no lo aceptó.
export async function repetir(cambio: { metodo: string; ruta: string; cuerpo: unknown }, sesion: SesionActiva): Promise<string | null> {
  const { usuario } = sesion;
  try {
    const respuesta = await fetch(`${config.destinoApartados}${cambio.ruta}`, {
      method: cambio.metodo,
      headers: { ...cabecerasDe(usuario), "X-Apartado": "1" },
      body: cambio.metodo === "DELETE" || cambio.cuerpo === null ? undefined : JSON.stringify(cambio.cuerpo),
      signal: AbortSignal.timeout(30_000),
    });
    if (respuesta.ok) return null;
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
    return cuerpo.error ?? `el servidor contestó ${respuesta.status}`;
  } catch {
    return "el servicio que lo atiende no respondió. Probá de nuevo en un rato";
  }
}
