import type { ConsultaEntrada, VentaEntrada } from "@servidor/ventas";
import { consultas } from "../../datos/conexion";
import { enviarOEncolar, guardar } from "../../datos/almacenamiento";
import { contarAlEspejo } from "../../espejo";
import { pesosCortos } from "../formato";
import { subtotalDeRenglon } from "../precios";
import type { Medio } from "./medios";
import { esAMano, precioDe } from "./precio-del-renglon";
import type { Item } from "./venta-en-curso";
import { CONSULTAS, ventasCambiaron } from "./ventas-del-dia";

// Cobrar la venta: qué falta para poder, el cuerpo que va al servidor, y lo que queda después (la
// copia local de 7 días, el stock que ve el mostrador y el aviso al otro dispositivo).

// Lo que quedó de una venta recién cobrada, para que cada pantalla lo cuente con sus palabras.
// `items` son los renglones tal como se cobraron, para mostrarlos en el éxito.
export type Cobro = { total: number; encolado: boolean; medio: Medio; cliente: string | null; productos: number; fecha: string; items: Item[] };
// Por qué no se pudo cobrar: cada interfaz tiene su texto para cada motivo.
export type MotivoDeNoCobrar = "sin-precio" | "sin-medio" | "sin-cliente";

// Cada renglón se redondea para arriba a $1.000: toda venta es múltiplo de $1.000.
export const totalDe = (items: Item[]) => items.reduce((s, it) => s + subtotalDeRenglon({ precioUnitario: precioDe(it).unitario ?? 0, cantidad: it.cantidad, aMano: esAMano(it) }).valor, 0);
export const haySinPrecio = (items: Item[]) => items.some((it) => precioDe(it).unitario === null);

export function porQueNoSeCobra(items: Item[], medio: Medio | null, clienteId: string): MotivoDeNoCobrar | null {
  if (haySinPrecio(items)) return "sin-precio";
  if (!medio) return "sin-medio";
  // El cliente es opcional con cualquier medio (003, historia 4, escenario 8); con cuenta corriente, obligatorio.
  return medio === "cuenta_corriente" && !clienteId ? "sin-cliente" : null;
}

const renglonQueSeCobra = (it: Item) => {
  const p = precioDe(it);
  return {
    producto_id: it.producto?.id ?? null, descripcion: it.descripcion, cantidad: it.cantidad, precio_unitario: p.unitario ?? 0,
    costo_neto: p.costo, margen_aplicado: p.margen, explicacion: { pasos: p.pasos, costo: it.producto?.explicacion_costo ?? [] },
  };
};

type Venta = { items: Item[]; medio: Medio; clienteId: string; cliente: string | null; dispositivo: string; lado: "computadora" | "celular"; ajustarStock: (id: string, cuanto: number) => void };

export async function registrarVenta(v: Venta): Promise<Cobro> {
  const total = totalDe(v.items);
  const cuerpo = {
    id: crypto.randomUUID(), fecha: new Date().toISOString(), medio_pago: v.medio, cliente_id: v.clienteId || null,
    dispositivo_id: v.dispositivo, items: v.items.map(renglonQueSeCobra),
  } satisfies VentaEntrada;
  const { encolado } = await enviarOEncolar("venta", "POST", "/ventas", cuerpo);
  // Copia local de la venta (7 días) y stock que ve el mostrador.
  guardar("ventas", { id: cuerpo.id, fecha: cuerpo.fecha, total, medio_pago: v.medio, items: cuerpo.items, enviada: !encolado }).catch(() => undefined);
  for (const it of v.items) if (it.producto) v.ajustarStock(it.producto.id, -it.cantidad);
  contarAlEspejo(`Venta de ${pesosCortos(total)} cobrada en ${v.lado === "computadora" ? "la computadora" : "el celular"}`);
  if (!encolado) void ventasCambiaron();
  return { total, encolado, medio: v.medio, cliente: v.cliente, productos: v.items.length, fecha: cuerpo.fecha, items: [...v.items] };
}

// «No llevó»: preguntó el precio y no compró. Queda anotado qué preguntó y a cuánto.
export function anotarNoLlevo(items: Item[], dispositivo: string): void {
  const consultaItems = items.map((it) => ({ producto_id: it.producto?.id ?? null, descripcion: it.descripcion, precio_ofrecido: precioDe(it).unitario }));
  enviarOEncolar("consulta", "POST", "/consultas", { items: consultaItems, dispositivo_id: dispositivo } satisfies ConsultaEntrada)
    .then(({ encolado }) => { if (!encolado) void consultas.invalidateQueries({ queryKey: CONSULTAS }); }).catch(() => undefined);
}
