import { randomUUID } from "node:crypto";
import type { Almacen, Anotacion, FilaDeVersion, NuevaVersion, ProcesoGuardado } from "./almacen.js";

// Los datos en memoria: se pierden al apagar. Sirven para las pruebas y para mirar el módulo sin
// base de datos. Hace lo mismo que datos.ts, con las mismas reglas de unicidad.

type Guardado = { id: string; nombre: string; revision: number; actualizado: Date; versiones: FilaDeVersion[] };
/** Lo anotado (026-E10), como lo guarda la base: el tipo, quién y el proceso. */
export type EventoEnMemoria = { tipo: string; usuario: { id: string; nombre: string }; proceso: { id: string; nombre: string } };

export function almacenEnMemoria(): Almacen & { eventos: EventoEnMemoria[] } {
  const procesos = new Map<string, Guardado>();
  const eventos: EventoEnMemoria[] = [];
  const anotar = (a: Anotacion | undefined, proceso: { id: string; nombre: string }) => {
    if (a) eventos.push({ tipo: a.tipo, usuario: { id: a.autor.id, nombre: a.autor.nombre }, proceso });
  };
  const ahora = () => new Date();
  const fila = (v: NuevaVersion, estado: FilaDeVersion["estado"]): FilaDeVersion => ({
    id: randomUUID(), estado, bpmn: v.bpmn, pasos: v.pasos, hechaPor: v.autor.nombre, creada: ahora(), actualizada: ahora(),
  });
  const ver = (g: Guardado): ProcesoGuardado => ({
    id: g.id, nombre: g.nombre, revision: g.revision, actualizado: g.actualizado,
    vigente: g.versiones.find((v) => v.estado === "vigente") ?? null,
    borrador: g.versiones.find((v) => v.estado === "borrador") ?? null,
  });
  const cambiar = (id: string, revision: number, a: Anotacion | undefined, hacer: (g: Guardado) => void): number | null => {
    const g = procesos.get(id);
    if (!g || g.revision !== revision) return null;
    hacer(g);
    g.revision += 1;
    g.actualizado = ahora();
    anotar(a, { id, nombre: g.nombre });
    return g.revision;
  };

  return {
    eventos,
    async listar() { return [...procesos.values()].map(ver); },
    async leer(id) { const g = procesos.get(id); return g ? ver(g) : null; },
    async conNombre(nombre) {
      return [...procesos.values()].find((g) => g.nombre.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"))?.id ?? null;
    },
    async crear(nombre, borrador, a) {
      const id = randomUUID();
      procesos.set(id, { id, nombre, revision: 1, actualizado: ahora(), versiones: [fila(borrador, "borrador")] });
      anotar(a, { id, nombre });
      return id;
    },
    async renombrar(id, nombre, a) {
      const g = procesos.get(id);
      if (!g) return false;
      g.nombre = nombre;
      anotar(a, { id, nombre });
      return true;
    },
    async borrar(id, a) {
      const g = procesos.get(id);
      if (!g) return false;
      procesos.delete(id);
      anotar(a, { id, nombre: g.nombre });
      return true;
    },
    async guardarBorrador(id, revision, version, a) {
      return cambiar(id, revision, a, (g) => {
        const actual = g.versiones.find((v) => v.estado === "borrador");
        if (actual) Object.assign(actual, { bpmn: version.bpmn, pasos: version.pasos, hechaPor: version.autor.nombre, actualizada: ahora() });
        else g.versiones.push(fila(version, "borrador"));
      });
    },
    async descartarBorrador(id, revision, a) {
      return cambiar(id, revision, a, (g) => { g.versiones = g.versiones.filter((v) => v.estado !== "borrador"); });
    },
    async marcarVigente(id, revision, a) {
      const g = procesos.get(id);
      if (!g?.versiones.some((v) => v.estado === "borrador")) return null;
      return cambiar(id, revision, a, (p) => {
        for (const v of p.versiones) {
          if (v.estado === "vigente") v.estado = "anterior";
          else if (v.estado === "borrador") { v.estado = "vigente"; v.actualizada = ahora(); }
        }
      });
    },
    async historial(id) {
      return (procesos.get(id)?.versiones ?? []).filter((v) => v.estado !== "borrador").sort((a, b) => b.actualizada.getTime() - a.actualizada.getTime());
    },
  };
}
