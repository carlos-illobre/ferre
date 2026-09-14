import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";
import { config } from "../config.js";
import { detectarProveedor, ErrorDeLectura, leerPlanilla, type FilaLeida, type Lectura } from "../listas-de-proveedores.js";
import { sugerirEquivalencias } from "../equivalencias.js";

// Carga y aplicación de listas de precios (issues #7 a #12). Nada se aplica sin
// confirmación: cargar crea una lista "pendiente" con su resumen; aplicar recién toca
// productos y precios. El archivo original se guarda para reprocesar.
export const listas = new Hono();
listas.use("/*", exigirSesion);

listas.get("/", async (c) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.archivo_nombre, l.fecha_lista, l.estado, l.resumen, l.avisos, l.importada_en, l.creado_en, p.id AS proveedor_id, p.nombre AS proveedor
       FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id
      ORDER BY l.creado_en DESC LIMIT 100`,
  );
  return c.json(rows);
});

// multipart: archivo, proveedor_id (opcional: si falta, se detecta), fecha_lista (opcional)
listas.post("/", async (c) => {
  const cuerpo = await c.req.parseBody();
  const archivo = cuerpo["archivo"];
  if (!(archivo instanceof File)) return c.json({ error: "Falta el archivo" }, 400);
  if (archivo.size > 30 * 1024 * 1024) return c.json({ error: "El archivo pesa más de 30 MB" }, 413);

  let proveedorId = typeof cuerpo["proveedor_id"] === "string" ? cuerpo["proveedor_id"] : null;
  if (!proveedorId) {
    const lector = await detectarProveedor(archivo);
    if (lector) {
      const { rows } = await pool.query<{ id: string }>("SELECT id FROM proveedor WHERE lector = $1 AND activo", [lector]);
      proveedorId = rows[0]?.id ?? null;
    }
    if (!proveedorId) return c.json({ error: "No reconocí de qué proveedor es la planilla. Elegilo a mano." }, 422);
  }
  const { rows: prov } = await pool.query<{ nombre: string; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string; lector: string | null }>(
    "SELECT nombre, precios_incluyen_iva, descuento_general, descuento_contado, lector FROM proveedor WHERE id = $1 AND activo",
    [proveedorId],
  );
  const proveedor = prov[0];
  if (!proveedor) return c.json({ error: "No existe ese proveedor" }, 404);

  let lectura: Lectura;
  try {
    lectura = await leerPlanilla(archivo, { lector: proveedor.lector, precios_incluyen_iva: proveedor.precios_incluyen_iva, descuento_general: proveedor.descuento_general, descuento_contado: proveedor.descuento_contado });
  } catch (e) {
    if (e instanceof ErrorDeLectura) return c.json({ error: e.message }, e.estado === 422 ? 422 : 502);
    throw e;
  }
  const fechaLista = (typeof cuerpo["fecha_lista"] === "string" && cuerpo["fecha_lista"]) || lectura.fecha_lista;
  if (!fechaLista) return c.json({ error: "La planilla no dice su fecha: indicá la fecha de la lista" }, 422);

  const id = randomUUID();
  const ruta = path.join(config.carpetaListas, `${id}${path.extname(archivo.name) || ".xlsx"}`);
  await mkdir(config.carpetaListas, { recursive: true });
  await writeFile(ruta, Buffer.from(await archivo.arrayBuffer()));

  const resumen = await compararConVigente(proveedorId, lectura.filas);
  const usuarioId = c.get("sesion").usuario.id;
  await pool.query(
    `INSERT INTO lista_importada (id, proveedor_id, archivo_nombre, archivo_ruta, fecha_lista, estado, resumen, avisos, cargada_por)
     VALUES ($1, $2, $3, $4, $5, 'pendiente', $6, $7, $8)`,
    [id, proveedorId, archivo.name, ruta, fechaLista, JSON.stringify({ ...lectura.resumen, ...resumen, salteadas_detalle: lectura.salteadas.slice(0, 50) }), JSON.stringify(lectura.avisos), usuarioId],
  );
  await registrarEvento(pool, { tipo: "lista.cargada", usuarioId, contenido: { id, proveedor: proveedor.nombre, archivo: archivo.name, fechaLista, ...lectura.resumen, ...resumen } });
  return c.json({ id, proveedor: proveedor.nombre, fecha_lista: fechaLista, resumen: { ...lectura.resumen, ...resumen }, avisos: lectura.avisos, salteadas: lectura.salteadas.slice(0, 50) }, 201);
});

// Qué lectores existen en el servicio de listas (para elegir uno al dar de alta un proveedor).
listas.get("/lectores", async (c) => {
  const r = await fetch(`${config.listasDeProveedoresUrl}/health`).catch(() => null);
  if (!r?.ok) return c.json({ error: "El servicio de listas no responde" }, 502);
  const { lectores } = (await r.json()) as { lectores: string[] };
  return c.json(lectores);
});

// Vista previa: filas con costo, explicación y el costo vigente hasta ahora, para revisar
// antes de aplicar. Las que cambian de precio van primero.
listas.get("/:id/filas", async (c) => {
  const lista = await buscarLista(c.req.param("id"));
  if (!lista) return c.json({ error: "No existe esa lista" }, 404);
  const lectura = await releer(lista);
  const { rows } = await pool.query<{ codigo_proveedor: string; costo_neto: string }>(
    `SELECT DISTINCT ON (codigo_proveedor) codigo_proveedor, costo_neto FROM precio_proveedor WHERE proveedor_id = $1 ORDER BY codigo_proveedor, fecha_lista DESC, creado_en DESC`,
    [lista.proveedor_id],
  );
  const vigentes = new Map(rows.map((r) => [r.codigo_proveedor, r.costo_neto]));
  const filas = lectura.filas.map((f) => ({ ...f, costo_anterior: vigentes.get(f.codigo_proveedor) ?? null }));
  const orden = (f: (typeof filas)[number]) => (f.costo_anterior === null ? 1 : Number(f.costo_anterior) !== Number(f.costo_neto) ? 0 : 2);
  filas.sort((x, y) => orden(x) - orden(y));
  const desde = Number(c.req.query("desde") ?? 0);
  return c.json({ total: filas.length, filas: filas.slice(desde, desde + 200) });
});

// Aplicar corre en segundo plano: miles de filas contra una base remota tardan, y la
// pantalla muestra el progreso consultando la lista. Las filas se insertan en lotes.
listas.post("/:id/aplicar", async (c) => {
  const lista = await buscarLista(c.req.param("id"));
  if (!lista) return c.json({ error: "No existe esa lista" }, 404);
  const usuarioId = c.get("sesion").usuario.id;
  // Solo una aplicación a la vez: el que cambia el estado es el que la corre.
  const { rowCount } = await pool.query(
    `UPDATE lista_importada SET estado = 'aplicando', resumen = resumen || '{"progreso": {"procesadas": 0, "total": null}}'::jsonb WHERE id = $1 AND estado = 'pendiente'`,
    [lista.id],
  );
  if (!rowCount) return c.json({ error: `La lista ya está ${lista.estado === "aplicando" ? "aplicándose" : lista.estado}` }, 409);
  aplicarEnSegundoPlano(lista, usuarioId).catch(async (e) => {
    console.error("aplicar lista", lista.id, e);
    await pool.query(`UPDATE lista_importada SET estado = 'pendiente', resumen = resumen || $2::jsonb WHERE id = $1`, [lista.id, JSON.stringify({ error: `No se pudo aplicar: ${(e as Error).message}` })]).catch(() => undefined);
  });
  return c.json({ id: lista.id, estado: "aplicando" }, 202);
});

// Estado y progreso de una lista (la pantalla lo consulta mientras se aplica).
listas.get("/:id", async (c) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.estado, l.resumen, l.avisos, l.fecha_lista::text, l.archivo_nombre, p.nombre AS proveedor FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id WHERE l.id = $1`,
    [c.req.param("id")],
  );
  if (!rows[0]) return c.json({ error: "No existe esa lista" }, 404);
  return c.json(rows[0]);
});

