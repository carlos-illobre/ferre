// Precio de venta a partir del costo neto y el margen elegido (issue #13), siempre con
// su explicación paso a paso (issue #47). Se comparte entre la API y el cliente para que
// el precio calculado sin conexión sea idéntico al del servidor (ADR-001).

export const MARGENES = [300, 200, 100, 50, 25] as const;
export type Margen = (typeof MARGENES)[number];

export type Explicado = { valor: number; pasos: string[] };

// Formato propio y determinístico ($1.649,14): el de Intl varía entre navegadores y Node
// en el espacio que pone después del símbolo, y estos textos se comparan en pruebas.
export function pesos(v: number): string {
  const [entero, decimales] = Math.abs(v).toFixed(2).split(".");
  const conPuntos = entero!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${v < 0 ? "-" : ""}$${conPuntos},${decimales}`;
}
const porCiento = (v: number): string => `${String(Number(v.toFixed(2))).replace(".", ",")} %`;

// Redondeo del precio de venta: al múltiplo de $10 más cercano; de $10.000 en adelante,
// al de $100. Lo que se cobra en un mostrador no lleva centavos.
export function redondear(precio: number): number {
  const paso = precio >= 10_000 ? 100 : 10;
  return Math.round(precio / paso) * paso;
}

export function precioDeVenta(entrada: { costoNeto: number; margen: Margen; iva: number }): Explicado {
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
      `Redondeado a ${pesos(precio)}`,
    ],
  };
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
