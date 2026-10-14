import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { BpmnModdle } from "bpmn-moddle";
import { forwardRef, useImperativeHandle, useEffect, createElement } from "react";
import { grafoDe, type Grafo, type ObjetoBpmn } from "../modelo/grafo";

// Las pantallas se prueban en jsdom, donde bpmn-js no puede dibujar (no mide el SVG). El lienzo
// se cambia por uno de mentira que guarda lo que se le pide y arma el grafo con bpmn-moddle;
// lo que es del dibujo de verdad (arrastrar, acercar, el teclado) va en las de punta a punta.

afterEach(() => cleanup());

export const lienzoFalso = {
  grafo: { pasos: [], flechas: [], carriles: [] } as Grafo,
  xml: "",
  props: null as null | { xml: string; alCambiar?: () => void; alElegir?: (id: string | null) => void; alCargar?: () => void; soloLectura: boolean },
  llamadas: [] as [string, ...unknown[]][],
};

export async function grafoDelXml(xml: string): Promise<Grafo> {
  const { rootElement } = (await new BpmnModdle().fromXML(xml)) as unknown as { rootElement: { rootElements: ObjetoBpmn[] } };
  return grafoDe(rootElement.rootElements.find((e) => e.$type === "bpmn:Process")!);
}

vi.mock("../editor/Lienzo", () => ({
  Lienzo: forwardRef(function LienzoFalso(props: { xml: string; soloLectura: boolean; alCambiar?: () => void; alElegir?: (id: string | null) => void; alCargar?: () => void }, ref) {
    lienzoFalso.props = props;
    const anotar = (nombre: string) => (...args: unknown[]) => { lienzoFalso.llamadas.push([nombre, ...args]); };
    useImperativeHandle(ref, () => ({
      xml: async () => lienzoFalso.xml || props.xml,
      svg: async () => "<svg/>",
      grafo: () => lienzoFalso.grafo,
      empezarArrastre: anotar("empezarArrastre"),
      agregar: (...a: unknown[]) => { anotar("agregar")(...a); return "nuevo"; },
      cambiar: anotar("cambiar"),
      quitar: anotar("quitar"),
      elegir: (id: string | null) => { anotar("elegir")(id); props.alElegir?.(id); },
      aplicarFlechas: anotar("aplicarFlechas"),
      deshacer: anotar("deshacer"),
      rehacer: anotar("rehacer"),
      acercar: anotar("acercar"),
      alejar: anotar("alejar"),
      verTodo: anotar("verTodo"),
    }), [props]);
    useEffect(() => {
      void grafoDelXml(props.xml).then((g) => { lienzoFalso.grafo = g; props.alCargar?.(); }).catch(() => undefined);
    }, [props.xml]);
    return createElement("div", { "data-testid": "procesos-lienzo", "data-solo-lectura": String(props.soloLectura) });
  }),
}));
