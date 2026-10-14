// Lo que el servidor responde sobre los pedidos de foto (la computadora le pide una foto al
// celular). Solo tipos: el cliente web los toma al compilar (ADR-018), así que acá no va código
// ni nombres de tablas. Lo que manda el front sale de la validación del servidor (decisión 89).
import type { z } from "zod";
import type { pedidoDeFotoNuevo } from "../acceso/esquemas.js";

// POST /pedidos-de-foto: para qué es la foto (por ejemplo, un producto).
export type PedidoDeFotoNuevo = z.input<typeof pedidoDeFotoNuevo>;
export type PedidoDeFoto = { codigo: string; expiraEnSegundos: number };

// GET /pedidos-de-foto/para-mi: los pedidos de las computadoras vinculadas a este celular.
export type FotoQueEspera = { codigo: string; para: string };

// GET /pedidos-de-foto/:codigo: si la foto ya llegó.
export type EstadoDelPedidoDeFoto = { para: string; lista: boolean };

// POST /pedidos-de-foto/:codigo/foto (multipart: foto)
export type FotoRecibida = { ok: true };
