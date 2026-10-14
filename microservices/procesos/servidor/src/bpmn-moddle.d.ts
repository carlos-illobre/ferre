// bpmn-moddle trae sus tipos aparte (bpmn-moddle/types) y no los declara para la entrada
// principal: acá va lo poco que usa el servicio.
declare module "bpmn-moddle" {
  export class BpmnModdle {
    fromXML(xml: string): Promise<{ rootElement: unknown; warnings: unknown[] }>;
  }
}