const LOTE = 500;

async function aplicarEnSegundoPlano(lista: ListaGuardada, usuarioId: string): Promise<void> {
  const lectura = await releer(lista);
  const total = lectura.filas.length;
  const progreso = async (procesadas: number) =>
    pool.query(`UPDATE lista_importada SET resumen = resumen || $2::jsonb WHERE id = $1`, [lista.id, JSON.stringify({ progreso: { procesadas, total } })]);
  await progreso(0);

  const { rows: vigentes } = await pool.query<{ producto_id: string; codigo_proveedor: string; costo_neto: string; precio_lista: string }>(
    `SELECT DISTINCT ON (codigo_proveedor) producto_id, codigo_proveedor, costo_neto, precio_lista
       FROM precio_proveedor WHERE proveedor_id = $1 ORDER BY codigo_proveedor, fecha_lista DESC, creado_en DESC`,
    [lista.proveedor_id],
  );
  const porCodigo = new Map(vigentes.map((v) => [v.codigo_proveedor, v]));
  const resultado = { nuevos: 0, modificados: 0, sin_cambio: 0, posibles_duplicados: 0 };
  const nuevosIds: string[] = [];

  // Un lote = una transacción con dos INSERT de muchas filas: cientos de veces menos idas
  // y vueltas que una fila por vez.
  for (let desde = 0; desde < total; desde += LOTE) {
    const filas = lectura.filas.slice(desde, desde + LOTE);
    const productos: unknown[][] = [];
    const precios: unknown[][] = [];
    for (const fila of filas) {
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
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");
      if (productos.length) await cliente.query(insertMultiple("producto", ["id", "descripcion", "marca", "codigo_barras", "proveedor_preferido_id"], productos), productos.flat());
      if (precios.length) {
        await cliente.query(
          insertMultiple("precio_proveedor", ["id", "producto_id", "proveedor_id", "lista_importada_id", "codigo_proveedor", "descripcion_proveedor", "precio_lista", "descuentos", "costo_neto", "iva", "cantidad_bulto", "precio_bulto", "fecha_lista"], precios),
          precios.flat(),
        );
      }
      await cliente.query("COMMIT");
    } catch (e) {
      await cliente.query("ROLLBACK");
      throw e;
    } finally {
      cliente.release();
    }
    await progreso(Math.min(desde + LOTE, total));
  }

  // Los productos nuevos pueden ser el mismo artículo que ya vende otro proveedor (#29).
  if (nuevosIds.length) resultado.posibles_duplicados = await sugerirEquivalencias(pool, nuevosIds);
  await pool.query(
    `UPDATE lista_importada SET estado = 'aplicada', importada_en = now(), aplicada_por = $2, resumen = (resumen - 'progreso' - 'error') || $3::jsonb WHERE id = $1`,
    [lista.id, usuarioId, JSON.stringify(resultado)],
  );
  await registrarEvento(pool, { tipo: "lista.aplicada", usuarioId, contenido: { id: lista.id, proveedorId: lista.proveedor_id, fechaLista: lista.fecha_lista, ...resultado } });
}

