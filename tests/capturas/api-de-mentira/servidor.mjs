// API de mentira para sacar capturas de la interfaz sin Docker ni base de datos. Cada archivo rutas-*.mjs de esta carpeta
// exporta por defecto { "GET /ruta": (ctx) => valor | [estado, valor] }. Las rutas admiten
// :parametros. ctx = { params, query, body }. Uso: node servidor.mjs [puerto]
import http from "node:http";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
const dir = path.dirname(fileURLToPath(import.meta.url));
const rutas = [];
for (const f of readdirSync(dir).filter((f) => /^rutas-.*\.mjs$/.test(f)).sort()) {
  const m = (await import(pathToFileURL(path.join(dir, f)).href)).default;
  for (const [clave, fn] of Object.entries(m)) {
    const [metodo, camino] = clave.split(" ");
    const nombres = [];
    const re = new RegExp("^" + camino.replace(/:[a-zA-Z_]+/g, (n) => { nombres.push(n.slice(1)); return "([^/]+)"; }) + "$");
    rutas.push({ metodo, re, nombres, fn, clave });
  }
}
http.createServer(async (req, res) => {
  const cab = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
  if (req.method === "OPTIONS") { res.writeHead(204, cab); return res.end(); }
  const url = new URL(req.url, "http://x");
  let crudo = ""; for await (const c of req) crudo += c;
  let body = null; try { body = crudo ? JSON.parse(crudo) : null; } catch { body = crudo; }
  // La última definición gana: un archivo posterior puede pisar una ruta base.
  const r = [...rutas].reverse().find((r) => r.metodo === req.method && r.re.test(url.pathname));
  if (!r) { console.log("SIN RUTA", req.method, url.pathname); res.writeHead(404, { ...cab, "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: `(mock) sin ruta ${req.method} ${url.pathname}` })); }
  const m = url.pathname.match(r.re); const params = Object.fromEntries(r.nombres.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
  let out = await r.fn({ params, query: url.searchParams, body });
  let estado = 200; if (Array.isArray(out) && typeof out[0] === "number" && out.length === 2) [estado, out] = out;
  if (out === undefined) { res.writeHead(204, cab); return res.end(); }
  res.writeHead(estado, { ...cab, "Content-Type": "application/json" }); res.end(JSON.stringify(out));
}).listen(Number(process.argv[2] ?? 8799), () => console.log("mock listo"));
