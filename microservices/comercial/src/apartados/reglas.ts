import { config } from "../config.js";
import { base } from "../persistencia/conexion.js";
import { enTransaccion } from "../persistencia/transaccion.js";
import { anotarEvento } from "../persistencia/eventos.js";
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

export const paraRevisar = async (): Promise<Enviable<CambiosParaRevisar>> => ({ apartados: await datos.pendientes(base) });

const yaDecidido = (decision: string, quien: string | null) => `Ya se decidió: lo ${decision === "aceptado" ? "aceptó" : "descartó"} ${quien ?? "otra persona"}`;

export async function aceptar(id: string, quien: Usuario): Promise<Resultado<{ aceptado: true }>> {
  return enTransaccion(async (trx) => {
    const cambio = await datos.paraDecidir(trx, id);
    if (!cambio) return mal(404, "Ese cambio apartado no existe");
    if (cambio.decision) return mal(409, yaDecidido(cambio.decision, cambio.decidido_por));
    // Puede que ya la hayan reactivado: lo apartado se acepta igual (014, casos de borde).
    const autor = (await usuarioConPermisos(base, cambio.usuario_id)) ?? (await usuarioConPermisos(base, cambio.usuario_id, true));
    if (!autor) return mal(404, "La persona que hizo ese cambio ya no existe");
    const error = (await productoQueYaNoEsta(cambio)) ?? (await repetir(cambio, { id: cambio.sesion_id, usuario: autor }));
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

// Un cambio que toca un producto que se unió con otro o se dio de baja no se aplica (014-E08): la
// venta o el ajuste quedarían en un producto que ya no se usa. Se dice cuál y por qué.
const UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
async function productoQueYaNoEsta(cambio: { ruta: string; cuerpo: unknown }): Promise<string | null> {
  const deLaRuta = cambio.ruta.startsWith("/conteos/") ? (cambio.ruta.match(UUID) ?? []).slice(1) : (cambio.ruta.match(UUID) ?? []);
  const items = (cambio.cuerpo as { items?: { producto_id?: string | null }[] } | null)?.items ?? [];
  const ids = [...new Set([...deLaRuta, ...items.map((i) => i.producto_id).filter((id): id is string => typeof id === "string")])];
  if (ids.length === 0) return null;
  const p = (await datos.productosQueYaNoEstan(base, ids))[0];
  if (!p) return null;
  return p.reemplazo ? `«${p.descripcion}» se unió con «${p.reemplazo}». Si querés, descartalo y cargalo de nuevo` : `«${p.descripcion}» se dio de baja. Si querés, descartalo y cargalo de nuevo`;
}

// El pedido original, otra vez, contra la misma aplicación y sin pasar por la red, con la
// identidad de quien lo hizo en el entorno del pedido (ver exigir la sesión). Devuelve el
// motivo si la ruta no lo aceptó.
async function repetir(cambio: { metodo: string; ruta: string; cuerpo: unknown }, sesion: SesionActiva): Promise<string | null> {
  const { app } = await import("../app.js");
  const respuesta = await app.request(cambio.ruta, {
    method: cambio.metodo,
    headers: { "Content-Type": "application/json", "X-Token-Servicio": config.tokenServicio },
    body: cambio.metodo === "DELETE" || cambio.cuerpo === null ? undefined : JSON.stringify(cambio.cuerpo),
  }, { sesionInterna: sesion });
  if (respuesta.ok) return null;
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
  return cuerpo.error ?? `el servidor contestó ${respuesta.status}`;
}
