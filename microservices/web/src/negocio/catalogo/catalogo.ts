import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { normalizar } from "../../plataforma/busqueda/busqueda";
import { api, ErrorApi, esFaltaDeRed, EVENTO_CAMBIO } from "../../datos/conexion";
import { cambiosDeProductosPendientes, enviarOEncolar } from "../../datos/almacenamiento";
import { loBajado, type Bajado } from "../../datos/almacenamiento";
import type { Producto } from "../../datos/almacenamiento";
import type { CambiosDeProducto, PaginaDeProductos } from "@servidor/productos";
import type { FilaDeStock } from "@servidor/stock";
import type { Cliente } from "@servidor/clientes";
import type { Unidad } from "./unidades";
import type { Disponibilidad } from "./stock-y-filtros";

// El catálogo vive en el servidor (specs/018, RF-122; ADR-023). El dispositivo no lo baja ni lo
// guarda: cada pantalla pide lo que muestra (una búsqueda, un código, unos productos, una página
// de la lista) y recibe solo eso, de a 50, con su precio, su margen, sus proveedores y su stock.
// Lo que fue llegando queda en memoria mientras la aplicación está abierta, compartido por todas
// las pantallas: así una ficha o un renglón de la venta se ven sin volver a pedirlos. Sin
// conexión se busca en lo que se bajó a mano para trabajar sin conexión (historia 5); si no se
// bajó nada, no se busca (RF-123) y se sigue vendiendo con lo que ya está en la venta.
export type StockFila = FilaDeStock;
export type { Cliente };
type Cambios = Partial<Pick<Producto, "margen_elegido" | "codigo_barras" | "codigo_leido_en" | "foto_url"> & { unidad: Unidad; proveedor_preferido_id?: string }>;
type Estado = { catalogo: Producto[]; stock: Map<string, number>; clientes: Cliente[]; error: string | null; buscando: boolean };

export const SIN_CONEXION_PARA_BUSCAR = "Sin conexión: para buscar productos hace falta internet.";
const POR_PAGINA = 50;
const REFRESCO_MS = 60_000; // una búsqueda ya hecha se vuelve a pedir si pasó este tiempo

let estado: Estado = { catalogo: [], stock: new Map(), clientes: [], error: null, buscando: false };
const oyentes = new Set<() => void>();
function poner(cambios: Partial<Estado>) { estado = { ...estado, ...cambios }; oyentes.forEach((o) => o()); }
const suscribir = (oyente: () => void) => { oyentes.add(oyente); return () => { oyentes.delete(oyente); }; };

const porId = new Map<string, Producto>();
const comparar = new Intl.Collator("es").compare;

// Cambios hechos acá que todavía no confirmó el servidor: van encima de lo que llega.
const enVuelo = new Map<string, Cambios>();

// Lo que llega del servidor se suma a la memoria, con lo que falta mandar encima, y su stock.
async function sumar(pagina: PaginaDeProductos): Promise<Producto[]> {
  const enCola = pagina.productos.length ? await cambiosDeProductosPendientes().catch(() => new Map<string, Record<string, unknown>>()) : new Map();
  const stock = new Map(estado.stock);
  const llegados = pagina.productos.map((p) => {
    const local = { ...enCola.get(p.id), ...enVuelo.get(p.id) } as Partial<Producto>;
    const nuevo = Object.keys(local).length ? { ...p, ...local } : p;
    porId.set(p.id, nuevo);
    // El servidor no manda el stock de los que nunca tuvieron movimientos: no tienen.
    stock.set(p.id, Number(pagina.stock[p.id] ?? 0));
    return nuevo;
  });
  if (llegados.length) poner({ catalogo: [...porId.values()].sort((a, b) => comparar(a.descripcion, b.descripcion)), stock });
  return llegados;
}

const sinConexion = esFaltaDeRed;

// ---------- Sin conexión, lo bajado a mano (historia 5) ----------

