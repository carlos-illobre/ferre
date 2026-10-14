import { useCallback, useEffect, useSyncExternalStore } from "react";
import { buscar, indexar } from "./plataforma/busqueda/busqueda";
import { buscaEnElServidor } from "./guardado";
import { api, EVENTO_CAMBIO } from "./api";
import { borrar, guardar, guardarMeta, leerMeta, leerTodo, reemplazarTodo } from "./almacen";
import { cambiosDeProductosPendientes, enviarOEncolar, enviarPendientes } from "./cola";
import type { Producto } from "./producto";

// Los datos del mostrador (catálogo, stock, clientes) en memoria y en IndexedDB (#18):
// arrancan desde el dispositivo, se refrescan del servidor cuando hay conexión, y los
// cambios hechos acá salen por la cola si no hay red.
//
// Se cargan UNA vez para toda la aplicación y las pantallas los comparten: antes cada
// pantalla volvía a leer el catálogo entero, a armar el índice y a bajarlo del servidor al
// abrirse, y con miles de productos eso eran segundos de espera en un celular (#69).
// El orden de carga:
//   1. Los primeros productos, guardados aparte: una lectura chica, se ven al instante.
//   2. El catálogo entero del dispositivo, atrás.
//   3. El del servidor, atrás también; si no cambió nada, no se toca la pantalla.
// El índice de búsqueda se arma recién cuando alguien busca.
export type StockFila = { id: string; stock: string; costo_neto: string | null; proveedor: string | null; valor: string; ultimo_movimiento: string | null };
export type Cliente = { id: string; nombre: string; telefono: string | null; cuenta_corriente: boolean; deuda: string };
type Cambios = Partial<Pick<Producto, "margen_elegido" | "codigo_barras" | "unidad" | "foto_url"> & { proveedor_preferido_id?: string }>;
// `completo`: el catálogo ya está entero (no solo los primeros, ni una tanda de la primera bajada).
// `buscando`: hay una consulta al servidor en curso (solo cuando se busca en el servidor, RF-85).
type Estado = { catalogo: Producto[] | null; completo: boolean; stock: Map<string, number>; clientes: Cliente[]; error: string | null; desdeDispositivo: boolean; buscando: boolean };

const PRIMEROS = 60;            // los que se guardan aparte para mostrar al instante
const TANDA = 5000;             // la primera vez, el servidor se baja de a tandas
const REFRESCO_MS = 60_000;     // al abrir una pantalla se vuelve a consultar al servidor si pasó este tiempo

let estado: Estado = { catalogo: null, completo: false, stock: new Map(), clientes: [], error: null, desdeDispositivo: false, buscando: false };
const oyentes = new Set<() => void>();
function poner(cambios: Partial<Estado>) { estado = { ...estado, ...cambios }; oyentes.forEach((o) => o()); }
const suscribir = (oyente: () => void) => { oyentes.add(oyente); return () => { oyentes.delete(oyente); }; };

// El mismo orden que usa el servidor (por descripción), para que la lista no salte al completarse.
const comparar = new Intl.Collator("es").compare;
const ordenar = (lista: Producto[]) => [...lista].sort((a, b) => comparar(a.descripcion, b.descripcion));

// El índice se arma una vez por catálogo, la primera vez que se busca.
let indice: { de: Producto[]; valor: ReturnType<typeof indexar<Producto & { codigos: (string | null)[] }>> } | null = null;
function buscarEn(catalogo: Producto[] | null, consulta: string, maximo: number) {
  if (!catalogo) return [];
  if (indice?.de !== catalogo) indice = { de: catalogo, valor: indexar(catalogo.map((p) => ({ ...p, codigos: [p.codigo_proveedor, p.codigo_barras] }))) };
  return buscar(indice.valor, consulta, maximo);
}

