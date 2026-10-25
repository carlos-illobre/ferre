import { normalizar } from "../../plataforma/busqueda";
import { EVENTO_CAMBIO } from "../../datos/conexion";
import type { Producto } from "../../datos/almacenamiento";
import { comoElServidor, comoPagina, buscarEnLoBajado, oLoBajado, pedirPagina, sinConexion } from "./lo-bajado";
import { elEstado, losQueEstan, poner, POR_PAGINA, REFRESCO_MS, SIN_CONEXION_PARA_BUSCAR, sumar } from "./memoria";

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
  const yaVa = enVueloPorClave.get(clave);
  if (yaVa) return yaVa;
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
export function resultadosDe(consulta: string, maximo: number, primero?: string | null): Producto[] {
  const texto = normalizar(consulta);
  if (!texto) return [];
  const clave = llaveDe(texto, primero);
  const hecha = busquedas.get(clave);
  if (!hecha || Date.now() - hecha.cuando > REFRESCO_MS) pedirBusqueda(clave);
  if (hecha) return losQueEstan(hecha.ids).slice(0, maximo);
  return primeroLosDe(comoElServidor(elEstado().catalogo, consulta), primero ?? undefined).slice(0, maximo);
}

export function olvidarLasBusquedas() {
  busquedas.clear(); enVueloPorClave.clear(); pedida = null;
  if (espera) clearTimeout(espera);
  espera = null;
}