// Lo bajado, como si lo hubiera contestado el servidor: la misma forma, para sumarlo igual.
const comoPagina = (b: Bajado, productos: Producto[], hayMas = false, total = productos.length) =>
  ({ productos, stock: Object.fromEntries(productos.map((p) => [p.id, String(b.stock.get(p.id) ?? 0)])), hay_mas: hayMas, total }) as unknown as PaginaDeProductos;
// La descarga trae, de cada producto, los códigos de todos sus proveedores (no solo el del que
// fija el costo): sin conexión se encuentra por cualquiera de ellos, como en el servidor.
type ConCodigosBajados = Producto & { codigos?: (string | null)[] };
const codigosDe = (p: ConCodigosBajados) => [p.codigo_proveedor, p.codigo_barras, ...(p.codigos ?? [])];
// La regla de búsqueda del servidor (specs/018, E03), para lo bajado sin conexión y para lo que se
// muestra mientras el servidor contesta: así el orden no cambia al llegar la respuesta. Cada
// palabra es el comienzo de una palabra de la descripción o la marca, o el comienzo de un código;
// lo escrito entero, con sus signos, también vale como comienzo de un código (TA-81, decisión 139);
// primero las descripciones más cortas.
const palabrasDe = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
function comoElServidor(ps: Producto[], consulta: string): Producto[] {
  const palabras = palabrasDe(consulta).slice(0, 8);
  const entero = consulta.trim().toLowerCase();
  if (!palabras.length) return [];
  return ps.filter((p) => {
    const texto = ` ${palabrasDe(`${p.descripcion} ${p.marca ?? ""}`).join(" ")}`;
    const codigos = [p.codigo_barras, ...((p as ConCodigosBajados).codigos ?? [p.codigo_proveedor])].filter((c): c is string => Boolean(c)).map((c) => c.toLowerCase());
    return palabras.every((w) => texto.includes(` ${w}`) || codigos.some((c) => c.startsWith(w))) || codigos.some((c) => c.startsWith(entero));
  }).sort((a, b) => a.descripcion.length - b.descripcion.length || comparar(a.descripcion, b.descripcion));
}
const claveDeMarca = (m: string) => m.trim().toLocaleLowerCase("es-AR");
function buscarEnLoBajado(b: Bajado, c: { buscar?: string; codigo?: string; ids?: string[]; marca?: string | null; disponibilidad?: Disponibilidad }): Producto[] {
  let r: Producto[] = c.buscar?.trim() ? comoElServidor(b.productos, c.buscar) : [...b.productos].sort((x, y) => comparar(x.descripcion, y.descripcion));
  if (c.codigo) r = r.filter((p) => codigosDe(p).includes(c.codigo!));
  if (c.ids) { const ids = new Set(c.ids); r = r.filter((p) => ids.has(p.id)); }
  if (c.marca) r = r.filter((p) => p.marca && claveDeMarca(p.marca) === claveDeMarca(c.marca!));
  if (c.disponibilidad && c.disponibilidad !== "todos") r = r.filter((p) => ((b.stock.get(p.id) ?? 0) > 0) === (c.disponibilidad === "con-stock"));
  return r;
}
// Las marcas de unos productos, sin repetir (como se escribió en la primera) y en orden.
function marcasDe(ps: Producto[]): string[] {
  const porClave = new Map<string, string>();
  for (const p of ps) { const m = p.marca?.trim(); if (m && !porClave.has(claveDeMarca(m))) porClave.set(claveDeMarca(m), m); }
  return [...porClave.values()].sort((x, y) => x.localeCompare(y, "es-AR", { sensitivity: "base" }));
}
// Si falla por falta de conexión y hay algo bajado, contesta lo bajado; si no, el mismo error.
async function oLoBajado<T>(pedido: Promise<T>, conLoBajado: (b: Bajado) => T | Promise<T>): Promise<T> {
  try { return await pedido; }
  catch (e) {
    const b = sinConexion(e) ? await loBajado() : null;
    if (!b) throw e;
    return conLoBajado(b);
  }
}
function pedirPagina(consulta: Record<string, string | number | undefined>): Promise<PaginaDeProductos> {
  const q = new URLSearchParams(Object.entries(consulta).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== "").map(([k, v]) => [k, String(v)]));
  return api<PaginaDeProductos>(`/productos/pagina${q.size ? `?${q}` : ""}`);
}