// Buscar en el servidor (RF-85): un celular que no guarda el catálogo y eligió no bajarlo tiene
// en memoria solo lo que fue trayendo. Buscar o escanear mira primero ahí y después le pregunta
// al servidor; lo que llega se suma a la memoria y la pantalla lo muestra.
let consultasEnCurso = 0;
const yaBuscado = new Set<string>();
let espera: ReturnType<typeof setTimeout> | null = null;
function sumar(traidos: Producto[]) {
  if (traidos.length === 0) return;
  const porId = new Map((estado.catalogo ?? []).map((p) => [p.id, p]));
  let cambio = false;
  for (const p of traidos) { const viejo = porId.get(p.id); if (!viejo || JSON.stringify(viejo) !== JSON.stringify(p)) { porId.set(p.id, p); cambio = true; } }
  if (cambio) poner({ catalogo: ordenar([...porId.values()]) });
}
async function traer(consulta: string): Promise<Producto[]> {
  consultasEnCurso += 1; poner({ buscando: true });
  try { const traidos = await api<Producto[]>(`/productos?${consulta}`); sumar(traidos); return traidos; }
  finally { consultasEnCurso -= 1; if (consultasEnCurso === 0) poner({ buscando: false }); }
}
function pedirAlServidor(consulta: string) {
  const clave = consulta.trim().toLowerCase();
  if (clave.length < 2 || yaBuscado.has(clave)) return;
  if (espera) clearTimeout(espera);
  // Se espera a que la persona deje de escribir: una consulta por búsqueda, no por letra.
  espera = setTimeout(() => {
    yaBuscado.add(clave);
    traer(`buscar=${encodeURIComponent(clave)}&limite=60`).catch(() => { yaBuscado.delete(clave); });
  }, 300);
}
// Un producto por su código de barras o de proveedor: de la memoria o, si no está, del servidor.
export async function traerPorCodigo(codigo: string): Promise<Producto | null> {
  const es = (p: Producto) => p.codigo_barras === codigo || p.codigo_proveedor === codigo;
  const local = (estado.catalogo ?? []).find(es);
  if (local || !buscaEnElServidor()) return local ?? null;
  // Si la consulta falla no se sabe si el producto existe: se dice eso, no «no existe».
  try { return (await traer(`codigo=${encodeURIComponent(codigo)}`)).find(es) ?? null; }
  catch { throw new Error(`No se pudo buscar el código ${codigo}: no hay conexión con el servidor. Probá de nuevo.`); }
}
// Los productos que una pantalla necesita por su identificador (los de un pedido, los que tienen stock).
export async function traerPorIds(ids: string[]): Promise<void> {
  if (!buscaEnElServidor()) return;
  const tengo = new Set((estado.catalogo ?? []).map((p) => p.id));
  const faltan = [...new Set(ids)].filter((id) => !tengo.has(id));
  for (let i = 0; i < faltan.length; i += 150) await traer(`ids=${faltan.slice(i, i + 150).join(",")}`).catch(() => undefined);
}

// Cambios hechos acá mientras una bajada estaba en vuelo: se vuelven a aplicar sobre lo que llega.
const pendientes = new Map<string, Cambios>();

// Guarda en el dispositivo solo lo que cambió, y los primeros aparte.
async function guardarCatalogo(nuevo: Producto[], anterior: Producto[] | null) {
  if (!anterior) await reemplazarTodo("catalogo", nuevo);
  else {
    const antes = new Map(anterior.map((p) => [p.id, p]));
    const ahora = new Set(nuevo.map((p) => p.id));
    const cambiados = nuevo.filter((p) => antes.get(p.id) !== p);
    const quitados = anterior.filter((p) => !ahora.has(p.id));
    // Muchos cambios juntos (se aplicó una lista): conviene reescribir todo de una vez.
    if (cambiados.length + quitados.length > 200) await reemplazarTodo("catalogo", nuevo);
    else {
      for (const p of cambiados) await guardar("catalogo", p);
      for (const p of quitados) await borrar("catalogo", p.id);
    }
  }
  await guardarMeta("catalogo_primeros", nuevo.slice(0, PRIMEROS));
}

let delDispositivo: Promise<void> | null = null;
function cargarDelDispositivo(): Promise<void> {
  delDispositivo ??= (async () => {
    try {
      const primeros = await leerMeta<Producto[]>("catalogo_primeros");
      if (primeros?.length && !estado.catalogo) poner({ catalogo: primeros, desdeDispositivo: true });
      const [c, s, cl] = await Promise.all([leerTodo<Producto>("catalogo"), leerTodo<StockFila>("stock"), leerTodo<Cliente>("clientes")]);
      const cambios: Partial<Estado> = {};
      // Si el servidor ya contestó mientras tanto, lo del dispositivo llega tarde: no se usa.
      if (c.length && (!estado.catalogo || estado.desdeDispositivo)) { cambios.catalogo = ordenar(c); cambios.desdeDispositivo = true; cambios.completo = true; }
      if (s.length && estado.stock.size === 0) cambios.stock = new Map(s.map((x) => [x.id, Number(x.stock)]));
      if (cl.length && estado.clientes.length === 0) cambios.clientes = cl;
      if (Object.keys(cambios).length) poner(cambios);
    } catch { /* sin IndexedDB: se sigue solo con el servidor */ }
  })();
  return delDispositivo;
}

