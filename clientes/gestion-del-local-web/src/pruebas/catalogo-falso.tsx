import { useMemo, useReducer } from "react";
import { vi } from "vitest";
import type { Producto } from "../pantallas/Productos";
import { buscar, indexar } from "@ferre/calculo-de-precios";

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
    catalogo: productos, stock: new Map<string, number>(), clientes: [], error: null, desdeDispositivo: false,
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
  return { ...valor, useCatalogoFalso };
}
