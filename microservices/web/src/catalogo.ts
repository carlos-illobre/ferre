import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { buscar, indexar, normalizar } from "./plataforma/busqueda/busqueda";
import { api, ErrorApi } from "./api";
import { cambiosDeProductosPendientes, enviarOEncolar } from "./cola";
import type { Producto } from "./producto";
import type { CambiosDeProducto, PaginaDeProductos } from "@servidor/productos";
import type { FilaDeStock } from "@servidor/stock";
import type { Cliente } from "@servidor/clientes";
import type { Unidad } from "./unidades";
import type { Disponibilidad } from "./negocio/catalogo/stock-y-filtros";

// El catálogo vive en el servidor (specs/018, RF-122; ADR-023). El dispositivo no lo baja ni lo
// guarda: cada pantalla pide lo que muestra (una búsqueda, un código, unos productos, una página
// de la lista) y recibe solo eso, de a 50, con su precio, su margen, sus proveedores y su stock.
// Lo que fue llegando queda en memoria mientras la aplicación está abierta, compartido por todas
// las pantallas: así una ficha o un renglón de la venta se ven sin volver a pedirlos. Sin
// conexión no se busca (RF-123): se sigue vendiendo con lo que ya está en la venta.
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

const sinConexion = (e: unknown) => !(e instanceof ErrorApi);
function pedirPagina(consulta: Record<string, string | number | undefined>): Promise<PaginaDeProductos> {
  const q = new URLSearchParams(Object.entries(consulta).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== "").map(([k, v]) => [k, String(v)]));
  return api<PaginaDeProductos>(`/productos/pagina${q.size ? `?${q}` : ""}`);
}

// ---------- Buscar ----------

// Cada búsqueda que se le hizo al servidor, con lo que trajo en su orden.
const busquedas = new Map<string, { ids: string[]; cuando: number }>();
let enCurso = 0;
let espera: ReturnType<typeof setTimeout> | null = null;
let pedida: string | null = null;

// Se espera a que la persona deje de escribir: una consulta por búsqueda, no por letra.
function pedirBusqueda(clave: string) {
  if (pedida === clave) return;
  pedida = clave;
  if (espera) clearTimeout(espera);
  espera = setTimeout(() => {
    espera = null;
    enCurso += 1; poner({ buscando: true });
    pedirPagina({ buscar: clave, limite: POR_PAGINA })
      .then(async (pagina) => {
        busquedas.set(clave, { ids: pagina.productos.map((p) => p.id), cuando: Date.now() });
        await sumar(pagina);
        poner({ error: null });
      })
      .catch((e: unknown) => poner({ error: sinConexion(e) ? SIN_CONEXION_PARA_BUSCAR : (e as Error).message }))
      .finally(() => { enCurso -= 1; if (pedida === clave) pedida = null; poner({ buscando: enCurso > 0 }); });
  }, 300);
}

// Lo que se ve de una búsqueda: lo que contestó el servidor, en su orden. Mientras contesta, lo
// que ya está en memoria y coincide, para no mostrar la lista vacía.
function resultadosDe(consulta: string, maximo: number): Producto[] {
  const clave = normalizar(consulta);
  if (!clave) return [];
  const hecha = busquedas.get(clave);
  if (!hecha || Date.now() - hecha.cuando > REFRESCO_MS) pedirBusqueda(clave);
  if (hecha) return hecha.ids.map((id) => porId.get(id)).filter((p): p is Producto => Boolean(p)).slice(0, maximo);
  return buscar(indexar(estado.catalogo.map((p) => ({ ...p, codigos: [p.codigo_proveedor, p.codigo_barras] }))), consulta, maximo);
}

// Un producto que ya llegó en esta sesión, si llegó.
export const productoEnMemoria = (id: string): Producto | undefined => porId.get(id);

// Un producto por su código de barras o de proveedor, preguntándole al servidor. Si la consulta
// falla no se sabe si el producto existe: se dice eso, no «no existe».
export async function traerPorCodigo(codigo: string): Promise<Producto | null> {
  try { return (await sumar(await pedirPagina({ codigo, limite: 1 })))[0] ?? null; }
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
  for (let i = 0; i < faltan.length; i += 200) await pedirPagina({ ids: faltan.slice(i, i + 200).join(","), limite: 200 }).then(sumar).catch(() => undefined);
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
    pedirPagina({ buscar: buscarTexto, marca: marca ?? undefined, disponibilidad: disponibilidad === "todos" ? undefined : disponibilidad, desde, limite: POR_PAGINA })
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
    api<string[]>(`/productos/marcas${clave ? `?buscar=${encodeURIComponent(clave)}` : ""}`).then((m) => { if (vigente) setMarcas(m); }).catch(() => undefined);
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
  api<Cliente[]>("/clientes").then((clientes) => poner({ clientes })).catch(() => { clientesPedidos = 0; });
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
  const buscarProductos = useCallback((consulta: string, maximo = POR_PAGINA) => resultadosDe(consulta, maximo), [e]);
  return { catalogo: e.catalogo, buscandoEnElServidor: e.buscando, stock: e.stock, clientes: e.clientes, error: e.error, buscarProductos, actualizarProducto, ajustarStockLocal };
}

// Para las pruebas: la memoria vacía, como al abrir la aplicación.
export function olvidarTodo() {
  porId.clear(); busquedas.clear(); enVuelo.clear(); clientesPedidos = 0; pedida = null;
  if (espera) clearTimeout(espera);
  espera = null; enCurso = 0;
  estado = { catalogo: [], stock: new Map(), clientes: [], error: null, buscando: false };
}
