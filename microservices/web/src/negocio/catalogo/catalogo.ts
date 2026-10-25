import { useCallback, useEffect, useState } from "react";
import { normalizar } from "../../plataforma/busqueda";
import { api, ErrorApi } from "../../datos/conexion";
import { enviarOEncolar } from "../../datos/almacenamiento";
import type { Producto } from "../../datos/almacenamiento";
import type { CambiosDeProducto } from "@servidor/productos";
import type { FilaDeStock } from "@servidor/stock";
import type { Cliente } from "@servidor/clientes";
import type { Disponibilidad } from "./stock-y-filtros";
import { buscarEnLoBajado, comoPagina, marcasDe, oLoBajado, pedirPagina, sinConexion } from "./lo-bajado";
import { olvidarLasBusquedas, resultadosDe } from "./busquedas";
import { ajustarStockLocal, enVuelo, losQueEstan, olvidarLaMemoria, poner, ponerEnMemoria, porId, POR_PAGINA, REFRESCO_MS, SIN_CONEXION_PARA_BUSCAR, sumar, useEstado, type Cambios } from "./memoria";

// El catálogo vive en el servidor (specs/018, RF-122; ADR-023). El dispositivo no lo baja ni lo
// guarda: cada pantalla pide lo que muestra (una búsqueda, un código, unos productos, una página
// de la lista) y recibe solo eso, de a 50, con su precio, su margen, sus proveedores y su stock.
// Lo que fue llegando queda en memoria mientras la aplicación está abierta, compartido por todas
// las pantallas: así una ficha o un renglón de la venta se ven sin volver a pedirlos. Sin
// conexión se busca en lo que se bajó a mano para trabajar sin conexión (historia 5); si no se
// bajó nada, no se busca (RF-123) y se sigue vendiendo con lo que ya está en la venta.
export type StockFila = FilaDeStock;
export type { Cliente };
export { SIN_CONEXION_PARA_BUSCAR, productoEnMemoria } from "./memoria";
export { busquedaAlDia, esperarBusqueda } from "./busquedas";

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
  useEstado();
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
    productos: losQueEstan(actual.ids),
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

// Cargar o cambiar el código anota la hora de la lectura (specs/016, RF-112): la de acá, que sin
// conexión es la de verdad aunque el cambio llegue al servidor más tarde. Borrarlo la borra.
const conLaLectura = (c: Cambios): Cambios => ("codigo_barras" in c && c.codigo_leido_en === undefined ? { ...c, codigo_leido_en: c.codigo_barras ? new Date().toISOString() : null } : c);

// Lo que se le manda al servidor: solo lo que cambió, y la hora de la lectura solo con un código.
function cuerpoDe(cambios: Cambios): CambiosDeProducto {
  const cuerpo: CambiosDeProducto = {};
  if ("margen_elegido" in cambios) cuerpo.margen_elegido = cambios.margen_elegido ?? null;
  if ("codigo_barras" in cambios) cuerpo.codigo_barras = cambios.codigo_barras ?? null;
  if (cambios.codigo_leido_en && cuerpo.codigo_barras) cuerpo.codigo_leido_en = cambios.codigo_leido_en;
  return { ...cuerpo, ...otrosCambios(cambios) };
}
function otrosCambios(cambios: Cambios): CambiosDeProducto {
  const cuerpo: CambiosDeProducto = {};
  if ("unidad" in cambios) cuerpo.unidad = cambios.unidad ?? "unidad";
  if ("foto_url" in cambios) cuerpo.foto_url = cambios.foto_url ?? null;
  if ("proveedor_preferido_id" in cambios) cuerpo.proveedor_preferido_id = cambios.proveedor_preferido_id ?? null;
  return cuerpo;
}

async function actualizarProducto(id: string, cambiosPedidos: Cambios) {
  const cambios = conLaLectura(cambiosPedidos);
  const previo = porId.get(id);
  enVuelo.set(id, { ...enVuelo.get(id), ...cambios });
  ponerEnMemoria(id, cambios);
  const r = enviarOEncolar("producto.cambio", "PATCH", `/productos/${id}`, cuerpoDe(cambios));
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

export function useCatalogo() {
  const e = useEstado();
  // `primero`: el proveedor cuyos productos van primero (Pedidos, Ingreso).
  const buscarProductos = useCallback((consulta: string, maximo = POR_PAGINA, primero?: string | null) => resultadosDe(consulta, maximo, primero), [e]);
  return { catalogo: e.catalogo, buscandoEnElServidor: e.buscando, stock: e.stock, clientes: e.clientes, error: e.error, buscarProductos, actualizarProducto, ajustarStockLocal };
}

// Para las pruebas: la memoria vacía, como al abrir la aplicación.
export function olvidarTodo() {
  olvidarLaMemoria(); olvidarLasBusquedas(); clientesPedidos = 0;
}
