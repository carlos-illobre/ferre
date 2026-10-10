#!/usr/bin/env node
// Trazabilidad entre especificaciones y pruebas (constitución, principio VI).
//
// Recorre specs/*/spec.md y comprueba que cada escenario de aceptación tenga debajo su
// línea «Prueba:» y que los archivos que nombra existan. Una especificación en borrador
// (Status: Draft) no se controla: QA todavía no escribió sus pruebas. En la línea de base
// (Status: Baseline) un escenario puede decir «Prueba: ninguna» y se informa; en una
// funcionalidad cerrada (Status: Implemented) eso es un error.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const SPECS = join(RAIZ, 'specs');
const ESCENARIO = /^\s*\d+\.\s+\*\*Given\*\*/;
const PRUEBA = /^\s*-\s+Prueba:\s*(.*)$/;

export function revisar(texto, existe) {
  const estado = (texto.match(/^\*\*Status\*\*:\s*(\w+)/m) || [])[1] || 'Draft';
  const resultado = { estado, escenarios: 0, sinPrueba: 0, errores: [] };
  if (estado === 'Draft') return resultado;
  const lineas = texto.split('\n');
  lineas.forEach((linea, i) => {
    if (!ESCENARIO.test(linea)) return;
    resultado.escenarios += 1;
    // La línea «Prueba:» es la primera no vacía después del escenario, que puede ocupar varias.
    let j = i + 1;
    while (j < lineas.length && lineas[j].trim() && !PRUEBA.test(lineas[j]) && !ESCENARIO.test(lineas[j])) j += 1;
    while (j < lineas.length && !lineas[j].trim()) j += 1;
    const prueba = (lineas[j] || '').match(PRUEBA);
    if (!prueba) return void resultado.errores.push(`línea ${i + 1}: el escenario no tiene su línea «Prueba:»`);
    const valor = prueba[1].replace(/`/g, '').trim();
    if (/^ninguna\b/i.test(valor)) {
      resultado.sinPrueba += 1;
      if (estado !== 'Baseline') resultado.errores.push(`línea ${i + 1}: una funcionalidad cerrada no puede tener un escenario sin prueba`);
      return;
    }
    for (const ruta of valor.split(',').map((r) => r.trim().split(/\s/)[0]).filter(Boolean)) {
      if (!existe(ruta)) resultado.errores.push(`línea ${j + 1}: no existe la prueba ${ruta}`);
    }
  });
  return resultado;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let fallas = 0;
  const carpetas = existsSync(SPECS) ? readdirSync(SPECS).filter((c) => /^\d{3}-/.test(c)).sort() : [];
  for (const carpeta of carpetas) {
    const archivo = join(SPECS, carpeta, 'spec.md');
    if (!existsSync(archivo)) continue;
    const r = revisar(readFileSync(archivo, 'utf8'), (ruta) => existsSync(join(RAIZ, ruta)));
    const resumen = r.estado === 'Draft' ? 'en borrador, sin controlar' : `${r.escenarios} escenarios, ${r.sinPrueba} sin prueba`;
    console.log(`${r.errores.length ? '✗' : '✓'} ${carpeta} (${r.estado}): ${resumen}`);
    for (const error of r.errores) console.log(`    ${error}`);
    fallas += r.errores.length;
  }
  if (fallas) {
    console.error(`\n${fallas} problema(s) de trazabilidad.`);
    process.exit(1);
  }
}