let enVuelo: Promise<void> | null = null;
let ultimoRefresco = 0;
function refrescarDelServidor(): Promise<void> {
  enVuelo ??= (async () => {
    try {
      // La primera vez en un dispositivo (nada guardado todavía) el catálogo entero tarda:
      // se muestra enseguida una primera tanda y el resto se va sumando atrás, de a tandas
      // grandes. Con el catálogo ya guardado alcanza un solo pedido, que nadie espera.
      const primeraVez = !estado.catalogo;
      const enServidor = buscaEnElServidor();
      const bajarCatalogo = async (): Promise<Producto[]> => {
        // Buscando en el servidor no se baja el catálogo: los primeros, para que la lista no
        // esté vacía, y lo que ya se había traído, para tenerlo al día.
        if (enServidor) {
          const primeros = await api<Producto[]>(`/productos?limite=${PRIMEROS}`);
          const tengo = (estado.catalogo ?? []).map((p) => p.id).filter((id) => !primeros.some((p) => p.id === id));
          const resto: Producto[] = [];
          for (let i = 0; i < tengo.length; i += 150) resto.push(...await api<Producto[]>(`/productos?ids=${tengo.slice(i, i + 150).join(",")}`));
          return primeros.concat(resto);
        }
        if (!primeraVez) return api<Producto[]>("/productos");
        let todo = await api<Producto[]>(`/productos?limite=${PRIMEROS}`);
        // Un servidor que todavía no reparte de a tandas contesta todo junto: listo.
        if (todo.length !== PRIMEROS) return todo;
        poner({ catalogo: todo });
        for (;;) {
          const tanda = await api<Producto[]>(`/productos?limite=${TANDA}&desde=${todo.length}`);
          todo = todo.concat(tanda);
          if (tanda.length < TANDA) return todo;
          poner({ catalogo: todo });
        }
      };
      const [bajado, st, cl] = await Promise.all([
        bajarCatalogo(),
        api<{ productos: StockFila[] }>("/stock").then((d) => d.productos).catch(() => null),
        api<Cliente[]>("/clientes").catch(() => null),
      ]);
      // Lo que quedó en la cola (sin red, o una recarga con el pedido en vuelo) va sobre lo
      // bajado, y se reintenta mandar.
      const enCola = await cambiosDeProductosPendientes();
      // Los productos que no cambiaron conservan el objeto que ya estaba en memoria: así se
      // sabe qué guardar, y si no cambió ninguno la pantalla ni se entera.
      const anterior = estado.catalogo;
      const antes = new Map((primeraVez ? [] : anterior ?? []).map((p) => [p.id, p]));
      let cambio = bajado.length !== antes.size;
      const c = ordenar(bajado).map((p) => {
        const local = { ...enCola.get(p.id), ...pendientes.get(p.id) } as Partial<Producto>;
        const nuevo = Object.keys(local).length ? { ...p, ...local } : p;
        const viejo = antes.get(p.id);
        if (viejo && JSON.stringify(viejo) === JSON.stringify(nuevo)) return viejo;
        cambio = true;
        return nuevo;
      });
      pendientes.clear();
      if (enCola.size) enviarPendientes().catch(() => undefined);
      const cambios: Partial<Estado> = { desdeDispositivo: false, error: null, completo: !enServidor };
      if (cambio || !anterior) cambios.catalogo = c;
      if (st) cambios.stock = new Map(st.map((x) => [x.id, Number(x.stock)]));
      if (cl) cambios.clientes = cl;
      poner(cambios);
      await Promise.all([
        cambio || !anterior ? guardarCatalogo(c, primeraVez ? null : anterior) : null,
        st ? reemplazarTodo("stock", st) : null, cl ? reemplazarTodo("clientes", cl) : null,
        guardarMeta("catalogo_bajado", new Date().toISOString()),
      ]).catch(() => undefined);
      ultimoRefresco = Date.now();
    } catch (e) {
      const estadoHttp = (e as { estado?: number }).estado;
      if (estadoHttp) poner({ error: (e as Error).message });
      else if (!estado.catalogo) poner({ error: "Sin conexión con el servidor y sin catálogo guardado en este dispositivo: conectá una vez para bajarlo." });
    } finally {
      enVuelo = null;
    }
  })();
  return enVuelo;
}

