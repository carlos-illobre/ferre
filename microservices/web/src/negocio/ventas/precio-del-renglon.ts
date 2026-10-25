import { IVA_SI_NO_SE_SABE, precioDelProducto } from "../catalogo";
import { margenReal, subtotalDeRenglon } from "../precios";
import { conUnidad } from "../catalogo";
import { pesos, pesosCortos } from "../formato";
import type { Item } from "./venta-en-curso";

// El precio de un renglón y de dónde sale: del precio puesto a mano, o del costo con su margen.
export type PrecioDelRenglon = { unitario: number | null; pasos: string[]; margen: number | null; costo: number | null; iva: number };

function aMano(item: Item, costo: number | null, iva: number): PrecioDelRenglon {
  const precio = item.precioManual!;
  const real = costo !== null ? margenReal({ costoNeto: costo, iva, precio }) : null;
  return { unitario: precio, pasos: real ? real.pasos : [`Precio puesto a mano ${pesos(precio)}`], margen: null, costo, iva };
}

const costoDe = (p: Item["producto"]) => (p?.costo_neto != null ? Number(p.costo_neto) : null);
const ivaDe = (p: Item["producto"]) => (p?.iva != null ? Number(p.iva) : IVA_SI_NO_SE_SABE);

export function precioDe(item: Item): PrecioDelRenglon {
  const p = item.producto;
  const costo = costoDe(p);
  const iva = ivaDe(p);
  if (item.precioManual !== null) return aMano(item, costo, iva);
  const r = p ? precioDelProducto(p).calculo : null;
  if (p && r) return { unitario: r.valor, pasos: r.pasos, margen: p.margen_elegido, costo, iva };
  return { unitario: null, pasos: [], margen: null, costo, iva };
}

// Un renglón con precio a mano (tipeado, o un ítem libre) se cobra tal cual (decisión 128).
export const esAMano = (item: Item) => item.precioManual !== null || !item.producto;

// El subtotal de un renglón (precio × cantidad, redondeado como se cobra), con sus pasos; sin precio, ninguno.
export function subtotalDe(item: Item) {
  const unitario = precioDe(item).unitario;
  return unitario === null ? null : subtotalDeRenglon({ precioUnitario: unitario, cantidad: item.cantidad, unidad: item.unidad, aMano: esAMano(item) });
}

// «De dónde sale» en filas, como la maqueta de la v2 (decisión 127): cada paso con su importe,
// del costo al total del renglón. Sin permiso para ver costos, desde el precio.
export type FilaDeLaCuenta = { texto: string; valor: string };
const fechaCorta = (iso: string) => { const [, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}`; };

function desdeElCosto(item: Item, p: PrecioDelRenglon): FilaDeLaCuenta[] {
  const prod = item.producto;
  const origen = [prod?.proveedor, prod?.fecha_lista ? `lista del ${fechaCorta(prod.fecha_lista)}` : null].filter(Boolean).join(", ");
  const conMargen = p.costo! * (1 + p.margen! / 100);
  return [
    { texto: `Costo${origen ? ` · ${origen}` : ""}`, valor: pesos(p.costo!) },
    { texto: `+ margen ${p.margen} %`, valor: pesosCortos(conMargen) },
    { texto: `+ IVA ${Math.round(p.iva * 100)} %`, valor: pesosCortos(conMargen * (1 + p.iva)) },
    { texto: "Precio, para arriba a $1.000", valor: pesosCortos(p.unitario!) },
  ];
}

function filasDelPrecio(item: Item, p: PrecioDelRenglon, veCostos: boolean): FilaDeLaCuenta[] {
  if (item.precioManual !== null) return [{ texto: "Precio a mano, solo esta venta", valor: pesosCortos(p.unitario!) }];
  if (veCostos && p.costo !== null && p.margen !== null) return desdeElCosto(item, p);
  return [{ texto: "Precio", valor: pesosCortos(p.unitario!) }];
}

export function cuentaDelRenglon(item: Item, veCostos: boolean): { filas: FilaDeLaCuenta[]; total: number } | null {
  const p = precioDe(item);
  const renglon = subtotalDe(item);
  if (p.unitario === null || !renglon) return null;
  const filas = filasDelPrecio(item, p, veCostos);
  const bruto = Math.round(p.unitario * item.cantidad * 100) / 100;
  if (item.cantidad !== 1) filas.push({ texto: `× ${conUnidad(item.cantidad, item.unidad)}`, valor: pesosCortos(bruto) });
  if (renglon.valor !== bruto) filas.push({ texto: "Para arriba a $1.000, para no dar vuelto", valor: pesosCortos(renglon.valor) });
  return { filas, total: renglon.valor };
}
