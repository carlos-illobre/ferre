// El control de código repetido (decisión 166): entre el celular y la computadora se puede repetir
// el dibujo, nunca la lógica. Corre jscpd y falla con cualquier repetición, salvo la de una pieza
// visual (.tsx o .css) del celular con una de la computadora.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const salida = mkdtempSync(join(tmpdir(), "repetido-"));
try {
  execFileSync("npx", ["jscpd", "--config", ".jscpd.json", "--reporters", "json", "--output", salida, "--threshold", "100", "--silent"], { stdio: "inherit" });
  const { duplicates } = JSON.parse(readFileSync(join(salida, "jscpd-report.json"), "utf8"));
  const esVisual = (f) => /\.(tsx|css)$/.test(f) && f.startsWith("src/pantallas/");
  // Del celular: lo que está en pantallas/celular/ y los capítulos del manual escritos para el celular.
const esDelCelular = (f) => f.includes("/celular/") || /\/manual\/[^/]*Celular[^/]*$/.test(f);
  const permitida = ({ firstFile: a, secondFile: b }) => esVisual(a.name) && esVisual(b.name) && esDelCelular(a.name) !== esDelCelular(b.name);
  const prohibidas = duplicates.filter((d) => !permitida(d));
  for (const d of prohibidas) console.log(`repetido: ${d.firstFile.name}:${d.firstFile.start}-${d.firstFile.end} y ${d.secondFile.name}:${d.secondFile.start}-${d.secondFile.end} (${d.lines} líneas)`);
  console.log(`Código repetido: ${prohibidas.length} prohibidas; ${duplicates.length - prohibidas.length} del dibujo del celular y la computadora (decisión 166).`);
  process.exitCode = prohibidas.length ? 1 : 0;
} finally { rmSync(salida, { recursive: true, force: true }); }