// El stock y los clientes cambian con cada venta, ingreso o corrección, y son livianos: se
// vuelven a pedir cada vez que se abre una pantalla.
let stockEnVuelo = false;
async function refrescarStock() {
  if (stockEnVuelo) return;
  stockEnVuelo = true;
  try {
    const [st, cl] = await Promise.all([api<{ productos: StockFila[] }>("/stock").then((d) => d.productos).catch(() => null), api<Cliente[]>("/clientes").catch(() => null)]);
    const cambios: Partial<Estado> = {};
    if (st) cambios.stock = new Map(st.map((x) => [x.id, Number(x.stock)]));
    if (cl) cambios.clientes = cl;
    if (st || cl) poner(cambios);
    await Promise.all([st ? reemplazarTodo("stock", st) : null, cl ? reemplazarTodo("clientes", cl) : null]).catch(() => undefined);
  } finally { stockEnVuelo = false; }
}

// Lo que cambia el catálogo en el servidor sin pasar por acá (unir duplicados, aplicar una
// lista, un ingreso que trae costos o productos nuevos): la próxima pantalla lo vuelve a pedir.
const CAMBIA_EL_CATALOGO = /^\/(equivalencias|listas|compras)(\/|$)/;
if (typeof window !== "undefined") window.addEventListener(EVENTO_CAMBIO, (e) => { if (CAMBIA_EL_CATALOGO.test(String((e as CustomEvent).detail))) ultimoRefresco = 0; });

// Lo llama cada pantalla al abrirse: la primera vez carga todo; después vuelve a pedir el
// catálogo solo si pasó un rato o si algo lo cambió, y el stock siempre. Nada de eso frena a nadie.
function asegurar() {
  void cargarDelDispositivo().then(() => {
    if (enVuelo) return;
    if (Date.now() - ultimoRefresco > REFRESCO_MS) void refrescarDelServidor(); else void refrescarStock();
  });
}

async function actualizarProducto(id: string, cambios: Cambios) {
  pendientes.set(id, { ...pendientes.get(id), ...cambios });
  const anterior = estado.catalogo;
  if (anterior) {
    const nuevo = anterior.map((p) => (p.id === id ? { ...p, ...cambios } : p));
    poner({ catalogo: nuevo });
    guardarCatalogo(nuevo, anterior).catch(() => undefined);
  }
  const cuerpo: Record<string, number | string | null> = {};
  if ("margen_elegido" in cambios) cuerpo.margen_elegido = cambios.margen_elegido ?? null;
  if ("codigo_barras" in cambios) cuerpo.codigo_barras = cambios.codigo_barras ?? null;
  if ("unidad" in cambios) cuerpo.unidad = cambios.unidad ?? "unidad";
  if ("foto_url" in cambios) cuerpo.foto_url = cambios.foto_url ?? null;
  if ("proveedor_preferido_id" in cambios) cuerpo.proveedor_preferido_id = cambios.proveedor_preferido_id ?? null;
  const r = enviarOEncolar("producto.cambio", "PATCH", `/productos/${id}`, cuerpo);
  // Cambiar el proveedor preferido cambia el costo vigente: se vuelve a bajar el catálogo.
  if ("proveedor_preferido_id" in cambios) void r.then(() => (enVuelo ?? Promise.resolve()).then(() => refrescarDelServidor())).catch(() => undefined);
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
  useEffect(() => { asegurar(); }, []);
  const buscarProductos = useCallback((consulta: string, maximo = 50) => {
    // Buscando en el servidor: se muestra lo que hay en memoria y se le pregunta al servidor; lo que llegue vuelve a pasar por acá.
    if (buscaEnElServidor()) pedirAlServidor(consulta);
    return buscarEn(e.catalogo, consulta, maximo);
  }, [e.catalogo]);
  // Buscando en el servidor el catálogo nunca está entero: para lo que espera a tenerlo (el
  // espejo con la computadora) alcanza con que haya cargado, y lo que falte se pide por su identificador.
  return { catalogo: e.catalogo, catalogoCompleto: e.completo || (buscaEnElServidor() && e.catalogo !== null), buscandoEnElServidor: e.buscando, enElServidor: buscaEnElServidor(), stock: e.stock, clientes: e.clientes, error: e.error, desdeDispositivo: e.desdeDispositivo, buscarProductos, actualizarProducto, ajustarStockLocal };
}
