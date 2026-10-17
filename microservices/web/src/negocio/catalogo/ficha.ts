import { useEffect, useState } from "react";
import { api, ErrorApi } from "../../api";
import { precioDeVenta, preciosDeUnProducto } from "../precios/vista-previa";
import type { OrigenDeLista } from "@servidor/listas";
import type { Producto } from "../../producto";

// La ficha del producto (specs/016): lo que muestra y que no es de una pantalla.

// «Así se calcula» (RF-114): los renglones de la cuenta del precio, con la misma regla que el
// precio (costo + margen + IVA, redondeado para arriba a $1.000). Sin costo o sin margen, qué falta.
export type CuentaDelPrecio =
  | { falta: "costo" | "margen" }
  | { falta: null; costo: number; margen: number; margenPesos: number; iva: number; ivaPesos: number; conIva: number; cobra: number };
export function cuentaDelPrecio(p: Pick<Producto, "costo_neto" | "iva" | "margen_elegido">): CuentaDelPrecio {
  const { costo, iva } = preciosDeUnProducto(p);
  if (costo === null) return { falta: "costo" };
  if (p.margen_elegido === null) return { falta: "margen" };
  const margenPesos = costo * (p.margen_elegido / 100);
  const ivaPesos = (costo + margenPesos) * iva;
  const conIva = costo + margenPesos + ivaPesos;
  // Lo que se cobra sale de la regla del precio, no de esta suma: así nunca difieren por un centavo.
  return { falta: null, costo, margen: p.margen_elegido, margenPesos, iva, ivaPesos, conIva, cobra: precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva }).valor };
}

// «Última lectura: 13/10/2026 · 10:24» (RF-112), con la hora del dispositivo. Sin dato, nada.
export function ultimaLectura(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} · ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

// El archivo de origen del costo (RF-115). Se pide al abrir la ficha y se recuerda mientras la
// aplicación está abierta: las listas no cambian. Sin conexión, la ficha muestra lo que ya sabe.
const memoria = new Map<string, OrigenDeLista>();
export type Origen = { estado: "cargando" } | { estado: "listo"; origen: OrigenDeLista } | { estado: "sin-conexion" } | { estado: "no-esta" };
export function useOrigenDeLista(listaId: string | null | undefined, puedeVerlo: boolean): Origen | null {
  const recordado = listaId ? memoria.get(listaId) : undefined;
  const [origen, setOrigen] = useState<Origen | null>(recordado ? { estado: "listo", origen: recordado } : null);
  useEffect(() => {
    if (!listaId || !puedeVerlo) { setOrigen(null); return; }
    const ya = memoria.get(listaId);
    if (ya) { setOrigen({ estado: "listo", origen: ya }); return; }
    let vigente = true;
    setOrigen({ estado: "cargando" });
    api<OrigenDeLista>(`/listas/${listaId}/origen`)
      .then((o) => { memoria.set(listaId, o); if (vigente) setOrigen({ estado: "listo", origen: o }); })
      .catch((e: unknown) => { if (vigente) setOrigen(e instanceof ErrorApi ? { estado: "no-esta" } : { estado: "sin-conexion" }); });
    return () => { vigente = false; };
  }, [listaId, puedeVerlo]);
  return origen;
}
export const olvidarOrigenes = () => memoria.clear(); // para las pruebas
