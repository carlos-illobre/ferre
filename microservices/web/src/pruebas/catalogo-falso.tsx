import { useMemo, useReducer, useState } from "react";
import { vi } from "vitest";
import type { Producto } from "../negocio/catalogo";
import type { ConsultaDeLista } from "../negocio/catalogo";
import { buscar, indexar } from "../plataforma/busqueda/busqueda";

// Un catálogo en memoria con la misma búsqueda que la app, y `actualizarProducto` espiado.
export function producto(extra: Partial<Producto> & { id: string; descripcion: string }): Producto {
  return {
    marca: "MARCA", codigo_barras: null, unidad: "unidad", margen_elegido: null, proveedor: "Proveedor uno", codigo_proveedor: null,
    costo_neto: "1500", iva: "0.21", fecha_lista: "2026-08-11", lista_importada_id: "lista-1", explicacion_costo: [], ...extra,
  };
}

export function catalogoFalso(productos: Producto[]) {
  const indexarTodo = () => indexar(productos.map((p) => ({ ...p, codigos: [p.codigo_proveedor, p.codigo_barras] })));
  let indice = indexarTodo();
  const oyentes = new Set<() => void>();
  const actualizarProducto = vi.fn(async (id: string, cambios: Partial<Producto>) => {
    const p = productos.find((x) => x.id === id);
    if (p) Object.assign(p, cambios);
    indice = indexarTodo();
    oyentes.forEach((o) => o());
    return { encolado: false };
  });
  const valor = {
    catalogo: productos, buscandoEnElServidor: false, stock: new Map<string, number>(), clientes: [], error: null,
    buscarProductos: (consulta: string, maximo = 50) => buscar(indice, consulta, maximo),
    actualizarProducto, ajustarStockLocal: vi.fn(),
  };
  // Como el hook real: la pantalla se vuelve a dibujar cuando cambia un producto.
  // Y como en el real, `buscarProductos` cambia de identidad con el catálogo: así los
  // resultados memorizados se recalculan.
  function useCatalogoFalso() {
    const [version, redibujar] = useReducer((n: number) => n + 1, 0);
    oyentes.add(redibujar);
    const buscarProductos = useMemo(() => (consulta: string, maximo = 50) => buscar(indice, consulta, maximo), [version]);
    return { ...valor, buscarProductos };
  }
  // Como en el real con el catálogo en memoria: el producto que tiene ese código, o ninguno.
  const traerPorCodigo = async (codigo: string) => productos.find((p) => p.codigo_barras === codigo || p.codigo_proveedor === codigo) ?? null;
  // Como la lista de a páginas del servidor (specs/018): busca con la misma regla, filtra por marca
  // (sin importar mayúsculas) y por stock, y da de a 50.
  const clave = (m: string) => m.trim().toLocaleLowerCase("es-AR");
  const encontrar = (c: ConsultaDeLista) => {
    const base = c.buscar.trim() ? buscar(indice, c.buscar, Number.MAX_SAFE_INTEGER) : [...productos].sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
    return base.filter((p) => (c.marca === null || (p.marca !== null && clave(p.marca) === clave(c.marca)))
      && (c.disponibilidad === "todos" || ((valor.stock.get(p.id) ?? 0) > 0) === (c.disponibilidad === "con-stock")));
  };
  function useListaFalsa(c: ConsultaDeLista) {
    const [version, redibujar] = useReducer((n: number) => n + 1, 0);
    oyentes.add(redibujar);
    const [cuantos, setCuantos] = useState({ clave: "", n: 50 });
    const k = JSON.stringify(c);
    const n = cuantos.clave === k ? cuantos.n : 50;
    const todos = useMemo(() => encontrar(c), [k, version]);
    return { productos: todos.slice(0, n), hayMas: todos.length > n, total: todos.length, cargando: false, error: null, cargarMas: () => setCuantos({ clave: k, n: n + 50 }), reintentar: () => undefined };
  }
  // Sin repetir, como se escribió en el primero.
  const marcasDe = (lista: Producto[]) => {
    const porClave = new Map<string, string>();
    for (const p of lista) { const m = p.marca?.trim(); if (m && !porClave.has(clave(m))) porClave.set(clave(m), m); }
    return [...porClave.values()].sort((a, b) => a.localeCompare(b, "es-AR", { sensitivity: "base" }));
  };
  const useMarcasFalsas = (b: string) => marcasDe(b.trim() ? buscar(indice, b, Number.MAX_SAFE_INTEGER) : productos);
  return { ...valor, productos, useCatalogoFalso, traerPorCodigo, useListaFalsa, useMarcasFalsas };
}

// El módulo `catalogo` entero, con este catálogo de mentira: `vi.mock("…/catalogo", async () =>
// (await import("…/pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual))`.
export function moduloDeCatalogo(deLaPrueba: () => unknown) {
  const actual = () => deLaPrueba() as ReturnType<typeof catalogoFalso>;
  return {
    SIN_CONEXION_PARA_BUSCAR: "Sin conexión: para buscar productos hace falta internet.",
    useCatalogo: () => actual().useCatalogoFalso(),
    useListaDeProductos: (c: ConsultaDeLista) => actual().useListaFalsa(c),
    useMarcas: (b: string) => actual().useMarcasFalsas(b),
    traerPorCodigo: (c: string) => actual().traerPorCodigo(c),
    traerPorIds: async () => undefined,
    productoEnMemoria: (id: string) => actual().productos.find((p) => p.id === id),
    quienTieneElCodigo: async (codigo: string, salvo: string) => actual().productos.find((p) => p.id !== salvo && p.codigo_barras === codigo),
    pedirClientes: () => undefined,
    busquedaAlDia: () => true,
    esperarBusqueda: async (c: string) => actual().useCatalogoFalso === undefined ? [] : buscar(indexar(actual().productos.map((p) => ({ ...p, codigos: [p.codigo_proveedor, p.codigo_barras] }))), c, 50),
  };
}