// ---------- Buscar ----------

// Cada búsqueda que se le hizo al servidor, con lo que trajo en su orden, y las que están en vuelo.
// Se recuerdan por lo escrito y, en Pedidos e Ingreso, por el proveedor cuyos productos van
// primero (el servidor los ordena así sobre todo lo encontrado, no solo sobre los primeros 50).
const SEPARADOR = "\u0000";
const llaveDe = (clave: string, primero?: string | null) => (primero ? `${clave}${SEPARADOR}${primero}` : clave);
const partesDe = (llave: string): [string, string | undefined] => { const [clave, primero] = llave.split(SEPARADOR); return [clave!, primero]; };
// Sin conexión, el mismo orden con lo bajado: primero los que trae ese proveedor.
const delProveedor = (p: Producto, proveedorId: string) => p.proveedor_id === proveedorId || (p.proveedores ?? []).some((x) => x.proveedor_id === proveedorId);
const primeroLosDe = (ps: Producto[], proveedorId?: string) => (proveedorId ? [...ps.filter((p) => delProveedor(p, proveedorId)), ...ps.filter((p) => !delProveedor(p, proveedorId))] : ps);
const busquedas = new Map<string, { ids: string[]; cuando: number }>();
const enVueloPorClave = new Map<string, Promise<void>>();
let espera: ReturnType<typeof setTimeout> | null = null;
let pedida: string | null = null;

function buscarYa(clave: string): Promise<void> {
  const [texto, primero] = partesDe(clave);
  const enVuelo = enVueloPorClave.get(clave);
  if (enVuelo) return enVuelo;
  poner({ buscando: true });
  let sinRed = false;
  const pedido = oLoBajado(pedirPagina({ buscar: texto, primero, limite: POR_PAGINA }), (b) => { sinRed = true; return comoPagina(b, primeroLosDe(buscarEnLoBajado(b, { buscar: texto }), primero).slice(0, POR_PAGINA)); })
    .then(async (pagina) => {
      // Lo contestado con lo bajado se vuelve a preguntar al servidor enseguida, por si volvió la conexión.
      busquedas.set(clave, { ids: pagina.productos.map((p) => p.id), cuando: sinRed ? Date.now() - REFRESCO_MS + 5000 : Date.now() });
      await sumar(pagina);
      poner({ error: null });
    })
    .catch((e: unknown) => poner({ error: sinConexion(e) ? SIN_CONEXION_PARA_BUSCAR : (e as Error).message }))
    .finally(() => { enVueloPorClave.delete(clave); if (pedida === clave) pedida = null; poner({ buscando: enVueloPorClave.size > 0 }); });
  enVueloPorClave.set(clave, pedido);
  return pedido;
}

// Un cambio guardado (una venta, un ajuste de stock, un margen, una lista) puede cambiar lo que
// contestó una búsqueda: la próxima vuelve a preguntarle al servidor en vez de usar lo recordado.
if (typeof window !== "undefined") window.addEventListener(EVENTO_CAMBIO, () => { busquedas.clear(); });

// Se espera a que la persona deje de escribir: una consulta por búsqueda, no por letra.
function pedirBusqueda(clave: string) {
  if (pedida === clave || enVueloPorClave.has(clave)) return;
  pedida = clave;
  if (espera) clearTimeout(espera);
  espera = setTimeout(() => { espera = null; void buscarYa(clave); }, 300);
}

