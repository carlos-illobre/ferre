import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { sugerirEquivalencias } from "../duplicados/datos.js";
import * as datos from "./datos.js";
import type { EstadoDeLista, FilasDeLista, ListaAplicandose, ListaCargada, ListaEnHistorial, OrigenDeLista } from "../contratos/listas.js";
import type { Enviable } from "../enviable.js";
import { detectarProveedor, ErrorDeLectura, leerPlanilla, type FilaLeida, type Lectura } from "./lector.js";

// Carga y aplicación de listas de precios (issues #7 a #12), en sus reglas (ADR-018). Nada se
// aplica sin confirmación: cargar crea una lista «pendiente» con su resumen; aplicar recién toca
// productos y precios. El archivo original se guarda para reprocesar.
export type Rechazo = { error: string; estado: 400 | 404 | 409 | 413 | 422 | 502 };
const LOTE = 500;

export const historial = (): Promise<Enviable<ListaEnHistorial>[]> => datos.historial();

// Resumen contra lo vigente: qué es nuevo, qué cambia de precio y qué desaparece.
async function compararConVigente(proveedorId: string, filas: FilaLeida[]) {
  const vigentes = new Map((await datos.costosVigentes(proveedorId)).map((r) => [r.codigo_proveedor, Number(r.costo_neto)]));
  let nuevos = 0, modificados = 0, sinCambio = 0, sumaVariacion = 0;
  const codigos = new Set<string>();
  for (const f of filas) {
    codigos.add(f.codigo_proveedor);
    const antes = vigentes.get(f.codigo_proveedor);
    if (antes === undefined) nuevos++;
    else if (antes === Number(f.costo_neto)) sinCambio++;
    else { modificados++; if (antes > 0) sumaVariacion += (Number(f.costo_neto) - antes) / antes; }
  }
  const dados_de_baja = [...vigentes.keys()].filter((c) => !codigos.has(c)).length;
  return { nuevos, modificados, sin_cambio: sinCambio, dados_de_baja, variacion_promedio: modificados ? Math.round((sumaVariacion / modificados) * 1000) / 10 : 0 };
}

// Cargar una planilla. Sin proveedor, se lo detecta por la planilla; sin fecha, la de la planilla.
export async function cargar(archivo: unknown, proveedorDado: unknown, fechaDada: unknown, usuarioId: string): Promise<Rechazo | ListaCargada> {
  if (!(archivo instanceof File)) return { error: "Falta el archivo", estado: 400 };
  if (archivo.size > 30 * 1024 * 1024) return { error: "El archivo pesa más de 30 MB", estado: 413 };
  let proveedorId = typeof proveedorDado === "string" && proveedorDado ? proveedorDado : null;
  if (!proveedorId) {
    const lector = await detectarProveedor(archivo);
    if (lector) proveedorId = await datos.proveedorConLector(lector);
    if (!proveedorId) return { error: "No reconocí de qué proveedor es la planilla. Elegilo a mano.", estado: 422 };
  }
  const proveedor = await datos.proveedorActivo(proveedorId);
  if (!proveedor) return { error: "No existe ese proveedor", estado: 404 };
  let lectura: Lectura;
  try {
    lectura = await leerPlanilla(archivo, { lector: proveedor.lector, precios_incluyen_iva: proveedor.precios_incluyen_iva, descuento_general: proveedor.descuento_general, descuento_contado: proveedor.descuento_contado });
  } catch (e) {
    if (e instanceof ErrorDeLectura) return { error: e.message, estado: e.estado === 422 ? 422 : 502 };
    throw e;
  }
  const fechaLista = (typeof fechaDada === "string" && fechaDada) || lectura.fecha_lista;
  if (!fechaLista) return { error: "La planilla no dice su fecha: indicá la fecha de la lista", estado: 422 };
  const id = randomUUID();
  const ruta = path.join(config.carpetaListas, `${id}${path.extname(archivo.name) || ".xlsx"}`);
  await mkdir(config.carpetaListas, { recursive: true });
  await writeFile(ruta, Buffer.from(await archivo.arrayBuffer()));
  const resumen = await compararConVigente(proveedorId, lectura.filas);
  await datos.guardarPendiente({ id, proveedorId, archivoNombre: archivo.name, ruta, fechaLista, resumen: JSON.stringify({ ...lectura.resumen, ...resumen, salteadas_detalle: lectura.salteadas.slice(0, 50) }), avisos: JSON.stringify(lectura.avisos), usuarioId });
  await registrarEvento(pool, { tipo: "lista.cargada", usuarioId, contenido: { id, proveedor: proveedor.nombre, archivo: archivo.name, fechaLista, ...lectura.resumen, ...resumen } });
  return { id, proveedor: proveedor.nombre, fecha_lista: fechaLista, resumen: { ...lectura.resumen, ...resumen }, avisos: lectura.avisos, salteadas: lectura.salteadas.slice(0, 50) };
}

// Qué lectores existen en el servicio de listas (para elegir uno al dar de alta un proveedor).
export async function lectores(): Promise<string[] | null> {
  const r = await fetch(`${config.listasDeProveedoresUrl}/health`).catch(() => null);
  if (!r?.ok) return null;
  return ((await r.json()) as { lectores: string[] }).lectores;
}

