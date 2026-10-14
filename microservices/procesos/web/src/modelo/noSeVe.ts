import { ESPACIO_DEL_MODULO } from "./grafo";

// Lo que trae un BPMN de otro programa y Procesos no muestra (E35). No se toca: queda en el
// archivo guardado y sale igual al exportarlo; esto solo lo cuenta para avisarlo al importar.

const BPMN = "http://www.omg.org/spec/BPMN/20100524/MODEL";
const PROPIOS = new Set([BPMN, "http://www.omg.org/spec/BPMN/20100524/DI", "http://www.omg.org/spec/DD/20100524/DC", "http://www.omg.org/spec/DD/20100524/DI", ESPACIO_DEL_MODULO]);

/** Lo que puede estar adentro de un proceso, de un subproceso o de la colaboración y Procesos maneja. */
const QUE_MANEJA = new Set([
  "laneSet", "startEvent", "endEvent", "task", "userTask", "manualTask", "serviceTask", "scriptTask", "businessRuleTask",
  "sendTask", "receiveTask", "exclusiveGateway", "inclusiveGateway", "eventBasedGateway", "complexGateway", "parallelGateway",
  "intermediateCatchEvent", "intermediateThrowEvent", "subProcess", "transaction", "adHocSubProcess", "callActivity",
  "dataObjectReference", "dataStoreReference", "dataObject", "textAnnotation", "association", "sequenceFlow",
  "participant", "documentation", "extensionElements", "ioSpecification", "property", "dataInputAssociation", "dataOutputAssociation",
]);
const CONTENEDORES = new Set(["process", "subProcess", "transaction", "adHocSubProcess", "collaboration"]);
/** Lo que se dibuja y por eso necesita un lugar en el dibujo. */
const SE_DIBUJA = new Set([...QUE_MANEJA].filter((n) => !["laneSet", "dataObject", "documentation", "extensionElements", "ioSpecification", "property", "dataInputAssociation", "dataOutputAssociation"].includes(n)));

export type NoSeVe = { deOtroPrograma: number; queNoManeja: number; sinLugar: number };

export function loQueNoSeVe(xml: string): NoSeVe {
  const cuenta: NoSeVe = { deOtroPrograma: 0, queNoManeja: 0, sinLugar: 0 };
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return cuenta;
  const conLugar = new Set<string>();
  for (const e of Array.from(doc.getElementsByTagNameNS("*", "*"))) {
    if (e.namespaceURI === "http://www.omg.org/spec/BPMN/20100524/DI") {
      const ref = e.getAttribute("bpmnElement");
      if (ref) conLugar.add(ref);
    }
  }
  const recorrer = (e: Element) => {
    for (const hijo of Array.from(e.children)) {
      if (!PROPIOS.has(hijo.namespaceURI ?? "")) {
        cuenta.deOtroPrograma++; // lo de otro programa se cuenta entero, no cada cosa de adentro
        continue;
      }
      if (hijo.namespaceURI === BPMN && CONTENEDORES.has(e.localName) && e.namespaceURI === BPMN) {
        if (!QUE_MANEJA.has(hijo.localName)) cuenta.queNoManeja++;
        else if (SE_DIBUJA.has(hijo.localName) && hijo.getAttribute("id") && !conLugar.has(hijo.getAttribute("id")!)) cuenta.sinLugar++;
      }
      recorrer(hijo);
    }
  };
  recorrer(doc.documentElement);
  return cuenta;
}

/** El aviso de E35, o nada si se ve todo. Largo en la computadora; corto en el celular. */
export function avisoDeLoQueNoSeVe(n: NoSeVe, corto: boolean): string | null {
  const total = n.deOtroPrograma + n.queNoManeja + n.sinLugar;
  if (!total) return null;
  if (corto) return `Hay ${total === 1 ? "una parte" : `${total} partes`} del archivo que no se ven acá; se conservan al exportarlo.`;
  const que = [
    n.queNoManeja && `${n.queNoManeja} ${n.queNoManeja === 1 ? "elemento" : "elementos"} de BPMN que Procesos no maneja`,
    n.sinLugar && `${n.sinLugar} ${n.sinLugar === 1 ? "paso" : "pasos"} sin lugar en el dibujo`,
    n.deOtroPrograma && `${n.deOtroPrograma} ${n.deOtroPrograma === 1 ? "dato" : "datos"} del programa de donde viene`,
  ].filter(Boolean).join(", ");
  return `Se importó, pero hay cosas del archivo que acá no se ven: ${que}. No se pierden: quedan guardadas y salen igual al exportarlo en BPMN.`;
}
