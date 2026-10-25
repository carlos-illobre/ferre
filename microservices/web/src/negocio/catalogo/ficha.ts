import { useEffect, useState } from "react";
import { api, ErrorApi } from "../../datos/conexion";
import { precioDeVenta, preciosDeUnProducto } from "../precios";
import type { OrigenDeLista } from "@servidor/listas";
import type { Producto } from "../../datos/almacenamiento";

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
      .then((o) => {
        if (typeof o?.archivo_nombre !== "string" || typeof o.productos !== "number") { if (vigente) setOrigen({ estado: "no-esta" }); return; }
        memoria.set(listaId, o); if (vigente) setOrigen({ estado: "listo", origen: o });
      })
      .catch((e: unknown) => { if (vigente) setOrigen(e instanceof ErrorApi ? { estado: "no-esta" } : { estado: "sin-conexion" }); });
    return () => { vigente = false; };
  }, [listaId, puedeVerlo]);
  return origen;
}
export const olvidarOrigenes = () => memoria.clear(); // para las pruebas

// Cuánto más caro (o más barato) es el costo de otro proveedor que el que está en uso, en
// porcentaje con un decimal: «+6,7 %», «−3 %» (la ficha de la v2, decisión 145). Sin costo en uso, nada.
export function diferenciaDeCosto(costo: string | number, enUso: number | null): string | null {
  if (enUso === null || enUso <= 0) return null;
  const pct = (Number(costo) / enUso - 1) * 100;
  if (!Number.isFinite(pct)) return null;
  const texto = Math.abs(pct).toLocaleString("es-AR", { maximumFractionDigits: 1 });
  return texto === "0" ? "mismo costo" : `${pct > 0 ? "+" : "−"}${texto} %`;
}

// Por qué un producto no tiene precio: le falta el costo o el margen (que elige quien puede fijarlo).
export type FaltaParaElPrecio = "sinCosto" | "eligeMargen" | "sinMargen";
export const faltaParaElPrecio = (costo: number | null, fijaMargen: boolean): FaltaParaElPrecio => (costo === null ? "sinCosto" : fijaMargen ? "eligeMargen" : "sinMargen");

// Los proveedores de la ficha: el del que sale el costo (por su id o, si no, por su nombre), el
// más barato (el primero), los demás y si el en uso es el más barato.
export function proveedoresDeLaFicha(p: Producto) {
  const todos = p.proveedores ?? [];
  const masBarato = todos[0]?.proveedor_id;
  const enUso = todos.find((v) => v.proveedor_id === p.proveedor_id) ?? todos.find((v) => v.proveedor === p.proveedor);
  return {
    todos, masBarato, enUso, otros: todos.filter((v) => v !== enUso),
    elMasBarato: enUso ? enUso.proveedor_id === masBarato : todos.length <= 1,
    costoEnUso: p.costo_neto === null ? null : Number(p.costo_neto),
  };
}