// Si lo que se ve de esta búsqueda ya es lo que contestó el servidor (o lo bajado, sin conexión).
export function busquedaAlDia(consulta: string, primero?: string | null): boolean {
  const texto = normalizar(consulta);
  const clave = llaveDe(texto, primero);
  return !texto || (busquedas.has(clave) && pedida !== clave && !enVueloPorClave.has(clave));
}
// Lo encontrado para lo escrito, sin esperar a que se deje de escribir: para Enter, que no puede
// tomar la lista de una búsqueda vieja ni la de memoria mientras el servidor contesta.
export async function esperarBusqueda(consulta: string, maximo = POR_PAGINA, primero?: string | null): Promise<Producto[]> {
  const texto = normalizar(consulta);
  if (!texto) return [];
  const clave = llaveDe(texto, primero);
  if (!busquedaAlDia(consulta, primero)) {
    if (pedida === clave) { if (espera) clearTimeout(espera); espera = null; pedida = null; }
    await buscarYa(clave);
  }
  return resultadosDe(consulta, maximo, primero);
}

// Lo que se ve de una búsqueda: lo que contestó el servidor, en su orden. Mientras contesta, lo
// que ya está en memoria y coincide, para no mostrar la lista vacía.
function resultadosDe(consulta: string, maximo: number, primero?: string | null): Producto[] {
  const texto = normalizar(consulta);
  if (!texto) return [];
  const clave = llaveDe(texto, primero);
  const hecha = busquedas.get(clave);
  if (!hecha || Date.now() - hecha.cuando > REFRESCO_MS) pedirBusqueda(clave);
  if (hecha) return hecha.ids.map((id) => porId.get(id)).filter((p): p is Producto => Boolean(p)).slice(0, maximo);
  return primeroLosDe(comoElServidor(estado.catalogo, consulta), primero ?? undefined).slice(0, maximo);
}

// Un producto que ya llegó en esta sesión, si llegó.
export const productoEnMemoria = (id: string): Producto | undefined => porId.get(id);

// Un producto por su código de barras o de proveedor, preguntándole al servidor. Si la consulta
// falla no se sabe si el producto existe: se dice eso, no «no existe».
export async function traerPorCodigo(codigo: string): Promise<Producto | null> {
  try { return (await sumar(await oLoBajado(pedirPagina({ codigo, limite: 1 }), (b) => comoPagina(b, buscarEnLoBajado(b, { codigo }).slice(0, 1)))))[0] ?? null; }
  catch (e) { throw sinConexion(e) ? new Error(SIN_CONEXION_PARA_BUSCAR) : e; }
}

// Otro producto que ya tiene ese código de barras (para avisarlo al cargárselo a uno), o ninguno.
// Sin conexión no se sabe: ninguno.
export async function quienTieneElCodigo(codigo: string, salvo: string): Promise<Producto | undefined> {
  const pagina = await pedirPagina({ codigo, limite: 5 }).catch(() => null);
  return pagina ? (await sumar(pagina)).find((p) => p.id !== salvo && p.codigo_barras === codigo) : undefined;
}

// Los productos que una pantalla necesita por su identificador (los de un pedido, los de la
// venta del otro dispositivo, los que tienen stock), de a 200. `deNuevo` los vuelve a pedir aunque
// ya estén en memoria.
export async function traerPorIds(ids: readonly string[], deNuevo = false): Promise<void> {
  const faltan = [...new Set(ids)].filter((id) => deNuevo || !porId.has(id));
  for (let i = 0; i < faltan.length; i += 200) {
    const ids = faltan.slice(i, i + 200);
    await oLoBajado(pedirPagina({ ids: ids.join(","), limite: 200 }), (b) => comoPagina(b, buscarEnLoBajado(b, { ids }))).then(sumar).catch(() => undefined);
  }
}

// ---------- La lista de Catálogo y Productos, de a páginas ----------

export type ConsultaDeLista = { buscar: string; marca: string | null; disponibilidad: Disponibilidad };

