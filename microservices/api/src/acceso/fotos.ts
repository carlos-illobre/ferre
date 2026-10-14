import { randomUUID } from "node:crypto";
import type { EstadoDelPedidoDeFoto, FotoQueEspera, PedidoDeFoto } from "../contratos/pedidos-de-foto.js";

// Pedido de foto, en sus reglas (ADR-018): la computadora no tiene cámara. Donde haga falta una
// foto (la factura de un ingreso, un producto, un ticket) pide una y muestra un código QR; el
// celular lo lee, saca la foto y la manda con ese código; la computadora la retira y la usa
// como si la hubiera elegido de un archivo. El servidor solo la pasa de un lado al otro: no la
// guarda en disco ni sabe para qué es. Un solo proceso (ADR-001): los pedidos viven en memoria
// diez minutos, y hay como mucho 50 a la vez.
const MINUTOS = 10;
const MAXIMO_DE_PEDIDOS = 50;
const MAXIMO_DE_FOTO = 10 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
type Pedido = { para: string; de: string; vence: number; foto: { tipo: string; contenido: ArrayBuffer } | null };
const pedidos = new Map<string, Pedido>();
export const VENCIDO = "El código venció. Pedí otro en la computadora.";

function vigente(codigo: string): Pedido | null {
  const ahora = Date.now();
  for (const [c, p] of pedidos) if (p.vence < ahora) pedidos.delete(c);
  return pedidos.get(codigo) ?? null;
}

// La computadora pide una foto y dice para qué (se le muestra a quien la saca).
export function pedir(para: string | undefined, sesionId: string): PedidoDeFoto {
  vigente("");
  if (pedidos.size >= MAXIMO_DE_PEDIDOS) pedidos.delete(pedidos.keys().next().value!);
  const codigo = randomUUID();
  pedidos.set(codigo, { para: para || "la computadora", de: sesionId, vence: Date.now() + MINUTOS * 60_000, foto: null });
  return { codigo, expiraEnSegundos: MINUTOS * 60 };
}

// Los pedidos de foto que esperan esas computadoras (las emparejadas con un celular).
export function queEsperan(computadoras: string[]): FotoQueEspera[] {
  vigente("");
  const de = new Set(computadoras);
  return [...pedidos].filter(([, p]) => p.foto === null && de.has(p.de)).map(([codigo, p]) => ({ codigo, para: p.para }));
}

// Si el código vale, para qué es la foto y si ya llegó.
export function estado(codigo: string): EstadoDelPedidoDeFoto | null {
  const p = vigente(codigo);
  return p ? { para: p.para, lista: p.foto !== null } : null;
}

// El celular manda la foto: jpeg, png o webp, hasta 10 MB.
export async function recibir(codigo: string, f: unknown): Promise<{ error: string; estado: 400 | 404 } | null> {
  const pedido = vigente(codigo);
  if (!pedido) return { error: VENCIDO, estado: 404 };
  if (!(f instanceof File)) return { error: "Falta la foto", estado: 400 };
  if (!TIPOS.includes(f.type)) return { error: "La foto tiene que ser jpeg, png o webp", estado: 400 };
  if (f.size > MAXIMO_DE_FOTO) return { error: "La foto pesa más de 10 MB", estado: 400 };
  pedido.foto = { tipo: f.type, contenido: await f.arrayBuffer() };
  return null;
}

// La computadora retira la foto. El pedido se termina ahí.
export function retirar(codigo: string): { error: string } | { tipo: string; contenido: ArrayBuffer } {
  const pedido = vigente(codigo);
  if (!pedido) return { error: VENCIDO };
  if (!pedido.foto) return { error: "Todavía no llegó la foto" };
  pedidos.delete(codigo);
  return pedido.foto;
}
