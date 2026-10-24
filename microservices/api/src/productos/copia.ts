import { config } from "../config.js";
import * as archivos from "../persistencia/archivos.js";
import { escuchar as escucharLaBase, identificadorDeLaBase } from "../persistencia/conexion.js";
import * as datos from "../persistencia/productos.js";
import type { FilaDeLaCopia, LecturaDeLaCopia } from "../persistencia/productos.js";

// La copia del catálogo en el servidor (specs/018, RF-124; ADR-023). Los productos con sus costos
// y proveedores cambian poco y por acciones puntuales (aplicar una lista, cambiar un margen, unir
// duplicados), y se leen todo el tiempo: el servidor los tiene en memoria y busca acá, sin
// consultar la base. La base avisa por `pg_notify('catalogo')` cada vez que algo cambia, venga del
// camino que venga, y la copia lee solo los productos anotados desde su marca.
//
// Se guarda en el volumen de datos: el ambiente de pruebas se reinicia con cada subida, y leer el
// catálogo entero en cada arranque gastaría la base que se quiere cuidar.

// Sube cuando cambia la forma de la fila: una copia guardada con otra forma no se usa.
const FORMATO = 3;
// De qué base es la copia guardada: el servidor, el puerto y el nombre de la base (sin usuario ni
// clave). Una copia de otra base (un volumen copiado entre ambientes) no se usa.
const BASE = () => { try { const u = new URL(config.databaseUrl); return `${u.hostname}:${u.port}${u.pathname}`; } catch { return "?"; } };
const ARCHIVO = () => archivos.ruta("copia", "catalogo.json");

