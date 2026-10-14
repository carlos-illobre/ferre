// El dibujo como un grafo simple: pasos, flechas y carriles. Se arma desde los objetos BPMN
// (los de bpmn-moddle, que son los mismos que usa bpmn-js) y no depende de ninguna librería:
// así la regla del dibujo se prueba sin navegador.

export const ESPACIO_DEL_MODULO = "http://procesos.local/schema/1.0";

export type TipoDePaso =
  | "inicio" | "tarea" | "persona" | "sistema" | "decision" | "paralelo" | "espera" | "fin"
  | "subproceso" | "documento" | "nota";

export const NOMBRE_DEL_TIPO: Record<TipoDePaso, string> = {
  inicio: "Inicio",
  tarea: "Tarea",
  persona: "Tarea de una persona",
  sistema: "Tarea del sistema",
  decision: "Decisión",
  paralelo: "En paralelo",
  espera: "Espera",
  fin: "Fin",
  subproceso: "Subproceso",
  documento: "Documento",
  nota: "Nota",
};

/** El tipo BPMN con que se crea cada tipo de paso. */
export const TIPO_BPMN: Record<TipoDePaso, string> = {
  inicio: "bpmn:StartEvent",
  tarea: "bpmn:Task",
  persona: "bpmn:UserTask",
  sistema: "bpmn:ServiceTask",
  decision: "bpmn:ExclusiveGateway",
  paralelo: "bpmn:ParallelGateway",
  espera: "bpmn:IntermediateCatchEvent",
  fin: "bpmn:EndEvent",
  subproceso: "bpmn:SubProcess",
  documento: "bpmn:DataObjectReference",
  nota: "bpmn:TextAnnotation",
};

const DESDE_BPMN: Record<string, TipoDePaso> = {
  "bpmn:StartEvent": "inicio",
  "bpmn:EndEvent": "fin",
  "bpmn:Task": "tarea",
  "bpmn:UserTask": "persona",
  "bpmn:ManualTask": "persona",
  "bpmn:ServiceTask": "sistema",
  "bpmn:ScriptTask": "sistema",
  "bpmn:BusinessRuleTask": "sistema",
  "bpmn:SendTask": "sistema",
  "bpmn:ReceiveTask": "sistema",
  "bpmn:ExclusiveGateway": "decision",
  "bpmn:InclusiveGateway": "decision",
  "bpmn:EventBasedGateway": "decision",
  "bpmn:ComplexGateway": "decision",
  "bpmn:ParallelGateway": "paralelo",
  "bpmn:IntermediateCatchEvent": "espera",
  "bpmn:IntermediateThrowEvent": "espera",
  "bpmn:SubProcess": "subproceso",
  "bpmn:Transaction": "subproceso",
  "bpmn:AdHocSubProcess": "subproceso",
  "bpmn:CallActivity": "subproceso",
  "bpmn:DataObjectReference": "documento",
  "bpmn:DataStoreReference": "documento",
  "bpmn:TextAnnotation": "nota",
};

export const tipoDe = (tipoBpmn: string): TipoDePaso | null => DESDE_BPMN[tipoBpmn] ?? null;

/** Lo que se lee de un objeto BPMN. Alcanza con estos campos: no hace falta la clase de moddle. */
export type ObjetoBpmn = {
  $type: string;
  id: string;
  name?: string;
  text?: string;
  sourceRef?: ObjetoBpmn;
  targetRef?: ObjetoBpmn;
  documentation?: { text?: string }[];
  flowElements?: ObjetoBpmn[];
  artifacts?: ObjetoBpmn[];
  laneSets?: { lanes?: ObjetoBpmn[] }[];
  flowNodeRef?: ObjetoBpmn[];
  childLaneSet?: { lanes?: ObjetoBpmn[] };
  $attrs?: Record<string, string>;
  get?: (nombre: string) => unknown;
};

export type Paso = {
  id: string;
  tipo: TipoDePaso;
  nombre: string;
  /** El nombre del carril donde está: quién lo hace. */
  carril: string | null;
  pantalla: string;
  como: string;
};

export type Flecha = { id: string; desde: string; hasta: string; nombre: string };

export type Grafo = { pasos: Paso[]; flechas: Flecha[]; carriles: string[] };

/** La pantalla del paso: un atributo del módulo, que otros programas conservan. */
export function pantallaDe(o: ObjetoBpmn): string {
  const conGet = typeof o.get === "function" ? o.get("procesos:pantalla") : undefined;
  if (typeof conGet === "string") return conGet;
  const attrs = o.$attrs ?? {};
  return attrs["procesos:pantalla"] ?? Object.entries(attrs).find(([k]) => k.endsWith(":pantalla"))?.[1] ?? "";
}

/** Arma el grafo de un proceso (sus elementos de flujo, artefactos y carriles). */
export function grafoDe(proceso: ObjetoBpmn): Grafo {
  const carrilDe = new Map<string, string>();
  const carriles: string[] = [];
  const recorrerCarriles = (lanes: ObjetoBpmn[] | undefined) => {
    for (const lane of lanes ?? []) {
      if (lane.childLaneSet?.lanes?.length) {
        recorrerCarriles(lane.childLaneSet.lanes);
        continue;
      }
      const nombre = (lane.name ?? "").trim() || "Sin nombre";
      carriles.push(nombre);
      for (const ref of lane.flowNodeRef ?? []) carrilDe.set(ref.id, nombre);
    }
  };
  for (const set of proceso.laneSets ?? []) recorrerCarriles(set.lanes);

  const pasos: Paso[] = [];
  const flechas: Flecha[] = [];
  for (const e of [...(proceso.flowElements ?? []), ...(proceso.artifacts ?? [])]) {
    if (e.$type === "bpmn:SequenceFlow") {
      if (e.sourceRef && e.targetRef) flechas.push({ id: e.id, desde: e.sourceRef.id, hasta: e.targetRef.id, nombre: (e.name ?? "").trim() });
      continue;
    }
    const tipo = tipoDe(e.$type);
    if (!tipo) continue;
    pasos.push({
      id: e.id,
      tipo,
      nombre: ((tipo === "nota" ? e.text : e.name) ?? "").trim(),
      carril: carrilDe.get(e.id) ?? null,
      pantalla: pantallaDe(e),
      como: (e.documentation?.[0]?.text ?? "").trim(),
    });
  }
  return { pasos, flechas, carriles };
}

/** Los pasos que forman el recorrido: todo menos documentos y notas, que no llevan flechas. */
export const esDelRecorrido = (p: Paso) => p.tipo !== "documento" && p.tipo !== "nota";
