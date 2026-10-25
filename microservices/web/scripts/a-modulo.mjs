// Pasa una hoja de estilos global a CSS Modules (specs/024, ADR-028) sin cambiar nada a la vista.
// Uso: node scripts/a-modulo.mjs <hoja.css> <prefijo>[,<prefijo>…] <destino.module.css> <pantalla.tsx> [<pantalla.tsx> …]
//      (caminos relativos a src/)
// - En la hoja: cada clase con uno de los prefijos pasa a ser del módulo (`.vhc-fila-cab` → `.filaCab`) y
//   las demás quedan globales (`:global(.boton)`), así cada regla pesa lo mismo que antes. Las
//   animaciones que usa y no define (las de otras hojas) se copian al módulo, que si no las renombraría.
// - En cada pantalla: el className que nombra esas clases pasa a usar el módulo (`css.filaCab`), se
//   importa el módulo y se quita el import de la hoja.
// Lo que no sabe cambiar (una clase del prefijo fuera de un className, como en un querySelector) lo
// lista al final, para hacerlo a mano.
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join, relative, basename } from "node:path";

const SRC = join(dirname(new URL(import.meta.url).pathname), "..", "src");
const postcss = createRequire(createRequire(import.meta.url).resolve("vite"))("postcss");
const [hojaRel, prefijosTexto, destinoRel, ...pantallasRel] = process.argv.slice(2);
if (!pantallasRel.length) { console.error("Uso: node scripts/a-modulo.mjs <hoja.css> <prefijos> <destino.module.css> <pantalla.tsx>…"); process.exit(1); }
const prefijos = prefijosTexto.split(",");
const CLASE = /\.(-?[_a-zA-Z][\w-]*)/g;
const delPrefijo = (c) => prefijos.find((p) => c.startsWith(p));
const camello = (t) => t.replace(/-+([a-z0-9])/g, (_, l) => l.toUpperCase());

// El nombre en el módulo: sin el prefijo y en camello; si dos chocan, con el prefijo.
const nombres = new Map();
function nombreDe(clase) {
  if (!nombres.has(clase)) {
    const resto = clase.slice(delPrefijo(clase).length) || "raiz";
    let n = camello(resto.replace(/^-/, ""));
    if (/^\d/.test(n) || [...nombres.values()].includes(n)) n = camello(clase);
    nombres.set(clase, n);
  }
  return nombres.get(clase);
}

function todasLasHojas(carpeta = SRC) {
  return readdirSync(carpeta).flatMap((n) => {
    const c = join(carpeta, n);
    return statSync(c).isDirectory() ? todasLasHojas(c) : n.endsWith(".css") && !n.endsWith(".module.css") ? [c] : [];
  });
}

// Las animaciones definidas en las hojas globales, para copiar las que use el módulo.
const globales = new Map();
for (const h of todasLasHojas()) postcss.parse(readFileSync(h, "utf8")).walkAtRules("keyframes", (r) => { if (!globales.has(r.params)) globales.set(r.params, r.toString()); });

// Las clases del prefijo que nombra alguna pantalla: las demás no se usan y se podan.
const TOKEN_LIBRE = () => new RegExp(`(?<![\\w-])(${prefijos.map((p) => p.replace(/[-]/g, "\\-")).join("|")})[\\w-]*`, "g");
const usadas = new Set(pantallasRel.flatMap((p) => readFileSync(join(SRC, p), "utf8").match(TOKEN_LIBRE()) ?? []));
const clasesDe = (selector) => [...selector.matchAll(CLASE)].map((m) => m[1]).filter((c) => delPrefijo(c));

function convertirHoja(texto) {
  const raiz = postcss.parse(texto);
  // Lo que no usa ninguna pantalla se va; las usadas se nombran primero, así no chocan con lo podado.
  raiz.walkRules((regla) => {
    if (regla.parent?.type === "atrule" && regla.parent.name === "keyframes") return;
    const vivos = regla.selectors.filter((sel) => clasesDe(sel).every((c) => usadas.has(c)));
    if (!vivos.length) regla.remove(); else regla.selectors = vivos;
  });
  raiz.walkAtRules((r) => { if (r.name !== "keyframes" && !r.nodes?.length) r.remove(); });
  raiz.walkRules((regla) => clasesDe(regla.selector).forEach(nombreDe));
  const propias = new Set();
  raiz.walkAtRules("keyframes", (r) => propias.add(r.params));
  raiz.walkRules((regla) => {
    if (regla.parent?.type === "atrule" && regla.parent.name === "keyframes") return;
    regla.selector = regla.selector.replace(CLASE, (_, c) => (delPrefijo(c) ? `.${nombreDe(c)}` : `:global(.${c})`));
  });
  const ajenas = new Set();
  raiz.walkDecls(/^animation(-name)?$/, (d) => { for (const n of globales.keys()) if (!propias.has(n) && new RegExp(`(^|[\\s,])${n}($|[\\s,])`).test(d.value)) ajenas.add(n); });
  let salida = raiz.toString();
  if (ajenas.size) salida += `\n/* Las animaciones de otras hojas que usa esta: el módulo renombra las que nombra. */\n${[...ajenas].map((n) => globales.get(n)).join("\n")}\n`;
  return salida;
}