// Lo que la búsqueda compara de un producto: minúsculas, sin acentos y con todo lo que no es
// letra ni número convertido en espacio.
export function normalizarBusqueda(texto: string): string[] {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Lo que la búsqueda compara de cada producto, armado una vez: el texto normalizado (con un
// espacio adelante, para buscar comienzos de palabra) y los códigos en minúsculas.
type Entrada = { fila: FilaDeLaCopia; texto: string; codigos: string[] };

let porId = new Map<string, Entrada>();
// Los productos que la base borró de verdad, con la marca de cuando se supo: la descarga los manda
// como quitados (revisión 3.3; hoy el código no borra productos).
let borrados = new Map<string, string>();
let vigentes: Entrada[] = [];
let marca: string | null = null;
let marcasOrdenadas: string[] = [];

const comparar = new Intl.Collator("es").compare;
// Dos proveedores pueden escribir la misma marca distinto («3M» y «3m»): es una sola.
const claveDeMarca = (m: string) => m.trim().toLocaleLowerCase("es-AR");

function entrada(fila: FilaDeLaCopia): Entrada {
  // Las fechas que llegan de `pg` como Date se guardan como texto: igual que en la respuesta y en el disco.
  const f = JSON.parse(JSON.stringify(fila)) as FilaDeLaCopia;
  const codigos = [f.codigo_barras, ...(f.codigos ?? [])].filter((c): c is string => Boolean(c)).map((c) => c.toLowerCase());
  return { fila: f, texto: ` ${normalizarBusqueda(`${f.descripcion} ${f.marca ?? ""}`).join(" ")}`, codigos };
}

// Las marcas de unos productos, sin repetir (como se escribió en el primero) y en orden.
export function marcasDe(filas: readonly { marca: string | null }[]): string[] {
  const porClave = new Map<string, string>();
  for (const f of filas) { const m = f.marca?.trim(); if (m && !porClave.has(claveDeMarca(m))) porClave.set(claveDeMarca(m), m); }
  return [...porClave.values()].sort((a, b) => a.localeCompare(b, "es-AR", { sensitivity: "base" }));
}

function rearmar() {
  vigentes = [...porId.values()].filter((e) => e.fila.vigente).sort((a, b) => comparar(a.fila.descripcion, b.fila.descripcion));
  marcasOrdenadas = marcasDe(vigentes.map((e) => e.fila));
}

function aplicar(lectura: LecturaDeLaCopia, entera: boolean) {
  if (entera) { porId = new Map(); borrados = new Map(); }
  for (const f of lectura.filas) { porId.set(f.id, entrada(f)); borrados.delete(f.id); }
  for (const id of lectura.quitados) { porId.delete(id); borrados.set(id, lectura.marca); }
  marca = lectura.marca;
  rearmar();
}

// ---------- Ponerse al día ----------

// Una lectura a la vez; si llega otro aviso mientras tanto, se vuelve a leer al terminar.
let enCurso: Promise<void> | null = null;
let otraVez = false;
export function ponerAlDia(): Promise<void> {
  if (enCurso) { otraVez = true; return enCurso; }
  enCurso = (async () => {
    try {
      do {
        otraVez = false;
        const cambios = marca === null ? null : await datos.leerCambiosDesde(marca);
        if (cambios) aplicar(cambios, false);
        else aplicar(await datos.leerCatalogoEntero(), true);
        guardarPronto();
      } while (otraVez);
    } finally { enCurso = null; }
  })();
  return enCurso;
}

// ---------- El disco ----------

let guardado: ReturnType<typeof setTimeout> | null = null;
function guardarPronto() {
  if (guardado || !escuchando) return;
  guardado = setTimeout(() => { guardado = null; void guardar().catch((e: unknown) => console.error("no se pudo guardar la copia del catálogo", e)); }, 2000);
}
async function guardar() {
  if (marca === null) return;
  await archivos.guardar("copia", "catalogo.json", JSON.stringify({ formato: FORMATO, base: BASE(), marca, filas: [...porId.values()].map((e) => e.fila), borrados: [...borrados] }));
}
async function leerDelDisco(): Promise<boolean> {
  try {
    const guardada = JSON.parse(String(await archivos.leer(ARCHIVO()))) as { formato?: unknown; base?: unknown; marca?: unknown; filas?: unknown; borrados?: unknown };
    if (guardada.formato !== FORMATO || guardada.base !== BASE() || typeof guardada.marca !== "string" || !/^\d+$/.test(guardada.marca) || !Array.isArray(guardada.filas)) return false;
    // Cada fila tiene que tener, al menos, su identificador y su descripción.
    if (!guardada.filas.every((f) => f && typeof f.id === "string" && typeof f.descripcion === "string")) return false;
    aplicar({ marca: guardada.marca, filas: guardada.filas as FilaDeLaCopia[], quitados: [] }, true);
    if (Array.isArray(guardada.borrados)) borrados = new Map((guardada.borrados as [string, string][]).filter((b) => Array.isArray(b) && typeof b[0] === "string" && typeof b[1] === "string"));
    return true;
  } catch { return false; }
}

// ---------- Los avisos de la base ----------

// Si se escuchan los avisos de la base: la conexión que escucha está en la capa de datos.
let escuchando = false;
let aviso: ReturnType<typeof setTimeout> | null = null;

// Una lista aplicada avisa una vez por transacción; varios avisos juntos, una sola lectura. Si la
// lectura falla (la base no responde), se vuelve a intentar a los 30 segundos: la copia no queda
// atrás esperando el próximo aviso.
function alAviso(demora = 200) {
  if (aviso) return;
  aviso = setTimeout(() => {
    aviso = null;
    void ponerAlDia().catch((e: unknown) => { console.error("no se pudo poner al día la copia del catálogo", e); alAviso(30_000); });
  }, demora);
}

export const iniciada = () => escuchando;

// De qué base es la copia (022-E23): las marcas que se dan a los dispositivos lo llevan.
let idDeLaBase = "";
export const deQueBase = () => idDeLaBase;

// Al arrancar el servidor: la copia del disco, o la base entera si no hay; después, lo que cambió,
// y a escuchar. Antes de esto el servidor no atiende.
export async function iniciar(): Promise<void> {
  escuchando = true;
  idDeLaBase = await identificadorDeLaBase();
  await leerDelDisco();
  await ponerAlDia();
  escucharLaBase("catalogo", () => alAviso());
}

// ---------- Buscar ----------

export type Busqueda = {
  buscar?: string;
  codigo?: string;
  ids?: readonly string[];
  marca?: string | null;
  // Solo los que tienen (true) o no tienen (false) stock, con el conjunto de los que tienen.
  stock?: { hay: boolean; conStock: ReadonlySet<string> } | null;
  // Primero los que tienen un costo de este proveedor (Pedidos e Ingreso), en el mismo orden.
  primeroDe?: string | null;
};

// La misma regla que tenía la consulta a la base: cada palabra es el comienzo de una palabra de la
// descripción o la marca, o el comienzo de un código; un código exacto es el de barras o uno de
// proveedor; lo escrito entero también vale como comienzo de un código. Sin palabras, por
// descripción; con palabras, primero las descripciones más cortas.
export function buscar(b: Busqueda): FilaDeLaCopia[] {
  const palabras = normalizarBusqueda(b.buscar ?? "").slice(0, 8);
  // Lo escrito entero, con sus signos, también es el comienzo de un código: un código con guion o
  // barra (TA-81) se encuentra escribiéndolo, no solo escaneándolo (decisión 139).
  const entero = (b.buscar ?? "").trim().toLowerCase();
  const codigo = (b.codigo ?? "").trim();
  const ids = b.ids ? new Set(b.ids) : null;
  const marcaBuscada = b.marca ? claveDeMarca(b.marca) : null;
  const encontrados = vigentes.filter((e) => {
    const f = e.fila;
    if (ids && !ids.has(f.id)) return false;
    if (codigo && f.codigo_barras !== codigo && !(f.codigos ?? []).includes(codigo)) return false;
    if (marcaBuscada !== null && (!f.marca || claveDeMarca(f.marca) !== marcaBuscada)) return false;
    if (b.stock && b.stock.conStock.has(f.id) !== b.stock.hay) return false;
    return palabras.every((p) => e.texto.includes(` ${p}`) || e.codigos.some((c) => c.startsWith(p)))
      || (entero !== "" && e.codigos.some((c) => c.startsWith(entero)));
  });
  if (palabras.length) encontrados.sort((a, b) => a.fila.descripcion.length - b.fila.descripcion.length || comparar(a.fila.descripcion, b.fila.descripcion));
  const filas = encontrados.map((e) => e.fila);
  if (!b.primeroDe) return filas;
  const delProveedor = (f: FilaDeLaCopia) => f.proveedor_id === b.primeroDe || (f.proveedores ?? []).some((p) => p.proveedor_id === b.primeroDe);
  return [...filas.filter(delProveedor), ...filas.filter((f) => !delProveedor(f))];
}

export const marcas = (): readonly string[] => marcasOrdenadas;

// Un producto de la copia por su identificador (también uno dado de baja), o ninguno.
export const fila = (id: string): FilaDeLaCopia | undefined => porId.get(id)?.fila;

// ---------- La descarga a mano (historia 5) ----------

// Lo que un dispositivo baja para trabajar sin conexión, de a páginas por identificador (así una
// página no se corre si la copia cambia entre una y otra). Sin marca, todo lo vigente; con la
// marca de la descarga anterior, solo lo que cambió desde entonces: lo vigente para guardar y lo
// que se dio de baja o se unió a otro para borrar. La marca nueva es la de la copia.
export function descarga(q: { marca: string | null; desde: string; limite: number }) {
  const desdeMarca = q.marca === null ? null : BigInt(q.marca);
  const todos = [...porId.values()]
    .filter((e) => e.fila.id > q.desde && (desdeMarca === null ? e.fila.vigente : e.fila.cambio !== null && BigInt(e.fila.cambio) >= desdeMarca))
    .sort((a, b) => (a.fila.id < b.fila.id ? -1 : 1));
  const pagina = todos.slice(0, q.limite).map((e) => e.fila);
  // Los borrados de verdad desde la marca van con la primera página.
  const borradosDesde = desdeMarca === null || q.desde ? [] : [...borrados].filter(([, m]) => BigInt(m) >= desdeMarca).map(([id]) => id);
  return { filas: pagina.filter((f) => f.vigente), quitados: [...pagina.filter((f) => !f.vigente).map((f) => f.id), ...borradosDesde], hayMas: todos.length > q.limite, ultimo: pagina.at(-1)?.id ?? null, marca: marca ?? "0" };
}

// Para las pruebas: la copia con estas filas, sin base ni disco.
export function cargarParaPrueba(filas: Partial<FilaDeLaCopia>[]) {
  idDeLaBase = "prueba";
  aplicar({ marca: "1", filas: filas.map((f) => ({ vigente: true, codigos: [], marca: null, codigo_barras: null, cambio: null, ...f }) as FilaDeLaCopia), quitados: [] }, true);
}
