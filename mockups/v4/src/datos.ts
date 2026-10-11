// Datos de ejemplo de la maqueta, tipados, y las funciones de formato y de precio.
// Son datos fijos: lo que cambia durante la sesión vive en `almacen.ts`.

// ---------------------------------------------------------------- Formato

const SIN_CENTAVOS = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const CON_CENTAVOS = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const UN_DECIMAL = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** Importe sin centavos: `pesos(4000)` → "$4.000". Para precios de venta y totales. */
export function pesos(valor: number): string {
  return `${valor < 0 ? "−" : ""}$${SIN_CENTAVOS.format(Math.abs(Math.round(valor)))}`;
}

/** Importe con centavos: `pesosConCentavos(1649.14)` → "$1.649,14". Para costos. */
export function pesosConCentavos(valor: number): string {
  return `${valor < 0 ? "−" : ""}$${CON_CENTAVOS.format(Math.abs(valor))}`;
}

/** Número con coma y a lo sumo un decimal: `numero(2.5)` → "2,5". */
export function numero(valor: number): string {
  return UN_DECIMAL.format(valor).replace("-", "−");
}

export type Unidad = "unidad" | "kilo" | "metro" | "litro";

const NOMBRES_DE_UNIDAD: Record<Unidad, [uno: string, varios: string]> = {
  unidad: ["unidad", "unidades"],
  kilo: ["kilo", "kilos"],
  metro: ["metro", "metros"],
  litro: ["litro", "litros"],
};

/** Cantidad con su unidad: `cantidad(2.5, "kilo")` → "2,5 kilos"; `cantidad(1, "unidad")` → "1 unidad". */
export function cantidad(valor: number, unidad: Unidad = "unidad"): string {
  const [uno, varios] = NOMBRES_DE_UNIDAD[unidad];
  return `${numero(valor)} ${valor === 1 ? uno : varios}`;
}

/** Cómo se dice el precio de una unidad: "c/u", "el kilo", "el metro", "el litro". */
export function porUnidad(unidad: Unidad): string {
  return unidad === "unidad" ? "c/u" : `el ${unidad}`;
}

/** `true` si el producto se vende fraccionado (kilo, metro o litro) y la cantidad lleva un decimal. */
export function vaConDecimal(unidad: Unidad): boolean {
  return unidad !== "unidad";
}

