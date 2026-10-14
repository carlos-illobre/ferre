// Precio de venta a partir del costo neto y el margen elegido (issue #13), siempre con
// su explicación paso a paso (issue #47). El servidor es el que calcula y el que manda
// (ADR-018). El front tiene la misma cuenta solo para la vista previa de un margen o un
// precio tipeado; una prueba del front verifica que las dos cuentas sean idénticas.
export const VERSION_DE_PRECIOS = "0.4.0";

// Los cinco botones de margen. Cualquier otro porcentaje entero se puede tipear a mano.
export const MARGENES = [300, 200, 100, 50, 25] as const;
export type Margen = (typeof MARGENES)[number];
export const esMargenBoton = (m: number): m is Margen => (MARGENES as readonly number[]).includes(m);

export type Explicado = { valor: number; pasos: string[] };

// Formato propio y determinístico ($1.649,14): el de Intl varía entre navegadores y Node
// en el espacio que pone después del símbolo, y estos textos se comparan en pruebas.
export function pesos(v: number): string {
  const [entero, decimales] = Math.abs(v).toFixed(2).split(".");
  const conPuntos = entero!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${v < 0 ? "-" : ""}$${conPuntos},${decimales}`;
}
const porCiento = (v: number): string => `${String(Number(v.toFixed(2))).replace(".", ",")} %`;

// Redondeo del precio de venta: para arriba, al múltiplo de $1.000 siguiente. Lo pidió el
// dueño: en el mostrador se cobra en miles y el redondeo nunca come el margen.
export const PASO_DE_REDONDEO = 1000;
export function redondear(precio: number): number {
  return Math.ceil(precio / PASO_DE_REDONDEO - 1e-9) * PASO_DE_REDONDEO;
}

export function precioDeVenta(entrada: { costoNeto: number; margen: number; iva: number }): Explicado {
  const { costoNeto, margen, iva } = entrada;
  const conMargen = costoNeto * (1 + margen / 100);
  const conIva = conMargen * (1 + iva);
  const precio = redondear(conIva);
  return {
    valor: precio,
    pasos: [
      `Costo ${pesos(costoNeto)}`,
      `+ ${margen} % de margen = ${pesos(conMargen)}`,
      `+ IVA ${porCiento(iva * 100)} = ${pesos(conIva)}`,
      `Redondeado para arriba a ${pesos(precio)} (múltiplo de ${pesos(PASO_DE_REDONDEO)})`,
    ],
  };
}

// Subtotal de un renglón de venta: precio × cantidad, redondeado para arriba al múltiplo de
// $1.000 siguiente. Lo pidió el dueño (2026-10-09): no hay billetes chicos para dar vuelto,
// así que toda venta tiene que ser múltiplo de $1.000, también cuando se vende medio kilo o
// se tipea un precio a mano. La API suma estos subtotales: cliente y servidor dan lo mismo.
export function subtotalDeRenglon(entrada: { precioUnitario: number; cantidad: number; unidad?: string }): Explicado {
  const { precioUnitario, cantidad } = entrada;
  const bruto = Math.round(precioUnitario * cantidad * 100) / 100;
  const valor = redondear(bruto);
  const cuanto = `${String(cantidad).replace(".", ",")}${entrada.unidad ? ` ${entrada.unidad === "unidad" ? "unidades" : entrada.unidad}` : ""}`;
  const pasos: string[] = [];
  if (cantidad !== 1) pasos.push(`× ${cuanto} = ${pesos(bruto)}`);
  if (valor !== bruto) pasos.push(`Redondeado para arriba a ${pesos(valor)} (múltiplo de ${pesos(PASO_DE_REDONDEO)}) para no dar vuelto`);
  return { valor, pasos };
}

// Para un precio tipeado a mano: qué margen real deja sobre el costo, para que se vea.
export function margenReal(entrada: { costoNeto: number; iva: number; precio: number }): Explicado {
  const { costoNeto, iva, precio } = entrada;
  const sinIva = precio / (1 + iva);
  const margen = costoNeto > 0 ? (sinIva / costoNeto - 1) * 100 : 0;
  return {
    valor: Math.round(margen * 10) / 10,
    pasos: [
      `Precio fijado a mano ${pesos(precio)}`,
      `sin IVA ${porCiento(iva * 100)} = ${pesos(sinIva)}`,
      `Costo ${pesos(costoNeto)}`,
      `Margen real ${porCiento(margen)}`,
    ],
  };
}

// El IVA que se usa si la lista del proveedor no lo dice.
export const IVA_SI_NO_SE_SABE = 0.21;

// Todo el precio de un producto: el de su margen elegido, con los pasos, y el de cada uno de
// los cinco botones. Sin costo no hay precio; sin margen, solo los de los botones.
export function preciosDeUnProducto(p: { costo_neto: string | null; iva: string | null; margen_elegido: number | null }) {
  const costo = p.costo_neto === null ? null : Number(p.costo_neto);
  const iva = p.iva === null ? IVA_SI_NO_SE_SABE : Number(p.iva);
  const precio = costo !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: costo, margen: p.margen_elegido, iva }) : null;
  const porMargen = costo === null ? null : (Object.fromEntries(MARGENES.map((m) => [m, precioDeVenta({ costoNeto: costo, margen: m, iva }).valor])) as Record<Margen, number>);
  return { costo, iva, precio, porMargen };
}