// Vista previa: filas con costo, explicación y el costo vigente hasta ahora, de a 200. Las que
// cambian de precio van primero.
export async function filas(id: string, desde: number): Promise<FilasDeLista | null> {
  const lista = await datos.buscarLista(id);
  if (!lista) return null;
  const lectura = await datos.releer(lista);
  const vigentes = new Map((await datos.costosVigentes(lista.proveedor_id)).map((r) => [r.codigo_proveedor, r.costo_neto]));
  const todas = lectura.filas.map((f) => ({ ...f, costo_anterior: vigentes.get(f.codigo_proveedor) ?? null }));
  const orden = (f: (typeof todas)[number]) => (f.costo_anterior === null ? 1 : Number(f.costo_anterior) !== Number(f.costo_neto) ? 0 : 2);
  todas.sort((x, y) => orden(x) - orden(y));
  return { total: todas.length, filas: todas.slice(desde, desde + 200) };
}

// Aplicar corre en segundo plano: miles de filas contra una base remota tardan, y la pantalla
// muestra el progreso consultando la lista.
export async function aplicar(id: string, usuarioId: string): Promise<Rechazo | ListaAplicandose> {
  const lista = await datos.buscarLista(id);
  if (!lista) return { error: "No existe esa lista", estado: 404 };
  if (!(await datos.empezarAAplicar(lista.id))) return { error: `La lista ya está ${lista.estado === "aplicando" ? "aplicándose" : lista.estado}`, estado: 409 };
  aplicarEnSegundoPlano(lista, usuarioId).catch(async (e) => {
    console.error("aplicar lista", lista.id, e);
    await datos.volverAPendiente(lista.id, `No se pudo aplicar: ${(e as Error).message}`).catch(() => undefined);
  });
  return { id: lista.id, estado: "aplicando" };
}

async function aplicarEnSegundoPlano(lista: datos.ListaGuardada, usuarioId: string): Promise<void> {
  const lectura = await datos.releer(lista);
  const total = lectura.filas.length;
  // El progreso dice qué etapa va: «precios» (n de total) y después «duplicados».
  const progreso = (procesadas: number, etapa: "precios" | "duplicados" = "precios") => datos.anotarProgreso(lista.id, { procesadas, total, etapa });
  await progreso(0);
  const porCodigo = new Map((await datos.preciosVigentes(lista.proveedor_id)).map((v) => [v.codigo_proveedor, v]));
  const resultado = { nuevos: 0, modificados: 0, sin_cambio: 0, posibles_duplicados: 0 };
  const nuevosIds: string[] = [];
  for (let desde = 0; desde < total; desde += LOTE) {
    const productos: unknown[][] = [];
    const precios: unknown[][] = [];
    for (const fila of lectura.filas.slice(desde, desde + LOTE)) {
      const vigente = porCodigo.get(fila.codigo_proveedor);
      let productoId = vigente?.producto_id;
      if (!productoId) {
        productoId = randomUUID();
        productos.push([productoId, fila.descripcion, fila.marca, fila.codigo_barras, lista.proveedor_id]);
        porCodigo.set(fila.codigo_proveedor, { producto_id: productoId, codigo_proveedor: fila.codigo_proveedor, costo_neto: fila.costo_neto, precio_lista: fila.precio_lista });
        resultado.nuevos++;
        nuevosIds.push(productoId);
      } else if (Number(vigente!.costo_neto) === Number(fila.costo_neto) && Number(vigente!.precio_lista) === Number(fila.precio_lista)) {
        resultado.sin_cambio++;
        continue; // mismo precio: no se agrega una fila igual (reimportar no duplica)
      } else {
        resultado.modificados++;
      }
      precios.push([randomUUID(), productoId, lista.proveedor_id, lista.id, fila.codigo_proveedor, fila.descripcion, fila.precio_lista,
        JSON.stringify({ pasos: fila.descuentos, explicacion: fila.explicacion }), fila.costo_neto, fila.iva, fila.cantidad_bulto, fila.precio_bulto, lista.fecha_lista]);
    }
    await datos.guardarLote(productos, precios);
    await progreso(Math.min(desde + LOTE, total));
  }
  // Los productos nuevos pueden ser el mismo artículo que ya vende otro proveedor (#29).
  if (nuevosIds.length) {
    await progreso(total, "duplicados");
    resultado.posibles_duplicados = await sugerirEquivalencias(pool, nuevosIds);
  }
  await datos.marcarAplicada(lista.id, usuarioId, resultado);
  await registrarEvento(pool, { tipo: "lista.aplicada", usuarioId, contenido: { id: lista.id, proveedorId: lista.proveedor_id, fechaLista: lista.fecha_lista, ...resultado } });
}

// El Excel original, tal como lo mandó el proveedor.
export async function archivo(id: string): Promise<{ error: string } | { nombre: string; original: string; contenido: Buffer }> {
  const lista = await datos.archivoDe(id);
  if (!lista) return { error: "No existe esa lista" };
  if (!lista.archivo_ruta) return { error: "Esa lista se cargó sin guardar el archivo" };
  const contenido = await readFile(lista.archivo_ruta).catch(() => null);
  if (!contenido) return { error: "El archivo de esa lista ya no está en el disco" };
  return { nombre: lista.archivo_nombre.replace(/[^\w. -]+/g, "_"), original: lista.archivo_nombre, contenido };
}

// De qué lista sale el costo de un producto (specs/016): un id que no es de una lista es «no existe».
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const origen = async (id: string): Promise<OrigenDeLista | null> => (UUID.test(id) ? datos.origenDe(id) : null);

export const estado = (id: string): Promise<Enviable<EstadoDeLista> | null> => datos.estadoDe(id);

export async function descartar(id: string, usuarioId: string): Promise<boolean> {
  if (!(await datos.descartar(id))) return false;
  await registrarEvento(pool, { tipo: "lista.descartada", usuarioId, contenido: { id } });
  return true;
}