function insertMultiple(tabla: string, columnas: string[], filas: unknown[][]): string {
  const valores = filas.map((_, i) => `(${columnas.map((__, j) => `$${i * columnas.length + j + 1}`).join(", ")})`).join(", ");
  return `INSERT INTO ${tabla} (${columnas.join(", ")}) VALUES ${valores}`;
}

listas.post("/:id/descartar", async (c) => {
  const { rowCount } = await pool.query(`UPDATE lista_importada SET estado = 'descartada' WHERE id = $1 AND estado = 'pendiente'`, [c.req.param("id")]);
  if (!rowCount) return c.json({ error: "La lista no existe o ya no está pendiente" }, 409);
  await registrarEvento(pool, { tipo: "lista.descartada", usuarioId: c.get("sesion").usuario.id, contenido: { id: c.req.param("id") } });
  return c.body(null, 204);
});

type ListaGuardada = { id: string; proveedor_id: string; archivo_nombre: string; archivo_ruta: string; fecha_lista: string; estado: string; lector: string | null; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string };

async function buscarLista(id: string): Promise<ListaGuardada | null> {
  const { rows } = await pool.query<ListaGuardada>(
    `SELECT l.id, l.proveedor_id, l.archivo_nombre, l.archivo_ruta, l.fecha_lista::text, l.estado, p.lector, p.precios_incluyen_iva, p.descuento_general, p.descuento_contado
       FROM lista_importada l JOIN proveedor p ON p.id = l.proveedor_id WHERE l.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// Las filas no se guardan hasta aplicar: se vuelve a leer el archivo original.
async function releer(lista: ListaGuardada): Promise<Lectura> {
  const contenido = await readFile(lista.archivo_ruta);
  const archivo = new File([contenido], lista.archivo_nombre);
  return leerPlanilla(archivo, { lector: lista.lector, precios_incluyen_iva: lista.precios_incluyen_iva, descuento_general: lista.descuento_general, descuento_contado: lista.descuento_contado });
}

// Resumen contra lo vigente: qué es nuevo, qué cambia de precio y qué desaparece.
async function compararConVigente(proveedorId: string, filas: FilaLeida[]) {
  const { rows } = await pool.query<{ codigo_proveedor: string; costo_neto: string }>(
    `SELECT DISTINCT ON (codigo_proveedor) codigo_proveedor, costo_neto FROM precio_proveedor WHERE proveedor_id = $1 ORDER BY codigo_proveedor, fecha_lista DESC, creado_en DESC`,
    [proveedorId],
  );
  const vigentes = new Map(rows.map((r) => [r.codigo_proveedor, Number(r.costo_neto)]));
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