// Los primeros 50 de la consulta, y los siguientes con `cargarMas` (al llegar al final de la
// lista). Una consulta nueva empieza de cero; lo que llega tarde de una vieja se descarta.
export function useListaDeProductos(consulta: ConsultaDeLista) {
  useSyncExternalStore(suscribir, () => estado);
  const clave = JSON.stringify([normalizar(consulta.buscar), consulta.marca, consulta.disponibilidad]);
  const [lista, setLista] = useState<{ clave: string; ids: string[]; hayMas: boolean; total: number; cargando: boolean; error: string | null }>({ clave, ids: [], hayMas: false, total: 0, cargando: true, error: null });

  const cargar = useCallback((desde: number) => {
    setLista((l) => ({ ...l, cargando: true, error: null }));
    const [buscarTexto, marca, disponibilidad] = JSON.parse(clave) as [string, string | null, Disponibilidad];
    oLoBajado(pedirPagina({ buscar: buscarTexto, marca: marca ?? undefined, disponibilidad: disponibilidad === "todos" ? undefined : disponibilidad, desde, limite: POR_PAGINA }), (b) => {
      const todos = buscarEnLoBajado(b, { buscar: buscarTexto, marca, disponibilidad });
      return comoPagina(b, todos.slice(desde, desde + POR_PAGINA), desde + POR_PAGINA < todos.length, todos.length);
    })
      .then(async (pagina) => {
        const llegados = await sumar(pagina);
        setLista((l) => (l.clave !== clave ? l : { clave, ids: [...(desde ? l.ids : []), ...llegados.map((p) => p.id)], hayMas: pagina.hay_mas, total: pagina.total, cargando: false, error: null }));
      })
      .catch((e: unknown) => setLista((l) => (l.clave !== clave ? l : { ...l, cargando: false, error: sinConexion(e) ? SIN_CONEXION_PARA_BUSCAR : (e as Error).message })));
  }, [clave]);

  useEffect(() => { setLista({ clave, ids: [], hayMas: false, total: 0, cargando: true, error: null }); cargar(0); }, [clave, cargar]);
  const actual = lista.clave === clave ? lista : { ids: [], hayMas: false, total: 0, cargando: true, error: null };
  const cargarMas = useCallback(() => { if (!lista.cargando && lista.hayMas && lista.clave === clave) cargar(lista.ids.length); }, [lista, clave, cargar]);
  return {
    productos: actual.ids.map((id) => porId.get(id)).filter((p): p is Producto => Boolean(p)),
    hayMas: actual.hayMas, total: actual.total, cargando: actual.cargando, error: actual.error, cargarMas, reintentar: () => cargar(actual.ids.length),
  };
}

// Las marcas para el filtro: las de lo encontrado o, sin búsqueda, las del catálogo (015-E29).
// Se piden mientras el filtro está abierto.
export function useMarcas(buscarTexto: string, pedir: boolean): string[] {
  const [marcas, setMarcas] = useState<string[]>([]);
  const clave = normalizar(buscarTexto);
  useEffect(() => {
    if (!pedir) return;
    let vigente = true;
    oLoBajado(api<string[]>(`/productos/marcas${clave ? `?buscar=${encodeURIComponent(clave)}` : ""}`), (b) => marcasDe(buscarEnLoBajado(b, { buscar: clave })))
      .then((m) => { if (vigente) setMarcas(m); }).catch(() => undefined);
    return () => { vigente = false; };
  }, [clave, pedir]);
  return marcas;
}

// ---------- Los clientes ----------

// Llevan su deuda, que cambia con cada venta a cuenta corriente: se piden al abrir Vender, no
// en cada pantalla (specs/018).
let clientesPedidos = 0;
export function pedirClientes() {
  if (Date.now() - clientesPedidos < REFRESCO_MS) return;
  clientesPedidos = Date.now();
  oLoBajado(api<Cliente[]>("/clientes"), (b) => b.clientes).then((clientes) => poner({ clientes })).catch(() => { clientesPedidos = 0; });
}

// ---------- Cambiar un producto ----------

