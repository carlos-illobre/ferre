// bpmn-moddle no declara tipos para su entrada principal (solo en bpmn-moddle/types): lo poco
// que usan las pruebas del modelo.
declare module "bpmn-moddle" {
  export class BpmnModdle {
    fromXML(xml: string): Promise<{ rootElement: unknown; warnings: unknown[] }>;
  }
}
