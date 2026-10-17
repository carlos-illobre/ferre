import { productos } from "./rutas-00-base.mjs";

// La ficha del producto renovada (specs/016): la última lectura del código de algunos productos
// y el archivo de origen de cada lista (GET /listas/:id/origen).
productos.forEach((p, i) => { if (p.codigo_barras && i % 2 === 0) p.codigo_leido_en = `2026-10-${String(10 + (i % 9)).padStart(2, "0")}T13:24:00.000Z`; });

const LISTAS = { "l-0": ["Comodo", 7096], "l-1": ["Tresge", 2310], "l-2": ["Erpa", 15422], "l-3": ["Ixnova", 4875] };
export default {
  "GET /listas/:id/origen": ({ params }) => {
    const l = LISTAS[params.id];
    if (!l) return [404, { error: "No existe esa lista" }];
    const fecha = productos.find((p) => p.lista_importada_id === params.id)?.fecha_lista ?? "2026-09-01";
    return { id: params.id, archivo_nombre: `lista_${l[0].toLowerCase()}_${fecha.split("-").reverse().join("-")}.xlsx`, proveedor: l[0], fecha_lista: fecha, productos: l[1] };
  },
};