function ponerEnMemoria(id: string, cambios: Partial<Producto>) {
  const p = porId.get(id);
  if (!p) return;
  porId.set(id, { ...p, ...cambios });
  poner({ catalogo: estado.catalogo.map((x) => (x.id === id ? porId.get(id)! : x)) });
}

async function actualizarProducto(id: string, cambiosPedidos: Cambios) {
  // Cargar o cambiar el código anota la hora de la lectura (specs/016, RF-112): la de acá, que sin
  // conexión es la de verdad aunque el cambio llegue al servidor más tarde. Borrarlo la borra.
  const cambios: Cambios = "codigo_barras" in cambiosPedidos && cambiosPedidos.codigo_leido_en === undefined
    ? { ...cambiosPedidos, codigo_leido_en: cambiosPedidos.codigo_barras ? new Date().toISOString() : null } : cambiosPedidos;
  const previo = porId.get(id);
  enVuelo.set(id, { ...enVuelo.get(id), ...cambios });
  ponerEnMemoria(id, cambios);
  const cuerpo: CambiosDeProducto = {};
  if ("margen_elegido" in cambios) cuerpo.margen_elegido = cambios.margen_elegido ?? null;
  if ("codigo_barras" in cambios) cuerpo.codigo_barras = cambios.codigo_barras ?? null;
  if (cambios.codigo_leido_en && cuerpo.codigo_barras) cuerpo.codigo_leido_en = cambios.codigo_leido_en;
  if ("unidad" in cambios) cuerpo.unidad = cambios.unidad ?? "unidad";
  if ("foto_url" in cambios) cuerpo.foto_url = cambios.foto_url ?? null;
  if ("proveedor_preferido_id" in cambios) cuerpo.proveedor_preferido_id = cambios.proveedor_preferido_id ?? null;
  const r = enviarOEncolar("producto.cambio", "PATCH", `/productos/${id}`, cuerpo);
  void r.then(() => {
    enVuelo.delete(id);
    // Cambiar el proveedor preferido cambia el costo vigente y el precio: se vuelve a pedir.
    if ("proveedor_preferido_id" in cambios) void traerPorIds([id], true);
  }, (e: unknown) => {
    enVuelo.delete(id);
    // Un código que el servidor rechaza no quedó cargado: vuelve el que estaba, con su última
    // lectura (specs/016, E12). Sin conexión el cambio queda en cola y no se deshace.
    if (e instanceof ErrorApi && "codigo_barras" in cambios && previo) ponerEnMemoria(id, { codigo_barras: previo.codigo_barras, codigo_leido_en: previo.codigo_leido_en ?? null });
  });
  return r;
}

// Stock que ve el mostrador después de un movimiento local (venta sin conexión).
function ajustarStockLocal(id: string, delta: number) {
  // Una venta nunca deja el stock por debajo de cero (RF-59): baja hasta cero y no más.
  const n = new Map(estado.stock); const hay = n.get(id) ?? 0;
  n.set(id, delta < 0 ? Math.min(hay, Math.max(0, hay + delta)) : hay + delta);
  poner({ stock: n });
}

export function useCatalogo() {
  const e = useSyncExternalStore(suscribir, () => estado);
  // `primero`: el proveedor cuyos productos van primero (Pedidos, Ingreso).
  const buscarProductos = useCallback((consulta: string, maximo = POR_PAGINA, primero?: string | null) => resultadosDe(consulta, maximo, primero), [e]);
  return { catalogo: e.catalogo, buscandoEnElServidor: e.buscando, stock: e.stock, clientes: e.clientes, error: e.error, buscarProductos, actualizarProducto, ajustarStockLocal };
}

// Para las pruebas: la memoria vacía, como al abrir la aplicación.
export function olvidarTodo() {
  porId.clear(); busquedas.clear(); enVueloPorClave.clear(); enVuelo.clear(); clientesPedidos = 0; pedida = null;
  if (espera) clearTimeout(espera);
  espera = null;
  estado = { catalogo: [], stock: new Map(), clientes: [], error: null, buscando: false };
}
