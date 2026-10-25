import { useEffect, useState } from "react";
import { ErrorApi } from "../../datos/conexion";
import type { Producto, StockFila } from "../catalogo";
import { cantidadContada } from "./inventario";
import type { Movimiento } from "./inventario";

// La lista de Stock, igual en el celular y la computadora: cuántos productos hay con stock, en cero
// y en negativo; qué muestra cada filtro; lo que queda después de cada movimiento; y el formulario
// de la corrección (cuántas hay y por qué).
export type FiltroDeStock = "todos" | "revisar" | "negativo" | "con" | "cero";

export function cuentaDelStock(filas: StockFila[]) {
  const con = filas.filter((f) => Number(f.stock) > 0).length;
  const negativos = filas.filter((f) => Number(f.stock) < 0).length;
  return { total: filas.length, con, negativos, enCero: filas.length - con - negativos };
}
export type CuentaDelStock = ReturnType<typeof cuentaDelStock>;

const FILTROS: Record<FiltroDeStock, (n: number) => boolean> = {
  todos: () => true, revisar: (n) => n <= 0, negativo: (n) => n < 0, con: (n) => n > 0, cero: (n) => n === 0,
};
export const pasaElFiltro = (filtro: FiltroDeStock, n: number) => FILTROS[filtro](n);

// Cómo se ve un stock: negativo es un error, cero es neutro, y tener es lo esperado.
export const estadoDelStock = (n: number) => (n < 0 ? "error" : n === 0 ? "neutro" : "logro");

// Lo que queda después de cada movimiento: del stock de hoy hacia atrás.
export function conSaldo(movimientos: Movimiento[] | null, stockDeHoy: number) {
  let queda = stockDeHoy;
  return (movimientos ?? []).map((m) => { const r = { m, queda }; queda -= Number(m.cantidad); return r; });
}

// El formulario de la corrección: lo que se tipea (arranca en lo que dice el sistema), el motivo
// (uno de los de siempre u «Otro…», escrito) y los botones de una más y una menos.
export function useFormularioDeCorreccion(p: Producto, cantidad: number) {
  const inicial = String(cantidad).replace(".", ",");
  const [real, setReal] = useState(inicial);
  const [motivo, setMotivo] = useState("");
  const [otro, setOtro] = useState(false);
  useEffect(() => { setReal(inicial); }, [inicial]);
  const hay = cantidadContada(real, p);
  const valida = !Number.isNaN(hay);
  return {
    real, setReal, motivo, setMotivo, otro, hay, valida,
    sumar: (d: number) => setReal(String(Math.max(0, (valida ? hay : cantidad) + d)).replace(".", ",")),
    elegirMotivo: (m: string) => { setMotivo(m); setOtro(false); },
    elegirOtro: () => { setOtro(true); setMotivo(""); },
    limpiar: () => { setReal(inicial); setMotivo(""); setOtro(false); },
  };
}
export type FormularioDeCorreccion = ReturnType<typeof useFormularioDeCorreccion>;

// Qué decir si no se pudo traer: lo que dijo el servidor o que no hay conexión.
export const mensajeDeStock = (e: unknown) => (e instanceof ErrorApi ? e.message : "Sin conexión con el servidor.");
// Lo que dijo el servidor o, si no contestó, el texto de sin conexión que corresponde.
export const mensajeDelServidor = (e: unknown, sinConexion: string) => (e instanceof ErrorApi ? e.message : sinConexion);
// Por qué no se ve el stock en la computadora: lo que dijo el servidor, o que no hay conexión ni stock guardado.
export const errorDelStock = (fallo: unknown) => (!fallo ? null : fallo instanceof ErrorApi ? `No se pudo traer el stock: ${fallo.message}` : "Sin conexión con el servidor y sin stock guardado en este dispositivo. Revisá internet y tocá «Reintentar».");
