// Mueve archivos del front y corrige cada import que los nombra (specs/024, ADR-028).
// Uso: node scripts/mover.mjs viejo=nuevo [viejo=nuevo …]   (caminos relativos a src/)
// Fuera de su módulo (la carpeta de primer nivel de plataforma, datos, ui o negocio), lo movido
// se importa por el index.ts del módulo, que el script crea o completa. Las pruebas también: su
// vi.mock tiene que reemplazar lo mismo que importa el código, que es el index.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";

const SRC = join(dirname(new URL(import.meta.url).pathname), "..", "src");
const EXTENSIONES = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const MODULO = /^(plataforma|datos|ui|negocio)\/[^/]+/;
const CAMINO = /(from\s+|import\s*\(\s*|import\s+|vi\.(?:do)?(?:un)?mock\(\s*|vi\.importActual(?:<[^>]*>)?\(\s*|importOriginal(?:<[^>]*>)?\(\s*)(["'])(\.{1,2}\/[^"']+)\2/g;

const mudanzas = new Map(process.argv.slice(2).map((par) => par.split("=")));
const moduloDe = (archivo) => MODULO.exec(archivo)?.[0] ?? null;

function todos(carpeta = SRC) {
  return readdirSync(carpeta).flatMap((n) => {
    const camino = join(carpeta, n);
    return statSync(camino).isDirectory() ? todos(camino) : /\.(tsx?|css)$/.test(n) ? [relative(SRC, camino)] : [];
  });
}

// El archivo al que apunta un import, en el árbol de antes de mover.
function resolver(desde, especificador, existentes) {
  const base = posix.normalize(posix.join(posix.dirname(desde), especificador));
  if (existentes.has(base)) return base;
  return EXTENSIONES.map((e) => base + e).find((c) => existentes.has(c)) ?? null;
}

function especificadorHacia(desde, hacia, original) {
  const sinExtension = /\.(css|svg|png|json|woff2)$/.test(original) ? hacia : hacia.replace(/(\/index)?\.tsx?$/, "");
  const r = posix.relative(posix.dirname(desde), sinExtension);
  return r.startsWith(".") ? r : `./${r}`;
}

const antes = todos();
const existentes = new Set(antes);
const nuevoDe = (archivo) => mudanzas.get(archivo) ?? archivo;
const indices = new Map();

for (const archivo of antes) {
  const destinoDelArchivo = nuevoDe(archivo);
  const texto = readFileSync(join(SRC, archivo), "utf8");
  const cambiado = texto.replace(CAMINO, (todo, prefijo, comilla, especificador) => {
    const apuntado = resolver(archivo, especificador, existentes);
    if (!apuntado || (!mudanzas.has(apuntado) && !mudanzas.has(archivo))) return todo;
    let hacia = nuevoDe(apuntado);
    const modulo = moduloDe(hacia);
    if (mudanzas.has(apuntado) && modulo && moduloDe(destinoDelArchivo) !== modulo && !/\.css$/.test(hacia)) {
      indices.set(modulo, [...(indices.get(modulo) ?? []), hacia]);
      hacia = `${modulo}/index.ts`;
    }
    return `${prefijo}${comilla}${especificadorHacia(destinoDelArchivo, hacia, especificador)}${comilla}`;
  });
  if (cambiado !== texto) writeFileSync(join(SRC, archivo), cambiado);
}

for (const [viejo, nuevo] of mudanzas) {
  execFileSync("mkdir", ["-p", dirname(join(SRC, nuevo))]);
  execFileSync("git", ["mv", join(SRC, viejo), join(SRC, nuevo)]);
}

for (const [modulo, archivos] of indices) {
  const indice = join(SRC, modulo, "index.ts");
  const actual = existsSync(indice) ? readFileSync(indice, "utf8") : "";
  const nuevas = [...new Set(archivos)].map((a) => `export * from "./${posix.relative(modulo, a).replace(/\.tsx?$/, "")}";`).filter((l) => !actual.includes(l));
  if (nuevas.length) writeFileSync(indice, actual + nuevas.join("\n") + "\n");
}
console.log(`${mudanzas.size} movidos; índices: ${[...indices.keys()].join(", ") || "ninguno"}`);
