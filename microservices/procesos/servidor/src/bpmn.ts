import { BpmnModdle } from "bpmn-moddle";
import { randomUUID } from "node:crypto";

// Lee y valida un BPMN 2.0 (E35, E36). El servidor no dibuja: solo comprueba que lo que llega es
// BPMN y cuenta sus pasos para la lista. bpmn-moddle no resuelve entidades externas.

export const TOPE_DE_BPMN = 5 * 1024 * 1024;

export class BpmnInvalido extends Error {}

type Elemento = { $type: string; flowElements?: Elemento[]; rootElements?: Elemento[] };

export async function leerBpmn(xml: unknown): Promise<{ pasos: number }> {
  if (typeof xml !== "string" || xml.trim() === "") throw new BpmnInvalido("No es un archivo BPMN");
  if (Buffer.byteLength(xml, "utf8") > TOPE_DE_BPMN) throw new BpmnInvalido("Pesa más de 5 MB");
  if (!/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<([a-zA-Z0-9_-]+:)?definitions[\s>]/.test(xml)) throw new BpmnInvalido("No es un archivo BPMN");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new BpmnInvalido("El archivo está dañado");
  let raiz: Elemento;
  try {
    ({ rootElement: raiz } = (await new BpmnModdle().fromXML(xml)) as unknown as { rootElement: Elemento });
  } catch {
    throw new BpmnInvalido("El archivo está dañado");
  }
  if (raiz.$type !== "bpmn:Definitions") throw new BpmnInvalido("No es un archivo BPMN");
  const procesos = (raiz.rootElements ?? []).filter((e) => e.$type === "bpmn:Process");
  if (procesos.length === 0) throw new BpmnInvalido("El archivo no tiene ningún proceso");
  return { pasos: procesos.reduce((n, p) => n + contarPasos(p), 0) };
}

// Un paso es todo lo que se dibuja como figura: tareas, eventos, decisiones, subprocesos,
// documentos. Las flechas no cuentan; lo de adentro de un subproceso, sí.
function contarPasos(contenedor: Elemento): number {
  return (contenedor.flowElements ?? []).reduce((n, e) => {
    if (e.$type === "bpmn:SequenceFlow") return n;
    return n + 1 + (e.$type === "bpmn:SubProcess" ? contarPasos(e) : 0);
  }, 0);
}

/** El dibujo de un proceso nuevo: solo el inicio, ya ubicado (E17). */
export function bpmnInicial(): string {
  const id = randomUUID().slice(0, 8);
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definiciones_${id}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Proceso_${id}" isExecutable="false">
    <bpmn:startEvent id="Inicio_${id}" name="Inicio" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagrama_${id}">
    <bpmndi:BPMNPlane id="Plano_${id}" bpmnElement="Proceso_${id}">
      <bpmndi:BPMNShape id="Inicio_${id}_di" bpmnElement="Inicio_${id}">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}