/** Hora de un momento: `hora(new Date())` → "10:32". */
export function hora(momento: Date): string {
  return momento.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Día en palabras: "9 de octubre". */
export function dia(momento: Date): string {
  return momento.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

/** Un momento de hoy (o de hace `diasAtras` días) a la hora dada: `hoyA("10:32")`. */
export function hoyA(horaTexto: string, diasAtras = 0): Date {
  const [h = "0", m = "0"] = horaTexto.split(":");
  const momento = new Date();
  momento.setDate(momento.getDate() - diasAtras);
  momento.setHours(Number(h), Number(m), 0, 0);
  return momento;
}

/** Las dos primeras letras en mayúscula, para los círculos de iniciales: "Carlos" → "CA". */
export function iniciales(nombre: string): string {
  return nombre.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------- Precio de venta

export const MARGENES = [300, 200, 100, 50, 25] as const;
export const IVA = 21;
export const REDONDEO = 1000;

export type Calculo = { valor: number; pasos: string[] };

/**
 * Precio de venta como en la app real: costo × (1 + margen) × 1,21 de IVA, redondeado para
 * ARRIBA al múltiplo de $1.000. Devuelve también los pasos, para la pieza `Explicado`.
 * La cuenta se hace en centavos para no arrastrar errores de coma flotante.
 */
export function precioDeVenta(costo: number, margen: number): Calculo {
  const costoCentavos = Math.round(costo * 100);
  const conMargen = Math.round((costoCentavos * (100 + margen)) / 100);
  const conIva = Math.round((conMargen * (100 + IVA)) / 100);
  const valor = Math.ceil(conIva / (REDONDEO * 100)) * REDONDEO;
  return {
    valor,
    pasos: [
      `Costo del proveedor: ${pesosConCentavos(costoCentavos / 100)}`,
      `Con el margen de ${margen} %: ${pesosConCentavos(conMargen / 100)}`,
      `Con el IVA de ${IVA} %: ${pesosConCentavos(conIva / 100)}`,
      `Redondeado para arriba a ${pesos(REDONDEO)}: ${pesos(valor)}`,
    ],
  };
}

/** Precio de lista de un producto, o `null` si le falta el costo o el margen («sin precio»). */
export function precioDe(producto: Pick<Producto, "costo" | "margen">): Calculo | null {
  if (producto.costo === null || producto.margen === null) return null;
  return precioDeVenta(producto.costo, producto.margen);
}

/** Subtotal de un renglón: precio × cantidad, redondeado para arriba a $1.000 (toda venta es múltiplo de $1.000). */
export function subtotalDe(precioUnitario: number, cuanto: number, unidad: Unidad = "unidad"): Calculo {
  const exacto = precioUnitario * cuanto;
  const valor = Math.ceil(Math.round(exacto) / REDONDEO) * REDONDEO;
  const pasos = [`${cantidad(cuanto, unidad)} × ${pesos(precioUnitario)} = ${pesos(exacto)}`];
  if (valor !== Math.round(exacto)) pasos.push(`Redondeado para arriba a ${pesos(REDONDEO)}: ${pesos(valor)}`);
  return { valor, pasos };
}

// ---------------------------------------------------------------- Tipos

export type Tono = "naranja" | "azul" | "amarillo" | "negro" | "verde" | "violeta";

export type Proveedor = {
  id: string;
  nombre: string;
  tono: Tono;
  productos: number;
  /** Hace cuántos días es la última lista de precios aplicada; `null` si todavía no tiene ninguna. */
  diasDeLaLista: number | null;
  /** Cómo vienen sus precios de lista: con el IVA incluido o sin IVA. */
  conIva: boolean;
  /** Descuento que hace sobre la lista, en por ciento (0 si no hace). */
  descuento: number;
};

export type CostoDeProveedor = { proveedorId: string; codigo: string; costo: number };

export type Producto = {
  id: string;
  nombre: string;
  marca: string;
  unidad: Unidad;
  /** Costo vigente sin IVA; `null` si todavía no vino en ninguna lista. */
  costo: number | null;
  /** Margen en por ciento (100 = duplica); `null` si nadie lo eligió: el producto queda «sin precio». */
  margen: number | null;
  /** De quién se compra y a cuánto. El primero es el vigente. */
  proveedores: CostoDeProveedor[];
  codigoDeBarras: string | null;
  stock: number;
  sectorId: string;
  tono: Tono;
};

export type Cliente = { id: string; nombre: string; debe: number };

export type Usuario = { id: string; nombre: string; correo: string; activo: boolean; tono: Tono };

export type Sesion = {
  id: string;
  usuarioId: string;
  nombre: string;
  tipo: "computadora" | "celular";
  detalle: string;
  /** `true` para la sesión desde la que se está mirando. */
  actual: boolean;
};

export type MedioDePago = "efectivo" | "mercado-pago" | "tarjeta" | "cuenta-corriente";

export const MEDIOS_DE_PAGO: { clave: MedioDePago; nombre: string; frase: string }[] = [
  { clave: "efectivo", nombre: "Efectivo", frase: "Pagó en efectivo" },
  { clave: "mercado-pago", nombre: "Mercado Pago", frase: "Pagó con Mercado Pago" },
  { clave: "tarjeta", nombre: "Tarjeta", frase: "Pagó con tarjeta" },
  { clave: "cuenta-corriente", nombre: "Cuenta corriente", frase: "Va a la cuenta corriente" },
];

export function nombreDelMedio(medio: MedioDePago): string {
  return MEDIOS_DE_PAGO.find((m) => m.clave === medio)?.nombre ?? medio;
}

export type RenglonVendido = { nombre: string; cantidad: number; unidad: Unidad; subtotal: number };

export type Venta = {
  id: string;
  cuando: Date;
  usuarioId: string;
  renglones: RenglonVendido[];
  medio: MedioDePago;
  clienteId: string | null;
  total: number;
  anulada: boolean;
  motivo: string;
  /** `true` si se cobró sin conexión y todavía no se envió. */
  porEnviar: boolean;
};

export type RenglonComprado = { productoId: string; cantidad: number; costo: number };

export type Compra = {
  id: string;
  proveedorId: string;
  /** En palabras: "Hoy, 10:15". */
  cuando: string;
  /** El mismo momento, como fecha (para ordenar y filtrar). */
  momento: Date;
  usuarioId: string;
  renglones: RenglonComprado[];
  anulada: boolean;
};

/**
 * Lo que costó una compra. Es el ÚNICO lugar donde se calcula: la suma de cantidad × costo de
 * sus renglones, sin centavos. Todas las pantallas muestran `pesos(totalDeCompra(compra))`.
 */
export function totalDeCompra(compra: Pick<Compra, "renglones">): number {
  return Math.round(compra.renglones.reduce((suma, r) => suma + r.cantidad * r.costo, 0));
}

export type Sector = {
  id: string;
  nombre: string;
  /** Cuántos productos tiene para contar y cuántos ya se contaron. */
  productos: number;
  contados: number;
  estado: "sin-empezar" | "a-medias" | "cerrado";
  /** En palabras: "Contado ayer", "Sin empezar". */
  detalle: string;
};

export type Movimiento = { id: string; productoId: string; cuando: string; que: string; cambio: number };

export type Hecho = {
  id: string;
  usuarioId: string;
  /** En minúscula, para leer después del nombre: "cobró una venta". */
  que: string;
  detalle: string;
  dia: "Hoy" | "Ayer";
  hora: string;
  importe: number | null;
};

export type Consulta = {
  que: string;
  veces: number;
  /** A cuánto se le ofreció (el precio de una unidad); `null` si no tenía precio. */
  precio: number | null;
};

// ---------------------------------------------------------------- Datos

export const USUARIOS: Usuario[] = [
  { id: "carlos", nombre: "Carlos", correo: "carlos@gmail.com", activo: true, tono: "naranja" },
  { id: "marta", nombre: "Marta", correo: "marta@gmail.com", activo: true, tono: "violeta" },
  { id: "nicolas", nombre: "Nicolás", correo: "nicolas@gmail.com", activo: true, tono: "verde" },
  // La persona desactivada: no puede entrar, pero lo que hizo sigue figurando en «Quién hizo qué».
  { id: "ramiro", nombre: "Ramiro", correo: "ramiro@gmail.com", activo: false, tono: "azul" },
];

/** Quien está usando la maqueta. El único rol es «Administrador». */
export const YO = { usuarioId: "carlos", nombre: "Carlos", rol: "Administrador", correo: "carlos@gmail.com" };

export const SESIONES: Sesion[] = [
  { id: "s1", usuarioId: "carlos", nombre: "Esta computadora", tipo: "computadora", detalle: "Chrome · Activa ahora", actual: true },
  { id: "s2", usuarioId: "carlos", nombre: "Celular de Carlos", tipo: "celular", detalle: "Android · Hace 2 horas", actual: false },
  { id: "s3", usuarioId: "marta", nombre: "Notebook de Marta", tipo: "computadora", detalle: "Chrome · Ayer", actual: false },
];

export const PROVEEDORES: Proveedor[] = [
  { id: "comodo", nombre: "Comodo", tono: "naranja", productos: 386, diasDeLaLista: 15, conIva: true, descuento: 10 },
  { id: "tresge", nombre: "Tresge", tono: "violeta", productos: 214, diasDeLaLista: 4, conIva: false, descuento: 0 },
  { id: "erpa", nombre: "Erpa", tono: "verde", productos: 176, diasDeLaLista: 53, conIva: false, descuento: 5 },
  { id: "ixnova", nombre: "Ixnova", tono: "azul", productos: 98, diasDeLaLista: 100, conIva: true, descuento: 0 },
];

/** Una lista de precios de más de estos días se marca como vieja. */
export const DIAS_PARA_LISTA_VIEJA = 45;

export const CLIENTES: Cliente[] = [
  { id: "martinez", nombre: "Constructora Martínez", debe: 184000 },
  { id: "gomez", nombre: "Herrería Gómez", debe: 0 },
];

export const SECTORES: Sector[] = [
  { id: "estanteria-1", nombre: "Estantería 1", productos: 42, contados: 7, estado: "a-medias", detalle: "7 de 42 productos" },
  { id: "estanteria-2", nombre: "Estantería 2", productos: 35, contados: 0, estado: "sin-empezar", detalle: "Sin empezar" },
  { id: "mostrador", nombre: "Mostrador", productos: 18, contados: 18, estado: "cerrado", detalle: "Contado ayer" },
];

/** Cuántos productos tiene el catálogo «de verdad» (los de abajo son la muestra que se ve). */
export const TOTAL_DE_PRODUCTOS = 1248;

export const PRODUCTOS: Producto[] = [
  {
    id: "mecha-6-madera", nombre: "Mecha 6 mm madera", marca: "Bosch", unidad: "unidad", costo: 1649.14, margen: 100,
    proveedores: [{ proveedorId: "comodo", codigo: "BO-2608", costo: 1649.14 }, { proveedorId: "tresge", codigo: "TG-M6M", costo: 1764.5 }],
    codigoDeBarras: "7790001000015", stock: 18, sectorId: "estanteria-1", tono: "naranja",
  },
  {
    id: "mecha-8-widia", nombre: "Mecha 8 mm widia", marca: "Bosch", unidad: "unidad", costo: 4850, margen: 100,
    proveedores: [{ proveedorId: "comodo", codigo: "BO-2609", costo: 4850 }],
    codigoDeBarras: "7790001000022", stock: 9, sectorId: "estanteria-1", tono: "azul",
  },
  {
    id: "mecha-6-hormigon", nombre: "Mecha 6 mm para hormigón", marca: "Irwin", unidad: "unidad", costo: 3100, margen: null,
    proveedores: [{ proveedorId: "tresge", codigo: "TG-IR6H", costo: 3100 }],
    codigoDeBarras: "7790001000039", stock: 6, sectorId: "estanteria-1", tono: "verde",
  },
  {
    id: "clavo-paris-2", nombre: "Clavo punta París 2 pulgadas", marca: "Acindar", unidad: "kilo", costo: 5200, margen: 50,
    proveedores: [{ proveedorId: "comodo", codigo: "CL-PP2", costo: 5200 }],
    codigoDeBarras: null, stock: 24.5, sectorId: "mostrador", tono: "azul",
  },
  {
    id: "taladro-18v", nombre: "Taladro inalámbrico 18 V con dos baterías", marca: "Bosch", unidad: "unidad", costo: 122500, margen: 50,
    proveedores: [{ proveedorId: "erpa", codigo: "ER-GSR18", costo: 122500 }],
    codigoDeBarras: "7790001000053", stock: 3, sectorId: "estanteria-2", tono: "amarillo",
  },
  {
    id: "cinta-aisladora", nombre: "Cinta aisladora negra 20 m", marca: "Tacsa", unidad: "unidad", costo: 780.5, margen: 100,
    proveedores: [{ proveedorId: "ixnova", codigo: "IX-CA20N", costo: 780.5 }, { proveedorId: "comodo", codigo: "CO-CIN20", costo: 812 }],
    codigoDeBarras: "7790001000060", stock: 42, sectorId: "mostrador", tono: "negro",
  },
  {
    id: "llave-francesa-10", nombre: "Llave francesa 10 pulgadas", marca: "Bahco", unidad: "unidad", costo: 16800, margen: 100,
    proveedores: [{ proveedorId: "tresge", codigo: "TG-LF10", costo: 16800 }],
    codigoDeBarras: "7790001000077", stock: 7, sectorId: "estanteria-2", tono: "verde",
  },
  {
    id: "cable-2-5", nombre: "Cable unipolar 2,5 mm", marca: "Kalop", unidad: "metro", costo: 520, margen: 50,
    proveedores: [{ proveedorId: "ixnova", codigo: "IX-CU25", costo: 520 }],
    codigoDeBarras: null, stock: 180, sectorId: "estanteria-2", tono: "naranja",
  },
  {
    id: "thinner", nombre: "Thinner sello de oro", marca: "Venier", unidad: "litro", costo: 2380, margen: 100,
    proveedores: [{ proveedorId: "erpa", codigo: "ER-THSO", costo: 2380 }],
    codigoDeBarras: null, stock: 0, sectorId: "estanteria-2", tono: "amarillo",
  },
  {
    id: "tornillo-4x40", nombre: "Tornillo para madera 4 × 40 mm, caja de 100", marca: "Fischer", unidad: "unidad", costo: 3900, margen: 50,
    proveedores: [{ proveedorId: "comodo", codigo: "CO-T440", costo: 3900 }],
    codigoDeBarras: "7790001000091", stock: -2, sectorId: "mostrador", tono: "negro",
  },
];

/** Los que más salen: para «Lo que más se vende» en Vender (solo en computadora). */
export const MAS_VENDIDOS: string[] = ["mecha-6-madera", "clavo-paris-2", "cinta-aisladora", "llave-francesa-10"];

/** Un código de barras que no está en el catálogo, para probar «código desconocido». */
export const CODIGO_DESCONOCIDO = "7791234500017";

export const VENTAS_DE_HOY: Venta[] = [
  {
    id: "v-1052", cuando: hoyA("10:32"), usuarioId: "carlos", medio: "efectivo", clienteId: null, total: 8000, anulada: false, motivo: "", porEnviar: false,
    renglones: [
      { nombre: "Cinta aisladora negra 20 m", cantidad: 2, unidad: "unidad", subtotal: 4000 },
      { nombre: "Mecha 6 mm madera", cantidad: 1, unidad: "unidad", subtotal: 4000 },
    ],
  },
  {
    id: "v-1051", cuando: hoyA("10:18"), usuarioId: "marta", medio: "mercado-pago", clienteId: null, total: 223000, anulada: false, motivo: "", porEnviar: false,
    renglones: [{ nombre: "Taladro inalámbrico 18 V con dos baterías", cantidad: 1, unidad: "unidad", subtotal: 223000 }],
  },
  {
    id: "v-1050", cuando: hoyA("09:54"), usuarioId: "carlos", medio: "cuenta-corriente", clienteId: "martinez", total: 25000, anulada: false, motivo: "", porEnviar: false,
    renglones: [{ nombre: "Clavo punta París 2 pulgadas", cantidad: 2.5, unidad: "kilo", subtotal: 25000 }],
  },
  {
    id: "v-1049", cuando: hoyA("09:31"), usuarioId: "nicolas", medio: "tarjeta", clienteId: null, total: 53000, anulada: false, motivo: "", porEnviar: false,
    renglones: [
      { nombre: "Llave francesa 10 pulgadas", cantidad: 1, unidad: "unidad", subtotal: 41000 },
      { nombre: "Mecha 8 mm widia", cantidad: 1, unidad: "unidad", subtotal: 12000 },
    ],
  },
  {
    id: "v-1048", cuando: hoyA("09:05"), usuarioId: "marta", medio: "efectivo", clienteId: null, total: 12000, anulada: true, motivo: "Se equivocó de mecha", porEnviar: false,
    renglones: [{ nombre: "Mecha 8 mm widia", cantidad: 1, unidad: "unidad", subtotal: 12000 }],
  },
  {
    id: "v-1047", cuando: hoyA("08:47"), usuarioId: "carlos", medio: "efectivo", clienteId: null, total: 6000, anulada: false, motivo: "", porEnviar: false,
    renglones: [{ nombre: "Cable unipolar 2,5 mm", cantidad: 6, unidad: "metro", subtotal: 6000 }],
  },
];

export const COMPRAS: Compra[] = [
  {
    id: "c-3", proveedorId: "comodo", cuando: "Hoy, 10:15", momento: hoyA("10:15"), usuarioId: "nicolas", anulada: false,
    renglones: [{ productoId: "mecha-6-madera", cantidad: 10, costo: 1649.14 }, { productoId: "clavo-paris-2", cantidad: 13, costo: 5200 }],
  },
  {
    id: "c-2", proveedorId: "tresge", cuando: "Ayer, 16:40", momento: hoyA("16:40", 1), usuarioId: "marta", anulada: false,
    renglones: [{ productoId: "llave-francesa-10", cantidad: 7, costo: 16800 }, { productoId: "mecha-6-hormigon", cantidad: 3, costo: 3100 }],
  },
  {
    id: "c-1", proveedorId: "erpa", cuando: "Hace 3 días, 11:20", momento: hoyA("11:20", 3), usuarioId: "carlos", anulada: false,
    renglones: [{ productoId: "thinner", cantidad: 20, costo: 2380 }],
  },
];

export const MOVIMIENTOS: Movimiento[] = [
  { id: "m1", productoId: "mecha-6-madera", cuando: "Hoy, 10:32", que: "Venta", cambio: -1 },
  { id: "m2", productoId: "mecha-6-madera", cuando: "Hoy, 10:15", que: "Compra a Comodo", cambio: 10 },
  { id: "m3", productoId: "mecha-6-madera", cuando: "Ayer, 18:06", que: "Corrección de Carlos", cambio: -1 },
  { id: "m4", productoId: "cinta-aisladora", cuando: "Hoy, 10:32", que: "Venta", cambio: -2 },
  { id: "m5", productoId: "clavo-paris-2", cuando: "Hoy, 10:15", que: "Compra a Comodo", cambio: 13 },
  { id: "m6", productoId: "clavo-paris-2", cuando: "Hoy, 09:54", que: "Venta", cambio: -2.5 },
  { id: "m7", productoId: "llave-francesa-10", cuando: "Ayer, 18:06", que: "Corrección de Carlos", cambio: -1 },
];

export const ACTIVIDAD: Hecho[] = [
  { id: "h1", usuarioId: "carlos", que: "cobró una venta", detalle: "2 × Cinta aisladora negra 20 m y 1 × Mecha 6 mm madera", dia: "Hoy", hora: "10:32", importe: 8000 },
  { id: "h2", usuarioId: "nicolas", que: "registró mercadería", detalle: "Comodo · 2 productos", dia: "Hoy", hora: "10:15", importe: 84091 },
  { id: "h3", usuarioId: "marta", que: "actualizó una lista de precios", detalle: "Comodo · 42 precios cambiaron", dia: "Hoy", hora: "09:44", importe: null },
  { id: "h4", usuarioId: "marta", que: "anuló una venta", detalle: "Mecha 8 mm widia · Se equivocó de mecha", dia: "Hoy", hora: "09:12", importe: 12000 },
  { id: "h5", usuarioId: "carlos", que: "corrigió una cantidad de stock", detalle: "Llave francesa 10 pulgadas · de 8 a 7", dia: "Ayer", hora: "18:06", importe: null },
  { id: "h6", usuarioId: "marta", que: "registró mercadería", detalle: "Tresge · 2 productos", dia: "Ayer", hora: "16:40", importe: 126900 },
];

/** Lo que preguntaron y no llevaron («No llevó»), para «Cómo va el negocio». */
export const NO_LLEVARON: Consulta[] = [
  { que: "Amoladora 115 mm", veces: 3, precio: 89000 },
  { que: "Pintura látex exterior 4 litros", veces: 2, precio: 46000 },
  { que: "Escalera de aluminio 5 escalones", veces: 1, precio: 118000 },
];

// ---------------------------------------------------------------- Búsqueda

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Busca como la app real: varias palabras en cualquier orden, sin acentos ni mayúsculas,
 * por nombre, marca, código del proveedor o código de barras.
 */
export function buscarProductos(productos: Producto[], consulta: string): Producto[] {
  const palabras = normalizar(consulta).split(" ").filter(Boolean);
  if (palabras.length === 0) return [];
  return productos.filter((p) => {
    const donde = normalizar(`${p.nombre} ${p.marca} ${p.codigoDeBarras ?? ""} ${p.proveedores.map((x) => x.codigo).join(" ")}`);
    return palabras.every((palabra) => donde.includes(palabra));
  });
}

/** Busca por nombre en cualquier lista de cosas con nombre (clientes, proveedores, usuarios). */
export function buscarPorNombre<T extends { nombre: string }>(lista: T[], consulta: string): T[] {
  const palabras = normalizar(consulta).split(" ").filter(Boolean);
  return lista.filter((x) => palabras.every((palabra) => normalizar(x.nombre).includes(palabra)));
}

export function usuarioDe(id: string): Usuario | undefined {
  return USUARIOS.find((u) => u.id === id);
}

export function proveedorDe(id: string): Proveedor | undefined {
  return PROVEEDORES.find((p) => p.id === id);
}

export function clienteDe(id: string | null): Cliente | undefined {
  return CLIENTES.find((c) => c.id === id);
}
