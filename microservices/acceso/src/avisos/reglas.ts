import { randomUUID } from "node:crypto";
import { leerTemas, rechazar, type PedidoDeTema, type TemaAbierto } from "conexion-entre-dispositivos/servidor";
import * as acceso from "../acceso/reglas.js";
import type { SesionActiva } from "../acceso/sesiones.js";
import { canales, cerrarAlVencer } from "./canales.js";

// Quién puede escuchar cada tema del canal (025-E30, E31). Cada clase de tema tiene su regla; un
// tema que no es de ninguna, o con un identificador que no es un UUID, no se da. Si algún tema no
// se da, no se abre el canal y se dice cuáles (el dispositivo los suelta y vuelve a pedir el resto).
type Decision = { tema: TemaAbierto } | { estado: 401 | 403 | 404 };
type Regla = (id: string, pedido: PedidoDeTema, sesion: SesionActiva | undefined) => Promise<Decision>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ESTA: Decision = { estado: 404 };
// Las reglas que buscan en la base: un identificador que no es un UUID no es de nada.
const enLaBase = (regla: Regla): Regla => async (id, pedido, sesion) => (UUID.test(id) ? regla(id, pedido, sesion) : NO_ESTA);
// Las reglas que necesitan la sesión: sin ella, 401.
const conSesion = (regla: (id: string, pedido: PedidoDeTema, sesion: SesionActiva) => Promise<Decision>): Regla =>
  async (id, pedido, sesion) => (sesion ? regla(id, pedido, sesion) : { estado: 401 });

const REGLAS: Record<string, Regla> = {
  // La entrada con código QR: quien tiene la clave del código (todavía sin sesión).
  entrada: enLaBase(async (id, p) => {
    const estado = p.k ? await acceso.estadoDeEntrada(id, p.k) : null;
    return estado ? { tema: { tema: p.t, inicial: estado === "aprobada" ? { listo: true } : undefined } } : NO_ESTA;
  }),
  // El código para vincular el celular: la computadora que lo pidió.
  puesto: enLaBase(conSesion(async (id, p, sesion) => {
    const puesto = await acceso.estadoDelPuesto(id, sesion.id);
    if (!puesto) return NO_ESTA;
    return { tema: { tema: p.t, inicial: puesto.vinculado_en ? { expira_en: puesto.expira_en } : undefined } };
  })),
  // El vínculo: los dos dispositivos emparejados, cada uno de su lado; vence con el vínculo.
  vinculo: enLaBase(conSesion(async (id, p, sesion) => {
    const vinculo = await acceso.vinculoEnElPuesto(id, sesion.id);
    if (!vinculo) return NO_ESTA;
    cerrarAlVencer(id, vinculo.expira_en);
    return { tema: { tema: p.t, lado: vinculo.lado } };
  })),
  // La sesión: solo la propia.
  sesion: conSesion(async (id, p, sesion) => (id === sesion.id ? { tema: { tema: p.t } } : { estado: 403 })),
};

function decidir(pedido: PedidoDeTema, sesion: SesionActiva | undefined): Promise<Decision> {
  const [clase = "", id = ""] = pedido.t.split(":");
  const regla = Object.hasOwn(REGLAS, clase) ? REGLAS[clase] : undefined;
  return regla ? regla(id, pedido, sesion) : Promise.resolve({ estado: 403 });
}

// Cuántos temas puede pedir un canal: los de una pantalla, no una lista para llenar el servidor.
const MAXIMO_DE_TEMAS = 10;

// Abrir el canal de un dispositivo con los temas que pide (la cabecera `X-Temas`). El canal es de
// su grupo: la sesión o, sin sesión, el código de entrada que espera (025-E33). Otro grupo no
// puede reemplazarlo.
export async function abrirCanal(temas: string | undefined, canal: string | undefined, sesion: SesionActiva | undefined): Promise<Response> {
  const pedidos = leerTemas(temas);
  if (!pedidos || pedidos.length > MAXIMO_DE_TEMAS) return Response.json({ error: "Faltan los temas del canal, o son demasiados" }, { status: 400 });
  const decisiones = await Promise.all(pedidos.map((p) => decidir(p, sesion)));
  const rechazos = decisiones.flatMap((d, i) => ("estado" in d ? [{ tema: pedidos[i]!.t, estado: d.estado }] : []));
  if (rechazos.length > 0) return rechazar(rechazos[0]!.estado, rechazos.map((r) => r.tema));
  // Sin sesión, todos los temas que se dieron son códigos de entrada (los demás piden sesión).
  const grupo = sesion?.id ?? pedidos[0]!.t;
  return canales.abrir(`${grupo}|${canal ?? randomUUID()}`, grupo, decisiones.map((d) => (d as { tema: TemaAbierto }).tema));
}

// Mandar por el vínculo (el respaldo de la conexión directa, ADR-027): solo los dos del vínculo.
export async function mandarPorElVinculo(tema: string, sesion: SesionActiva, cuerpo: string): Promise<204 | 400 | 404 | 413> {
  const [clase, id = ""] = tema.split(":");
  const lado = clase === "vinculo" && UUID.test(id) ? await acceso.ladoEnElPuesto(id, sesion.id) : null;
  return lado ? canales.recibir(tema, lado, cuerpo) : 404;
}
