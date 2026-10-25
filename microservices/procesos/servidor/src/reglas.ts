import type { Almacen, Autor, FilaDeVersion, ProcesoGuardado } from "./almacen.js";
import { BpmnInvalido, bpmnInicial, leerBpmn } from "./bpmn.js";
import type { Proceso, ProcesoEnLista, Version, VersionEnHistorial } from "./contrato.js";

// La regla de Procesos (specs/011-procesos). «ver» mira lo vigente; «dibujar» hace todo, ver
// incluido (RF-95). Cada error dice qué pasó con palabras del negocio.

export type Puede = { ver: boolean; dibujar: boolean };
export type Quien = Autor & { puede: Puede };

export class ErrorDeProcesos extends Error {
  constructor(readonly estado: 400 | 403 | 404 | 409 | 422, mensaje: string, readonly proceso?: Proceso) {
    super(mensaje);
  }
}

const SIN_PERMISO = "No tenés permiso para esto. Hace falta: Dibujar procesos";
const NO_EXISTE = "Ese proceso no existe";
const YA_CAMBIO = "Alguien cambió este proceso mientras lo dibujabas. Se muestra cómo quedó; tus últimos cambios no se guardaron";

const exigirDibujar = (quien: Quien) => {
  if (!quien.puede.dibujar) throw new ErrorDeProcesos(403, SIN_PERMISO);
};

/** Un nombre: de 1 a 120 caracteres, en un solo renglón (E18). */
export function nombreValido(nombre: unknown): string {
  const limpio = typeof nombre === "string" ? nombre.trim() : "";
  if (limpio === "") throw new ErrorDeProcesos(400, "Escribí un nombre para el proceso");
  if (/[\r\n]/.test(limpio)) throw new ErrorDeProcesos(400, "El nombre va en un solo renglón");
  if (limpio.length > 120) throw new ErrorDeProcesos(400, "El nombre puede tener hasta 120 letras");
  return limpio;
}

function revisionValida(revision: unknown): number {
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 1) throw new ErrorDeProcesos(400, "Falta sobre qué versión del proceso se dibujó");
  return revision;
}

async function bpmnValido(bpmn: unknown) {
  try {
    return await leerBpmn(bpmn);
  } catch (e) {
    if (e instanceof BpmnInvalido) throw new ErrorDeProcesos(422, e.message);
    throw e;
  }
}

const version = (v: FilaDeVersion): Version => ({
  id: v.id, estado: v.estado, bpmn: v.bpmn, pasos: v.pasos, hechaPor: v.hechaPor, creada: v.creada.toISOString(), actualizada: v.actualizada.toISOString(),
});

/** Lo que ve cada uno: con solo «ver», ni el borrador ni un proceso sin vigente (E38). */
function paraQuien(p: ProcesoGuardado, quien: Quien): Proceso {
  if (!quien.puede.dibujar && !p.vigente) throw new ErrorDeProcesos(404, NO_EXISTE);
  return {
    id: p.id, nombre: p.nombre, revision: p.revision,
    vigente: p.vigente ? version(p.vigente) : null,
    borrador: quien.puede.dibujar && p.borrador ? version(p.borrador) : null,
  };
}

// Qué se anota de cada cambio (026-E10, E11): todo lo que sale bien, con quién. El borrador se
// guarda solo a cada rato mientras se dibuja: se anota el primer guardado de cada persona en cada
// proceso y, si sigue, uno cada media hora, para que se sepa quién lo cambió sin llenar el registro.
export const ANOTAR_BORRADOR_CADA_MS = 30 * 60 * 1000;

