import type { Contado, Conteo, Sector } from "./conteo";

// Lo que se dice de los sectores y de un conteo, igual en el celular y la computadora.

// Cuántos sectores hay, cuántos se contaron alguna vez, cuántos nunca y cuántos tienen un conteo en curso.
export function resumenDeSectores(sectores: Sector[]) {
  return {
    total: sectores.length,
    contados: sectores.filter((s) => s.ultimo_conteo !== null).length,
    nunca: sectores.filter((s) => s.ultimo_conteo === null && !s.conteo_abierto).length,
    enCurso: sectores.filter((s) => s.conteo_abierto).length,
  };
}

// El estado de un sector: con un conteo en curso, nunca contado o contado alguna vez.
export const estadoDelSector = (s: Sector): "en-curso" | "nunca" | "contado" => (s.conteo_abierto ? "en-curso" : s.ultimo_conteo === null ? "nunca" : "contado");

// Cuánto del sector ya se contó: de 0 a 1.
export const avanceDelConteo = (c: Conteo) => c.renglones.length / Math.max(1, c.renglones.length + c.sin_contar.length);

// La diferencia de lo contado contra lo que dice el sistema, y si falta, sobra o es igual.
export const diferenciaDe = (r: Pick<Contado, "cantidad_contada" | "stock_teorico">) => Number(r.cantidad_contada) - Number(r.stock_teorico);
export const claseDeDiferencia = (dif: number) => (dif === 0 ? "igual" : dif < 0 ? "falta" : "sobra");
