// La compuerta del flujo de trabajo: no deja tocar el código si el trabajo no está anotado
// en un tasks.md y si le falta la documentación que su tamaño exige. La constitución
// (.specify/memory/constitution.md, «Flujo de trabajo») dice el porqué de cada regla.
//
//   node tests/compuerta.mjs empezar 003-T014   anota que se empieza esa tarea y dice qué le falta
//   node tests/compuerta.mjs terminar 003-T014  comprueba el cierre y la da por terminada
//   node tests/compuerta.mjs estado             qué tareas están empezadas
//   node tests/compuerta.mjs revisar            formato de todos los tasks.md (corre en el CI)
//   node tests/compuerta.mjs hook               lo llama Claude Code antes de editar un archivo
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
// Las carpetas donde vive el código: editarlas exige una tarea empezada.
const CODIGO = ['clientes/', 'microservices/'];
const EN_CURSO = join(RAIZ, '.specify', 'en-curso.json');
const TIPOS = ['arreglo', 'ajuste', 'interfaz', 'regla'];
const LINEA = /^- \[( |x|X)\] (T\d{3})((?: \[[^\]]+\])*) (.+)$/;

const leer = (ruta) => (existsSync(join(RAIZ, ruta)) ? readFileSync(join(RAIZ, ruta), 'utf8') : '');
const git = (...args) => { try { return execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }); } catch { return ''; } };
const carpetas = () => readdirSync(join(RAIZ, 'specs')).filter((c) => /^\d{3}-/.test(c)).sort();
const carpetaDe = (numero) => carpetas().find((c) => c.startsWith(`${numero}-`));

export function leerTareas(texto) {
  return texto.split('\n').map((l) => l.match(LINEA)).filter(Boolean).map((m) => {
    const marcas = [...m[3].matchAll(/\[([^\]]+)\]/g)].map((x) => x[1]);
    const depende = (m[4].match(/\(depende de ([^)]+)\)/i) || [, ''])[1].match(/T\d{3}/g) || [];
    return { id: m[2], hecha: m[1] !== ' ', paralela: marcas.includes('P'), tipo: marcas.find((x) => TIPOS.includes(x)) || 'funcionalidad', texto: m[4], depende };
  });
}

function buscar(referencia) {
  const m = /^(\d{3})-(T\d{3})$/.exec(referencia || '');
  if (!m) throw new Error(`«${referencia}» no es una tarea. Se escribe como 003-T014: la carpeta de specs/ y el número de la tarea.`);
  const carpeta = carpetaDe(m[1]);
  if (!carpeta) throw new Error(`No hay ninguna carpeta ${m[1]}-… en specs/.`);
  const tarea = leerTareas(leer(`specs/${carpeta}/tasks.md`)).find((t) => t.id === m[2]);
  if (!tarea) throw new Error(`${m[2]} no está en specs/${carpeta}/tasks.md. Primero se anota la tarea ahí.`);
  return { ...tarea, carpeta, referencia };
}