export function crearReglas(almacen: Almacen) {
  const borradorAnotado = new Map<string, number>();
  const anotacion = (tipo: string, quien: Quien) => ({ tipo, autor: { id: quien.id, nombre: quien.nombre } });
  function anotacionDelBorrador(id: string, quien: Quien) {
    const clave = `${quien.id}/${id}`;
    const ahora = Date.now();
    if (ahora - (borradorAnotado.get(clave) ?? -Infinity) < ANOTAR_BORRADOR_CADA_MS) return undefined;
    borradorAnotado.set(clave, ahora);
    return anotacion("proceso.borrador_cambiado", quien);
  }

  async function existente(id: string) {
    const p = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? await almacen.leer(id) : null;
    if (!p) throw new ErrorDeProcesos(404, NO_EXISTE);
    return p;
  }
  async function nombreLibre(nombre: string, salvo?: string) {
    const otro = await almacen.conNombre(nombre);
    if (otro && otro !== salvo) throw new ErrorDeProcesos(409, `Ya hay un proceso que se llama «${nombre}»`);
  }
  // Un cambio que llegó sobre una revisión vieja no pisa lo de otro: devuelve cómo quedó (E41).
  async function siSigueIgual(id: string, quien: Quien, nueva: number | null): Promise<Proceso> {
    const p = await existente(id);
    if (nueva === null) throw new ErrorDeProcesos(409, YA_CAMBIO, paraQuien(p, quien));
    return paraQuien(p, quien);
  }

  return {
    /** E19, E37: la lista, más reciente primero. */
    async listar(quien: Quien): Promise<ProcesoEnLista[]> {
      const todos = await almacen.listar();
      return todos
        .filter((p) => quien.puede.dibujar || p.vigente)
        .map((p) => {
          const mostrada = (quien.puede.dibujar ? p.borrador : null) ?? p.vigente;
          return {
            id: p.id, nombre: p.nombre, vigente: Boolean(p.vigente), borrador: quien.puede.dibujar && Boolean(p.borrador),
            pasos: mostrada?.pasos ?? 0, actualizado: p.actualizado.toISOString(),
          };
        })
        .sort((a, b) => b.actualizado.localeCompare(a.actualizado));
    },

    async leer(id: string, quien: Quien): Promise<Proceso> {
      return paraQuien(await existente(id), quien);
    },

    /** E17, E18; con `bpmn`, importa (E35, E36). Queda en borrador. */
    async crear(datos: { nombre?: unknown; bpmn?: unknown }, quien: Quien): Promise<Proceso> {
      exigirDibujar(quien);
      const nombre = nombreValido(datos.nombre);
      const bpmn = datos.bpmn === undefined ? bpmnInicial() : datos.bpmn;
      const { pasos } = await bpmnValido(bpmn);
      await nombreLibre(nombre);
      const id = await almacen.crear(nombre, { bpmn: bpmn as string, pasos, autor: quien }, anotacion(datos.bpmn === undefined ? "proceso.creado" : "proceso.importado", quien));
      return paraQuien(await existente(id), quien);
    },

    async renombrar(id: string, nombre: unknown, quien: Quien): Promise<Proceso> {
      exigirDibujar(quien);
      const limpio = nombreValido(nombre);
      await existente(id);
      await nombreLibre(limpio, id);
      await almacen.renombrar(id, limpio, anotacion("proceso.renombrado", quien));
      return paraQuien(await existente(id), quien);
    },

    /** E20: con todas sus versiones. La pregunta antes de borrar la hace la pantalla. */
    async borrar(id: string, quien: Quien): Promise<void> {
      exigirDibujar(quien);
      await existente(id);
      if (!(await almacen.borrar(id, anotacion("proceso.borrado", quien)))) throw new ErrorDeProcesos(404, NO_EXISTE);
    },

    /** E10, E21, E41. */
    async guardarBorrador(id: string, datos: { bpmn?: unknown; revision?: unknown }, quien: Quien): Promise<Proceso> {
      exigirDibujar(quien);
      const revision = revisionValida(datos.revision);
      const { pasos } = await bpmnValido(datos.bpmn);
      await existente(id);
      const anotada = anotacionDelBorrador(id, quien);
      const nueva = await almacen.guardarBorrador(id, revision, { bpmn: datos.bpmn as string, pasos, autor: quien }, anotada);
      // Si otro guardó antes, no se anotó nada: la media hora no empieza a contar.
      if (nueva === null && anotada) borradorAnotado.delete(`${quien.id}/${id}`);
      return siSigueIgual(id, quien, nueva);
    },

    /** E24. */
    async descartarBorrador(id: string, datos: { revision?: unknown }, quien: Quien): Promise<Proceso> {
      exigirDibujar(quien);
      const revision = revisionValida(datos.revision);
      const p = await existente(id);
      if (!p.borrador) throw new ErrorDeProcesos(409, "Este proceso no tiene borrador");
      if (!p.vigente) throw new ErrorDeProcesos(409, "Este proceso no tiene una versión vigente a la que volver: para sacarlo, borralo");
      return siSigueIgual(id, quien, await almacen.descartarBorrador(id, revision, anotacion("proceso.borrador_descartado", quien)));
    },

    /** E22. */
    async marcarVigente(id: string, datos: { revision?: unknown }, quien: Quien): Promise<Proceso> {
      exigirDibujar(quien);
      const revision = revisionValida(datos.revision);
      const p = await existente(id);
      if (!p.borrador) throw new ErrorDeProcesos(409, "Este proceso no tiene cambios en borrador");
      return siSigueIgual(id, quien, await almacen.marcarVigente(id, revision, anotacion("proceso.vigente", quien)));
    },

    /** E23: vigente y anteriores, más reciente primero. */
    async historial(id: string, quien: Quien): Promise<VersionEnHistorial[]> {
      paraQuien(await existente(id), quien);
      return (await almacen.historial(id)).map(({ bpmn: _bpmn, ...v }) => ({ ...v, creada: v.creada.toISOString(), actualizada: v.actualizada.toISOString() }));
    },

    async version(id: string, versionId: string, quien: Quien): Promise<Version> {
      paraQuien(await existente(id), quien);
      const v = (await almacen.historial(id)).find((x) => x.id === versionId);
      if (!v) throw new ErrorDeProcesos(404, "Esa versión no existe");
      return version(v);
    },
  };
}

export type Reglas = ReturnType<typeof crearReglas>;
