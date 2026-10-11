#!/usr/bin/env node
// Regla y estado, separados (constitución, principio I y convenciones).
//
// specs/ dice qué tiene que hacer el sistema y no depende del código; proyecto/estado.yml
// dice cómo está cada requerimiento hoy. Este control comprueba que:
//   1. Cada requerimiento del índice (specs/README.md) esté escrito en alguna spec.md y
//      tenga su entrada en proyecto/estado.yml, y que no sobre ninguno en ningún lado.
//   2. Cada prueba que nombra el estado exista.
//   3. Las especificaciones no nombren archivos del código ni lleven líneas «Prueba:».
// Un requerimiento «Hecho» sin ninguna prueba se informa, sin cortar.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ID = /RN?F-\d+[a-z]?/;
const CODIGO = /(^|[\s`(])(clientes|microservices|libraries|tests|src)\/[\w./-]+|\b[\w-]+\.(tsx?|mjs|py|sql|css)\b/;

export function idsDelIndice(texto) {
  return [...texto.matchAll(new RegExp(`^\\|\\s*(${ID.source})\\s*\\|`, 'gm'))].map((m) => m[1]);
}

export function idsDeUnaSpec(texto) {
  return [...texto.matchAll(new RegExp(`\\*\\*(${ID.source})\\*\\*`, 'g'))].map((m) => m[1]);
}

// El estado es un YAML simple: claves de primer nivel con el ID, y debajo `estado:`,
// `pruebas:` y `defectos:` con listas. Se lee sin dependencias para poder correr en el CI.
export function leerEstado(texto) {
  const estado = {};
  let actual = null;
  let lista = null;
  for (const linea of texto.split('\n')) {
    const clave = linea.match(/^([\w-]+):\s*$/);
    if (clave) {
      actual = estado[clave[1]] = { estado: '', pruebas: [], defectos: [] };
      lista = null;
      continue;
    }
    if (!actual) continue;
    const campo = linea.match(/^ {2}(\w+):\s*(.*)$/);
    if (campo) {
      lista = null;
      if (campo[1] === 'estado') actual.estado = campo[2].replace(/^"|"$/g, '');
      else if (campo[2] !== '[]') lista = actual[campo[1]] = [];
      continue;
    }
    const item = linea.match(/^ {4}-\s+(.*)$/);
    if (item && lista) lista.push(item[1].replace(/^"|"$/g, ''));
  }
  return estado;
}

export function revisar({ indice, specs, estado, existe }) {
  const errores = [];
  const avisos = [];
  const delIndice = idsDelIndice(indice);
  const enSpecs = new Set(specs.flatMap((s) => idsDeUnaSpec(s.texto)));
  for (const id of delIndice) {
    if (!enSpecs.has(id)) errores.push(`${id} está en el índice y en ninguna spec.md`);
    if (!estado[id]) errores.push(`${id} está en el índice y no tiene entrada en proyecto/estado.yml`);
  }
  for (const id of Object.keys(estado)) {
    if (id !== 'general' && !delIndice.includes(id)) errores.push(`${id} está en proyecto/estado.yml y no en el índice`);
  }
  for (const [id, dato] of Object.entries(estado)) {
    for (const prueba of dato.pruebas) if (!existe(prueba)) errores.push(`${id}: no existe la prueba ${prueba}`);
    if (/^hecho(?! en parte)/i.test(dato.estado) && !dato.pruebas.length) avisos.push(`${id} figura hecho sin ninguna prueba`);
  }
  for (const { archivo, texto } of specs) {
    texto.split('\n').forEach((linea, i) => {
      if (/^\s*-\s+Prueba:/.test(linea)) errores.push(`${archivo}:${i + 1}: la prueba va en proyecto/estado.yml, no en la especificación`);
      else if (CODIGO.test(linea)) errores.push(`${archivo}:${i + 1}: la especificación nombra un archivo del código`);
    });
  }
  return { errores, avisos, requerimientos: delIndice.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const leer = (ruta) => readFileSync(join(RAIZ, ruta), 'utf8');
  const carpetas = readdirSync(join(RAIZ, 'specs')).filter((c) => /^\d{3}-/.test(c)).sort();
  const specs = carpetas.flatMap((c) =>
    ['spec.md', 'ux.md', 'resumen.md'].filter((a) => existsSync(join(RAIZ, 'specs', c, a))).map((a) => ({ archivo: `specs/${c}/${a}`, texto: leer(`specs/${c}/${a}`) })),
  );
  const r = revisar({
    indice: leer('specs/README.md'),
    specs,
    estado: leerEstado(leer('proyecto/estado.yml')),
    existe: (ruta) => existsSync(join(RAIZ, ruta)),
  });
  console.log(`${r.requerimientos} requerimientos, ${specs.length} documentos de especificación`);
  for (const aviso of r.avisos) console.log(`  aviso: ${aviso}`);
  for (const error of r.errores) console.log(`  ✗ ${error}`);
  if (r.errores.length) {
    console.error(`\n${r.errores.length} problema(s).`);
    process.exit(1);
  }
  console.log('✓ la especificación y el estado coinciden');
}