// Lo que tiene que existir antes de escribir código, según el tamaño del cambio.
function faltantes(tarea, desde) {
  const falta = [];
  const base = `specs/${tarea.carpeta}`;
  if (tarea.tipo === 'arreglo') return falta;
  if (tarea.tipo === 'funcionalidad') {
    const spec = leer(`${base}/spec.md`);
    if (!spec) falta.push(`${base}/spec.md no existe (paso 1, analista)`);
    else {
      if (!/^\*\*Status\*\*:\s*Aprobada/m.test(spec)) falta.push(`${base}/spec.md no dice «**Status**: Aprobada»: falta que Carlos apruebe la especificación`);
      if (spec.includes('[NEEDS CLARIFICATION')) falta.push(`${base}/spec.md tiene preguntas abiertas: se le preguntan a Carlos antes de programar`);
      if (!/^\*\*Maquetas\*\*:\s*(Aprobadas|No lleva pantallas)/m.test(spec)) falta.push(`${base}/spec.md no dice «**Maquetas**: Aprobadas» ni «**Maquetas**: No lleva pantallas» (paso 2, diseñador)`);
      if (!/\bE\d{2}\b/.test(spec)) falta.push(`${base}/spec.md no tiene escenarios numerados (E01, E02…) con sus casos de error y de borde (paso 4, QA)`);
    }
    const plan = leer(`${base}/plan.md`);
    if (!plan) falta.push(`${base}/plan.md no existe (paso 3, arquitecto)`);
    else if (!/^## Seguridad/m.test(plan)) falta.push(`${base}/plan.md no tiene la sección «## Seguridad» (si no aplica, se escribe por qué)`);
    return falta;
  }
  // Ajuste, cambio de interfaz o de regla: primero se escribe en la documentación.
  const tocados = `${git('diff', '--name-only', desde)}\n${git('ls-files', '--others', '--exclude-standard')}`.split('\n').filter(Boolean);
  const documentos = tocados.filter((a) => (a.startsWith('specs/') && !a.endsWith('/tasks.md')) || a.startsWith('docs/'));
  if (!documentos.length) {
    falta.push(tarea.tipo === 'interfaz'
      ? 'Un cambio de interfaz empieza por la maqueta: falta en specs/<capacidad>/maquetas/, aprobada por Carlos'
      : `Un${tarea.tipo === 'regla' ? ' cambio de regla' : ' ajuste'} se escribe primero en la documentación (spec.md, ux.md o docs/): todavía no se tocó ningún documento`);
  }
  return falta;
}

const leerEnCurso = () => { try { return JSON.parse(readFileSync(EN_CURSO, 'utf8')); } catch { return {}; } };
const guardarEnCurso = (dato) => writeFileSync(EN_CURSO, `${JSON.stringify(dato, null, 2)}\n`);

function empezar(referencia) {
  const tarea = buscar(referencia);
  if (tarea.hecha) throw new Error(`${referencia} ya figura hecha en su tasks.md.`);
  const pendientes = tarea.depende.filter((id) => !leerTareas(leer(`specs/${tarea.carpeta}/tasks.md`)).find((t) => t.id === id)?.hecha);
  if (pendientes.length) throw new Error(`${referencia} depende de ${pendientes.join(', ')}, que todavía no están hechas.`);
  const enCurso = leerEnCurso();
  enCurso[referencia] = { tipo: tarea.tipo, desde: git('rev-parse', 'HEAD').trim() };
  guardarEnCurso(enCurso);
  const falta = faltantes(tarea, enCurso[referencia].desde);
  console.log(`Empezada ${referencia} (${tarea.tipo}): ${tarea.texto}`);
  console.log(falta.length ? `Antes de tocar el código falta:\n${falta.map((f) => `  - ${f}`).join('\n')}` : 'Tiene lo que hace falta para programar.');
}

function terminar(referencia) {
  const tarea = buscar(referencia);
  if (!tarea.hecha) throw new Error(`${referencia} no está marcada [x] en specs/${tarea.carpeta}/tasks.md.`);
  if (tarea.tipo === 'funcionalidad') {
    const todas = leerTareas(leer(`specs/${tarea.carpeta}/tasks.md`));
    if (todas.every((t) => t.hecha)) {
      const numero = tarea.carpeta.slice(0, 3);
      const escenarios = [...new Set(leer(`specs/${tarea.carpeta}/spec.md`).match(/\bE\d{2}\b/g) || [])];
      const sinPrueba = escenarios.filter((e) => !git('grep', '-l', `${numero}-${e}`, '--', ...['clientes/', 'microservices/', 'tests/']).trim());
      if (sinPrueba.length) throw new Error(`Era la última tarea de ${tarea.carpeta} y hay escenarios sin prueba que los nombre (${sinPrueba.map((e) => `${numero}-${e}`).join(', ')}).`);
      if (!existsSync(join(RAIZ, 'specs', tarea.carpeta, 'revision.md'))) throw new Error(`Era la última tarea de ${tarea.carpeta}: falta specs/${tarea.carpeta}/revision.md, la revisión independiente (paso 7).`);
    }
  }
  const enCurso = leerEnCurso();
  delete enCurso[referencia];
  guardarEnCurso(enCurso);
  console.log(`Terminada ${referencia}.`);
}

// Formato de todos los tasks.md: lo que el tablero del portafolio y esta compuerta leen.
export function revisar() {
  const errores = [];
  for (const carpeta of carpetas()) {
    const texto = leer(`specs/${carpeta}/tasks.md`);
    if (!texto) continue;
    const tareas = leerTareas(texto);
    const ids = new Set();
    texto.split('\n').forEach((linea, i) => {
      if (/^- \[[ xX]\]/.test(linea) && !LINEA.test(linea)) errores.push(`specs/${carpeta}/tasks.md:${i + 1}: la tarea no tiene la forma «- [ ] T001 [tipo] Descripción»`);
    });
    for (const t of tareas) {
      if (ids.has(t.id)) errores.push(`specs/${carpeta}/tasks.md: ${t.id} está repetida`);
      ids.add(t.id);
    }
    for (const t of tareas) for (const d of t.depende) if (!ids.has(d)) errores.push(`specs/${carpeta}/tasks.md: ${t.id} depende de ${d}, que no existe`);
    if (tareas.some((t) => t.tipo === 'funcionalidad') && !/^## Seguridad/m.test(leer(`specs/${carpeta}/plan.md`))) errores.push(`specs/${carpeta}: tiene tareas de funcionalidad nueva y su plan.md no tiene la sección «## Seguridad»`);
  }
  return errores;
}

function hook() {
  let entrada = {};
  try { entrada = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  const pedido = entrada.tool_input?.file_path || entrada.tool_input?.notebook_path;
  if (!pedido) return;
  const ruta = relative(RAIZ, resolve(RAIZ, pedido)).split('\\').join('/');
  if (!CODIGO.some((c) => ruta.startsWith(c))) return;
  const enCurso = leerEnCurso();
  const problemas = [];
  for (const [referencia, dato] of Object.entries(enCurso)) {
    try {
      const falta = faltantes(buscar(referencia), dato.desde);
      if (!falta.length) return;
      problemas.push(`${referencia} (${dato.tipo}):\n${falta.map((f) => `  - ${f}`).join('\n')}`);
    } catch (error) {
      problemas.push(`${referencia}: ${error.message}`);
    }
  }
  console.error(problemas.length
    ? `No se puede editar ${ruta} todavía. A la tarea empezada le falta:\n${problemas.join('\n')}`
    : `No se puede editar ${ruta}: no hay ninguna tarea empezada. Primero decidí el tamaño del cambio (constitución, «Qué tamaño tiene el cambio»), anotá la tarea en el tasks.md de su carpeta de specs/ y corré: node tests/compuerta.mjs empezar NNN-TXXX`);
  process.exit(2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , orden, referencia] = process.argv;
  try {
    if (orden === 'hook') hook();
    else if (orden === 'empezar') empezar(referencia);
    else if (orden === 'terminar') terminar(referencia);
    else if (orden === 'estado') console.log(Object.entries(leerEnCurso()).map(([r, d]) => `${r} (${d.tipo})`).join('\n') || 'Ninguna tarea empezada.');
    else if (orden === 'revisar') {
      const errores = revisar();
      for (const e of errores) console.log(`  ✗ ${e}`);
      if (errores.length) process.exit(1);
      console.log('✓ los tasks.md tienen la forma esperada');
    } else {
      console.error('Uso: empezar NNN-TXXX | terminar NNN-TXXX | estado | revisar');
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