// Reemplaza las clases del prefijo en el texto de un string ("…" o '…'): devuelve el código nuevo.
const TOKEN = () => new RegExp(`(?<![\\w-])(${prefijos.map((p) => p.replace(/[-]/g, "\\-")).join("|")})[\\w-]*`, "g");
function deString(contenido, comilla) {
  if (!TOKEN().test(contenido)) return `${comilla}${contenido}${comilla}`;
  const solo = contenido.match(TOKEN());
  if (solo && solo[0] === contenido) return `css.${nombreDe(contenido)}`;
  return "`" + contenido.replace(/`/g, "\\`").replace(TOKEN(), (c) => `\${css.${nombreDe(c)}}`) + "`";
}

// Recorre una expresión de JavaScript y cambia los strings y lo fijo de los templates.
function deExpresion(e) {
  let sal = "", i = 0;
  while (i < e.length) {
    const ch = e[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1; while (j < e.length && e[j] !== ch) j += e[j] === "\\" ? 2 : 1;
      sal += deString(e.slice(i + 1, j), ch); i = j + 1;
    } else if (ch === "`") {
      let j = i + 1; let texto = "";
      sal += "`";
      while (j < e.length && e[j] !== "`") {
        if (e[j] === "$" && e[j + 1] === "{") {
          sal += texto.replace(TOKEN(), (c) => `\${css.${nombreDe(c)}}`); texto = "";
          let k = j + 2, nivel = 1;
          while (k < e.length && nivel) { if (e[k] === "{") nivel++; else if (e[k] === "}") nivel--; if (nivel) k++; }
          sal += "${" + deExpresion(e.slice(j + 2, k)) + "}"; j = k + 1;
        } else { texto += e[j]; j++; }
      }
      sal += texto.replace(TOKEN(), (c) => `\${css.${nombreDe(c)}}`) + "`"; i = j + 1;
    } else { sal += ch; i++; }
  }
  return sal;
}

function convertirPantalla(texto, hojaImportada, importDelModulo) {
  let t = texto.replace(/className=("([^"]*)"|\{)/g, (m, _a, literal, desde) => (literal !== undefined ? `__CN__${literal}__FIN__` : m));
  t = t.replace(/__CN__([^]*?)__FIN__/g, (_, l) => { const r = deString(l, '"'); return r.startsWith('"') ? `className=${r}` : `className={${r}}`; });
  // className={…}: hasta la llave que cierra.
  let sal = "", i = 0;
  for (;;) {
    const k = t.indexOf("className={", i);
    if (k < 0) { sal += t.slice(i); break; }
    sal += t.slice(i, k + 11);
    let j = k + 11, nivel = 1, enStr = null;
    while (j < t.length && nivel) {
      const c = t[j];
      if (enStr) { if (c === "\\") j++; else if (c === enStr) enStr = null; }
      else if (c === '"' || c === "'" || c === "`") enStr = c;
      else if (c === "{") nivel++; else if (c === "}") nivel--;
      if (nivel) j++;
    }
    sal += deExpresion(t.slice(k + 11, j)) + "}"; i = j + 1;
  }
  const lineas = sal.split("\n").filter((l) => !(l.startsWith("import ") && l.includes(`"${hojaImportada}"`)));
  if (lineas.some((l) => l.includes("css.")) && !lineas.some((l) => l.includes(importDelModulo))) {
    const ultima = lineas.reduce((u, l, n) => (l.startsWith("import ") ? n : u), -1);
    lineas.splice(ultima + 1, 0, importDelModulo);
  }
  return lineas.join("\n");
}

const hoja = join(SRC, hojaRel), destino = join(SRC, destinoRel);
// Todas las que importan la hoja tienen que pasar al módulo a la vez.
function todosLosArchivos(carpeta = SRC) {
  return readdirSync(carpeta).flatMap((n) => { const c = join(carpeta, n); return statSync(c).isDirectory() ? todosLosArchivos(c) : /\.tsx?$/.test(n) ? [c] : []; });
}
const faltan = todosLosArchivos().filter((a) => !pantallasRel.map((p) => join(SRC, p)).includes(a))
  .filter((a) => readFileSync(a, "utf8").includes(`"${relative(dirname(a), hoja).replace(/^(?!\.)/, "./")}"`));
if (faltan.length) { console.error(`También importan la hoja: ${faltan.map((a) => relative(SRC, a)).join(", ")}`); process.exit(1); }
const css = convertirHoja(readFileSync(hoja, "utf8"));
const pendientes = [];
for (const p of pantallasRel) {
  const archivo = join(SRC, p);
  const texto = readFileSync(archivo, "utf8");
  const aHoja = relative(dirname(archivo), hoja).replace(/^(?!\.)/, "./");
  const aModulo = relative(dirname(archivo), destino).replace(/^(?!\.)/, "./");
  const nuevo = convertirPantalla(texto, aHoja, `import css from "${aModulo}";`);
  writeFileSync(archivo, nuevo);
  nuevo.split("\n").forEach((l, n) => { if (!l.includes("css.") && !l.startsWith("import") && TOKEN().test(l)) pendientes.push(`${p}:${n + 1}: ${l.trim().slice(0, 140)}`); });
}
writeFileSync(destino, css);
if (destino !== hoja && existsSync(hoja)) unlinkSync(hoja);
console.log(`${basename(destino)}: ${nombres.size} clases propias.`);
if (pendientes.length) console.log(`A mano:\n${pendientes.join("\n")}`);
