import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { exigirSesion } from "../autenticacion.js";

// Pedido de foto: la computadora no tiene cámara. Donde haga falta una foto (la factura de un
// ingreso, un producto, un ticket) pide una y muestra un código QR; el celular lo lee, saca
// la foto y la manda con ese código; la computadora la retira y la usa como si la hubiera
// elegido de un archivo. El servidor solo la pasa de un lado al otro: no la guarda en disco
// ni sabe para qué es. Un solo proceso (ADR-001): los pedidos viven en memoria diez minutos.
export const pedidosDeFoto = new Hono();
pedidosDeFoto.use("/*", exigirSesion);

const MINUTOS = 10;
const MAXIMO_DE_PEDIDOS = 50;
const MAXIMO_DE_FOTO = 10 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
type Pedido = { para: string; vence: number; foto: { tipo: string; contenido: ArrayBuffer } | null };
const pedidos = new Map<string, Pedido>();
const VENCIDO = { error: "El código venció. Pedí otro en la computadora." };

function vigente(codigo: string): Pedido | null {
  const ahora = Date.now();
  for (const [c, p] of pedidos) if (p.vence < ahora) pedidos.delete(c);
  return pedidos.get(codigo) ?? null;
}

// La computadora pide una foto y dice para qué (se le muestra a quien la saca).
pedidosDeFoto.post("/", async (c) => {
  const cuerpo = await c.req.json<{ para?: string }>().catch(() => ({}) as { para?: string });
  vigente("");
  if (pedidos.size >= MAXIMO_DE_PEDIDOS) pedidos.delete(pedidos.keys().next().value!);
  const codigo = randomUUID();
  pedidos.set(codigo, { para: String(cuerpo.para ?? "").trim().slice(0, 120) || "la computadora", vence: Date.now() + MINUTOS * 60_000, foto: null });
  return c.json({ codigo, expiraEnSegundos: MINUTOS * 60 }, 201);
});

// La computadora pregunta si ya llegó; el celular, si el código vale y para qué es la foto.
pedidosDeFoto.get("/:codigo", (c) => {
  const pedido = vigente(c.req.param("codigo"));
  if (!pedido) return c.json(VENCIDO, 404);
  return c.json({ para: pedido.para, lista: pedido.foto !== null });
});

// El celular manda la foto.
pedidosDeFoto.post("/:codigo/foto", async (c) => {
  const pedido = vigente(c.req.param("codigo"));
  if (!pedido) return c.json(VENCIDO, 404);
  const f = (await c.req.parseBody()).foto;
  if (!(f instanceof File)) return c.json({ error: "Falta la foto" }, 400);
  if (!TIPOS.includes(f.type)) return c.json({ error: "La foto tiene que ser jpeg, png o webp" }, 400);
  if (f.size > MAXIMO_DE_FOTO) return c.json({ error: "La foto pesa más de 10 MB" }, 400);
  pedido.foto = { tipo: f.type, contenido: await f.arrayBuffer() };
  return c.json({ ok: true }, 201);
});

// La computadora retira la foto. El pedido se termina ahí.
pedidosDeFoto.get("/:codigo/foto", (c) => {
  const codigo = c.req.param("codigo");
  const pedido = vigente(codigo);
  if (!pedido) return c.json(VENCIDO, 404);
  if (!pedido.foto) return c.json({ error: "Todavía no llegó la foto" }, 404);
  const { tipo, contenido } = pedido.foto;
  pedidos.delete(codigo);
  return c.body(contenido, 200, { "Content-Type": tipo, "Cache-Control": "no-store" });
});
