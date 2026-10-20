// El catálogo en el servidor (specs/018): la búsqueda de a páginas, las marcas, el resumen y la
// descarga a mano, sobre los mismos productos y el mismo stock de mentira que las otras rutas.
import { productos } from "./rutas-u-mas-a.mjs";
import deposito from "./rutas-deposito.mjs";

const normalizar = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const palabras = (t) => normalizar(t).split(/[^a-z0-9]+/).filter(Boolean);
const clave = (m) => m.trim().toLocaleLowerCase("es-AR");
const stockDeMentira = () => Object.fromEntries(deposito["GET /stock"]().productos.map((s) => [s.id, s.stock]));

function buscar(q) {
  const ps = palabras(q.get("buscar") ?? "");
  const codigo = (q.get("codigo") ?? "").trim();
  const ids = q.has("ids") ? new Set((q.get("ids") ?? "").split(",").filter(Boolean)) : null;
  const marca = q.get("marca");
  const disp = q.get("disponibilidad");
  const stock = stockDeMentira();
  let r = productos().filter((p) => {
    const texto = ` ${palabras(`${p.descripcion} ${p.marca ?? ""}`).join(" ")}`;
    const codigos = [p.codigo_barras, p.codigo_proveedor].filter(Boolean).map((c) => c.toLowerCase());
    if (ids && !ids.has(p.id)) return false;
    if (codigo && p.codigo_barras !== codigo && p.codigo_proveedor !== codigo) return false;
    if (marca && (!p.marca || clave(p.marca) !== clave(marca))) return false;
    if (disp && (Number(stock[p.id] ?? 0) > 0) !== (disp === "con-stock")) return false;
    return ps.every((w) => texto.includes(` ${w}`) || codigos.some((c) => c.startsWith(w)));
  });
  if (ps.length) r = r.sort((a, b) => a.descripcion.length - b.descripcion.length);
  return r;
}
const marcasDe = (ps) => { const m = new Map(); for (const p of ps) { const x = p.marca?.trim(); if (x && !m.has(clave(x))) m.set(clave(x), x); } return [...m.values()].sort((a, b) => a.localeCompare(b, "es-AR", { sensitivity: "base" })); };

export default {
  "GET /productos/pagina": ({ query }) => {
    const todos = buscar(query);
    const desde = Number(query.get("desde") ?? 0), limite = Math.min(Number(query.get("limite") ?? 50) || 50, 200);
    const pagina = todos.slice(desde, desde + limite);
    const stock = stockDeMentira();
    return { productos: pagina, stock: Object.fromEntries(pagina.filter((p) => stock[p.id] !== undefined).map((p) => [p.id, stock[p.id]])), hay_mas: desde + limite < todos.length, total: todos.length };
  },
  "GET /productos/marcas": ({ query }) => marcasDe(query.get("buscar") ? buscar(query) : productos()),
  "GET /productos/resumen": () => { const ps = productos(); return { productos: ps.length, sin_margen: ps.filter((p) => p.margen_elegido === null && p.costo_neto !== null).length }; },
  "GET /productos/descarga": ({ query }) => (query.get("marca") ? { productos: [], quitados: [], hay_mas: false, siguiente: null, marca: "2" } : { productos: productos(), quitados: [], hay_mas: false, siguiente: null, marca: "1" }),
  "GET /stock/cambios": ({ query }) => ({ marca: "1", stock: query.get("marca") ? {} : stockDeMentira() }),
};
