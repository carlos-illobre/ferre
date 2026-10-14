// Revisa el código apenas el agente edita un archivo, para que vea sus errores en el
// momento y no al final. Lo llama Claude Code después de cada edición
// (.claude/settings.json, PostToolUse). Si encuentra errores, sale con código 2: Claude
// Code le muestra el detalle al agente para que los corrija antes de seguir.
//
// Corre el control de tipos del paquete del archivo, de forma incremental (la primera
// vez tarda; las siguientes, unos segundos), y no corre ESLint porque el proyecto no lo usa.
// No reemplaza las compuertas de antes de subir: no corre pruebas.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
// Cada paquete: su carpeta, el tsconfig que cubre todos sus archivos y si corre ESLint.
const PAQUETES = [
  { carpeta: 'microservices/api', tsconfig: 'tsconfig.pruebas.json', eslint: false },
  { carpeta: 'microservices/web', tsconfig: 'tsconfig.json', eslint: false },
];
const EXTENSIONES = /\.(ts|tsx|mts|cts|js|jsx|mjs)$/;
const MAXIMO = 40;

let entrada = {};
try { entrada = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
const pedido = entrada.tool_input?.file_path;
if (!pedido) process.exit(0);
const ruta = relative(RAIZ, resolve(RAIZ, pedido)).split('\\').join('/');
const paquete = PAQUETES.find((p) => ruta.startsWith(`${p.carpeta}/`));
if (!paquete || !EXTENSIONES.test(ruta)) process.exit(0);

const dir = join(RAIZ, paquete.carpeta);
const bin = (nombre) => join(dir, 'node_modules', '.bin', nombre);
// Sin dependencias instaladas no hay con qué revisar: no se molesta al agente.
if (!existsSync(bin('tsc'))) process.exit(0);
const cache = join(dir, 'node_modules', '.cache', 'revisar-al-editar');
mkdirSync(cache, { recursive: true });

const correr = (comando, args) => {
  const r = spawnSync(comando, args, { cwd: dir, encoding: 'utf8', timeout: 120_000 });
  return { ok: r.status === 0, salida: `${r.stdout || ''}${r.stderr || ''}`.trim() };
};

const problemas = [];
const tipos = correr(bin('tsc'), ['--noEmit', '-p', paquete.tsconfig, '--incremental', '--tsBuildInfoFile', join(cache, 'tsc.tsbuildinfo'), '--pretty', 'false']);
if (!tipos.ok) problemas.push(['Errores de tipos', tipos.salida]);
if (paquete.eslint && existsSync(bin('eslint'))) {
  const archivo = relative(dir, join(RAIZ, ruta));
  const lint = correr(bin('eslint'), ['--cache', '--cache-location', join(cache, 'eslint'), '--max-warnings=0', archivo]);
  if (!lint.ok) problemas.push([`ESLint en ${ruta}`, lint.salida]);
}
if (!problemas.length) process.exit(0);

const texto = problemas.map(([titulo, salida]) => {
  const lineas = salida.split('\n').filter((l) => l.trim());
  const mostradas = lineas.slice(0, MAXIMO).join('\n');
  return `${titulo} (en ${paquete.carpeta}):\n${mostradas}${lineas.length > MAXIMO ? `\n… y ${lineas.length - MAXIMO} líneas más` : ''}`;
}).join('\n\n');
console.error(`Después de editar ${ruta}:\n\n${texto}\n\nCorregí los que causó esta tarea antes de seguir. Si alguno ya estaba antes o es de archivos que esta tarea no tocó, no lo arregles de paso: anotalo.`);
process.exit(2);
