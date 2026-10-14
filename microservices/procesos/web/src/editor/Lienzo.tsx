import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Modeler from "bpmn-js/lib/Modeler";
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import { ESPACIO_DEL_MODULO, grafoDe, TIPO_BPMN, type Grafo, type ObjetoBpmn, type TipoDePaso } from "../modelo/grafo";
import { erroresDeForma } from "../modelo/recorrido";
import type { CambioDeFlechas } from "../modelo/lista";

// El dibujo, con bpmn-js (ADR-019). Este archivo es el único que habla con bpmn-js: las
// pantallas usan la API de abajo. Cada cambio pasa por los comandos de bpmn-js, así Deshacer
// lo cubre (E08) y el guardado se entera.

/** La pantalla del paso: un atributo propio, que otros programas conservan al abrir el BPMN. */
const EXTENSION = {
  name: "Procesos",
  uri: ESPACIO_DEL_MODULO,
  prefix: "procesos",
  xml: { tagAlias: "lowerCase" },
  types: [{ name: "ConPantalla", extends: ["bpmn:BaseElement"], properties: [{ name: "pantalla", isAttr: true, type: "String" }] }],
};

export type CambiosDelPaso = { nombre?: string; tipo?: TipoDePaso; carril?: string; pantalla?: string; como?: string; sigueCon?: string };

export type ApiDelLienzo = {
  xml(): Promise<string>;
  svg(): Promise<string>;
  grafo(): Grafo;
  /** Empieza a arrastrar una figura nueva desde la paleta (E02). */
  empezarArrastre(evento: MouseEvent | TouchEvent, tipo: TipoDePaso | "carril"): void;
  /** Agrega un paso a continuación del elegido, o suelto en el centro si no hay ninguno (E13, E28). */
  agregar(tipo: TipoDePaso | "carril", despuesDe?: string | null): string | null;
  cambiar(id: string, cambios: CambiosDelPaso): void;
  quitar(id: string): void;
  elegir(id: string | null): void;
  /** Pasa al paso siguiente o anterior del recorrido (E13). */
  aplicarFlechas(cambios: CambioDeFlechas[]): void;
  deshacer(): void;
  rehacer(): void;
  acercar(): void;
  alejar(): void;
  verTodo(): void;
};

type Props = {
  xml: string;
  soloLectura: boolean;
  alCambiar?: () => void;
  /** Después de cargar un BPMN que vino de afuera. */
  alCargar?: () => void;
  alElegir?: (id: string | null) => void;
  alZoom?: (zoom: number) => void;
  /** Aviso de un error al leer el BPMN (un archivo que bpmn-js no puede dibujar). */
  alError?: (mensaje: string) => void;
  className?: string;
  /** En el celular: un dedo sobre el fondo mueve el dibujo y dos lo acercan o alejan (E30). */
  tactil?: boolean;
};

type Elemento = { id: string; type: string; businessObject: ObjetoBpmn & { $parent?: ObjetoBpmn }; x: number; y: number; width: number; height: number; parent?: Elemento; incoming?: Elemento[]; outgoing?: Elemento[]; source?: Elemento; target?: Elemento; labelTarget?: unknown };
// bpmn-js no publica tipos para cada servicio: se usa por nombre, con lo poco que hace falta.
type Servicio = Record<string, (...args: never[]) => unknown>;

export const Lienzo = forwardRef<ApiDelLienzo, Props>(function Lienzo({ xml, soloLectura, alCambiar, alCargar, alElegir, alZoom, alError, className, tactil = false }, ref) {
  const contenedor = useRef<HTMLDivElement>(null);
  const visor = useRef<Modeler | NavigatedViewer | null>(null);
  const ultimoXml = useRef<string | null>(null);
  const avisos = useRef({ alCambiar, alCargar, alElegir, alZoom, alError });
  avisos.current = { alCambiar, alCargar, alElegir, alZoom, alError };

  const s = <T = Servicio,>(nombre: string): T => visor.current!.get(nombre) as T;
  const registro = () => s<{ get(id: string): Elemento | undefined; filter(f: (e: Elemento) => boolean): Elemento[] }>("elementRegistry");

  // El proceso que se dibuja: el del participante, si hay carriles; si no, la raíz.
  function procesoRaiz(): ObjetoBpmn | null {
    const raiz = (s<{ getRootElement(): Elemento }>("canvas").getRootElement()).businessObject as ObjetoBpmn & { participants?: { processRef?: ObjetoBpmn }[] };
    if (raiz.$type === "bpmn:Collaboration") return raiz.participants?.find((p) => p.processRef)?.processRef ?? null;
    return raiz;
  }
  const grafoActual = (): Grafo => {
    const p = procesoRaiz();
    return p ? grafoDe(p) : { pasos: [], flechas: [], carriles: [] };
  };

  // Las marcas de los errores de forma (E14), sobre cada paso.
  function marcarErrores() {
    if (soloLectura || !visor.current) return;
    const overlays = s<{ remove(f: { type: string }): void; add(id: string, tipo: string, o: unknown): void }>("overlays");
    overlays.remove({ type: "procesos-error" });
    for (const [id, mensaje] of erroresDeForma(grafoActual()).porPaso) {
      if (!registro().get(id)) continue;
      const marca = document.createElement("span");
      marca.className = "procesos-marca-error";
      marca.textContent = "!";
      marca.title = mensaje;
      marca.setAttribute("aria-label", mensaje);
      overlays.add(id, "procesos-error", { position: { top: -10, right: 4 }, html: marca });
    }
  }

  useEffect(() => {
    const opciones = {
      container: contenedor.current!,
      moddleExtensions: { procesos: EXTENSION },
      zoomScroll: { enabled: false },
      // Letra más grande que la de fábrica: se lee de lejos, como el resto de la aplicación.
      textRenderer: { defaultStyle: { fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.2 }, externalStyle: { fontFamily: "Arial, sans-serif", fontSize: 13 } },
    };
    const v = soloLectura ? new NavigatedViewer(opciones) : new Modeler(opciones);
    visor.current = v;
    const bus = v.get("eventBus") as { on(evento: string, f: (e: { newSelection?: Elemento[] }) => void): void };
    // El logo de bpmn.io queda a la vista (lo pide su licencia), pero no es parte de la pantalla:
    // fuera del teclado y de los lectores de pantalla.
    const logo = contenedor.current!.querySelector<HTMLAnchorElement>(".bjs-powered-by");
    logo?.setAttribute("tabindex", "-1");
    logo?.setAttribute("aria-hidden", "true");
    bus.on("commandStack.changed", () => {
      marcarErrores();
      avisos.current.alCambiar?.();
    });
    // Un nombre largo se parte en renglones dentro de la figura: si no entra, la tarea crece (E15).
    // Se mira después de dibujar, cuando el texto ya tiene sus renglones.
    bus.on("elements.changed", (e) => {
      if (soloLectura) return;
      const elementos = (e as unknown as { elements: Elemento[] }).elements;
      const registro = v.get("elementRegistry") as { getGraphics(e: Elemento): SVGGElement | null };
      for (const el of elementos) {
        if (!/Task$|^bpmn:SubProcess$|^bpmn:CallActivity$/.test(el.type ?? "")) continue;
        const texto = registro.getGraphics(el)?.querySelector<SVGTextElement>(".djs-visual text");
        const alto = texto?.getBBox().height ?? 0;
        if (alto + 16 <= el.height) continue;
        setTimeout(() => {
          if (visor.current !== v) return;
          (v.get("modeling") as { resizeShape(e: Elemento, b: { x: number; y: number; width: number; height: number }): void })
            .resizeShape(el, { x: el.x, y: el.y, width: el.width, height: Math.ceil(alto + 24) });
        }, 0);
      }
    });
    bus.on("selection.changed", (e) => {
      const elegido = e.newSelection?.length === 1 ? e.newSelection[0]! : null;
      avisos.current.alElegir?.(elegido && !elegido.labelTarget ? elegido.id : null);
    });
    bus.on("canvas.viewbox.changed", () => avisos.current.alZoom?.((v.get("canvas") as { zoom(): number }).zoom()));
    // La rueda acerca y aleja (E09); con la tecla Mayúsculas, se mueve hacia el costado.
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = v.get("canvas") as { zoom(n?: number, centro?: { x: number; y: number }): number; scroll(d: { dx: number; dy: number }): void };
      if (e.shiftKey) {
        canvas.scroll({ dx: -e.deltaY, dy: 0 });
        return;
      }
      const caja = contenedor.current!.getBoundingClientRect();
      const nuevo = Math.min(4, Math.max(0.2, canvas.zoom() * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      canvas.zoom(nuevo, { x: e.clientX - caja.left, y: e.clientY - caja.top });
    };
    contenedor.current!.addEventListener("wheel", rueda, { passive: false });
    // Con el dedo: sobre el fondo (no sobre un paso), uno mueve y dos acercan o alejan.
    let toque: { x: number; y: number; distancia: number; zoom: number } | null = null;
    const distancia = (t: TouchList) => Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY);
    const canvasDe = () => v.get("canvas") as { zoom(n?: number, c?: { x: number; y: number }): number; scroll(d: { dx: number; dy: number }): void };
    const empezarToque = (e: TouchEvent) => {
      const sobrePaso = (e.target as Element).closest?.(".djs-element:not(.djs-root), .djs-context-pad, .djs-overlay");
      if (sobrePaso && e.touches.length === 1) { toque = null; return; }
      const t = e.touches;
      toque = { x: t[0]!.clientX, y: t[0]!.clientY, distancia: t.length > 1 ? distancia(t) : 0, zoom: canvasDe().zoom() };
    };
    const moverToque = (e: TouchEvent) => {
      if (!toque) return;
      e.preventDefault();
      const t = e.touches;
      if (t.length > 1 && toque.distancia) {
        const caja = contenedor.current!.getBoundingClientRect();
        const centro = { x: (t[0]!.clientX + t[1]!.clientX) / 2 - caja.left, y: (t[0]!.clientY + t[1]!.clientY) / 2 - caja.top };
        canvasDe().zoom(Math.min(4, Math.max(0.2, toque.zoom * (distancia(t) / toque.distancia))), centro);
        return;
      }
      canvasDe().scroll({ dx: t[0]!.clientX - toque.x, dy: t[0]!.clientY - toque.y });
      toque = { ...toque, x: t[0]!.clientX, y: t[0]!.clientY };
    };
    const terminarToque = () => { toque = null; };
    if (tactil) {
      contenedor.current!.addEventListener("touchstart", empezarToque, { passive: true });
      contenedor.current!.addEventListener("touchmove", moverToque, { passive: false });
      contenedor.current!.addEventListener("touchend", terminarToque);
    }
    const quitarRueda = contenedor.current!;
    return () => {
      quitarRueda.removeEventListener("wheel", rueda);
      quitarRueda.removeEventListener("touchstart", empezarToque);
      quitarRueda.removeEventListener("touchmove", moverToque);
      quitarRueda.removeEventListener("touchend", terminarToque);
      v.destroy();
      visor.current = null;
      ultimoXml.current = null;
    };
  }, [soloLectura, tactil]);

  // Se carga el BPMN cuando cambia desde afuera (otro proceso, otra versión, un conflicto),
  // no cuando es el que acaba de salir de acá.
  useEffect(() => {
    const v = visor.current;
    if (!v || xml === ultimoXml.current) return;
    ultimoXml.current = xml;
    v.importXML(xml)
      .then(() => {
        if (visor.current !== v) return;
        (v.get("canvas") as { zoom(z: string): void }).zoom("fit-viewport");
        marcarErrores();
        avisos.current.alCargar?.();
      })
      // Si el visor se cambió mientras se cargaba (otro proceso, o React montando dos veces en
      // desarrollo), el error no es de este BPMN.
      .catch(() => { if (visor.current === v) avisos.current.alError?.("Este BPMN no se puede dibujar: puede estar dañado o usar algo que este programa no conoce"); });
  }, [xml, soloLectura]);

  // Un paso nuevo del tipo pedido, listo para crear.
  function nuevaFigura(tipo: TipoDePaso | "carril"): Elemento {
    const fabrica = s<{ createShape(o: unknown): Elemento; createParticipantShape(o?: unknown): Elemento }>("elementFactory");
    if (tipo === "carril") return fabrica.createParticipantShape();
    if (tipo === "espera") return fabrica.createShape({ type: TIPO_BPMN.espera, eventDefinitionType: "bpmn:TimerEventDefinition" });
    if (tipo === "subproceso") return fabrica.createShape({ type: TIPO_BPMN.subproceso, isExpanded: false });
    return fabrica.createShape({ type: TIPO_BPMN[tipo] });
  }
  const participante = () => registro().filter((e) => e.type === "bpmn:Participant")[0];
  // Con carriles ya puestos, «Carril» agrega uno abajo.
  function agregarCarril(): string | null {
    const p = participante();
    if (!p) return null;
    const carriles = registro().filter((e) => e.type === "bpmn:Lane" && e.parent === p);
    const nuevo = s<{ addLane(e: Elemento, lado: string): Elemento }>("modeling").addLane(carriles.at(-1) ?? p, "bottom");
    return nuevo.id;
  }

  useImperativeHandle(ref, () => ({
    async xml() {
      const { xml: texto } = await visor.current!.saveXML({ format: true });
      ultimoXml.current = texto ?? null;
      return texto ?? "";
    },
    async svg() {
      return (await visor.current!.saveSVG()).svg;
    },
    grafo: grafoActual,
    empezarArrastre(evento, tipo) {
      if (tipo === "carril" && participante()) {
        agregarCarril();
        return;
      }
      s<{ start(e: Event, f: Elemento): void }>("create").start(evento, nuevaFigura(tipo));
    },
    agregar(tipo, despuesDe) {
      if (tipo === "carril") {
        if (participante()) return agregarCarril();
      }
      const figura = nuevaFigura(tipo);
      const origen = despuesDe ? registro().get(despuesDe) : null;
      if (origen && tipo !== "carril" && tipo !== "inicio") {
        const creado = s<{ append(o: Elemento, f: Elemento): Elemento }>("autoPlace").append(origen, figura);
        s<{ select(e: Elemento): void }>("selection").select(creado);
        return creado.id;
      }
      const canvas = s<{ viewbox(): { x: number; y: number; width: number; height: number }; getRootElement(): Elemento }>("canvas");
      const caja = canvas.viewbox();
      const creado = s<{ createShape(f: Elemento, p: { x: number; y: number }, padre: Elemento): Elemento }>("modeling").createShape(figura, { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 }, canvas.getRootElement());
      s<{ select(e: Elemento): void }>("selection").select(creado);
      return creado.id;
    },
    cambiar(id, cambios) {
      let el = registro().get(id);
      if (!el) return;
      const modeling = s<{ updateLabel(e: Elemento, t: string): void; updateProperties(e: Elemento, p: Record<string, unknown>): void; moveElements(es: Elemento[], d: { x: number; y: number }): void; removeElements(es: Elemento[]): void; connect(a: Elemento, b: Elemento): Elemento }>("modeling");
      if (cambios.tipo) {
        const destino: Record<string, unknown> = { type: TIPO_BPMN[cambios.tipo] };
        if (cambios.tipo === "espera") destino.eventDefinitionType = "bpmn:TimerEventDefinition";
        try {
          el = s<{ replaceElement(e: Elemento, d: unknown): Elemento }>("bpmnReplace").replaceElement(el, destino);
          s<{ select(e: Elemento): void }>("selection").select(el);
        } catch {
          avisos.current.alError?.("Ese paso no se puede cambiar a ese tipo. Agregá uno nuevo y quitá este");
          return;
        }
      }
      if (cambios.nombre !== undefined) modeling.updateLabel(el, cambios.nombre);
      if (cambios.pantalla !== undefined) modeling.updateProperties(el, { "procesos:pantalla": cambios.pantalla || undefined });
      if (cambios.como !== undefined) {
        const moddle = s<{ create(t: string, o: unknown): unknown }>("moddle");
        modeling.updateProperties(el, { documentation: cambios.como ? [moddle.create("bpmn:Documentation", { text: cambios.como })] : [] });
      }
      if (cambios.carril !== undefined) {
        const carril = registro().filter((e) => e.type === "bpmn:Lane" && (e.businessObject.name ?? "").trim() === cambios.carril)[0];
        if (carril) modeling.moveElements([el], { x: 0, y: carril.y + carril.height / 2 - (el.y + el.height / 2) });
      }
      if (cambios.sigueCon !== undefined) {
        const destino = registro().get(cambios.sigueCon);
        const salen = (el.outgoing ?? []).filter((c) => c.type === "bpmn:SequenceFlow");
        if (destino && salen.length <= 1) {
          if (salen.length) modeling.removeElements(salen);
          modeling.connect(el, destino);
        }
      }
    },
    quitar(id) {
      const el = registro().get(id);
      if (el) s<{ removeElements(es: Elemento[]): void }>("modeling").removeElements([el]);
    },
    elegir(id) {
      const el = id ? registro().get(id) : null;
      const seleccion = s<{ select(e: Elemento | null): void }>("selection");
      seleccion.select(el ?? null);
      if (el) s<{ scrollToElement(e: Elemento): void }>("canvas").scrollToElement(el);
    },
    aplicarFlechas(cambios) {
      const modeling = s<{ removeElements(es: Elemento[]): void; connect(a: Elemento, b: Elemento): Elemento; updateLabel(e: Elemento, t: string): void; moveElements(es: Elemento[], d: { x: number; y: number }): void }>("modeling");
      for (const cambio of cambios) {
        const borrar = cambio.borrar.map((id) => registro().get(id)).filter((e): e is Elemento => Boolean(e));
        if (borrar.length) modeling.removeElements(borrar);
        for (const u of cambio.unir) {
          const a = registro().get(u.desde);
          const b = registro().get(u.hasta);
          if (!a || !b) continue;
          const flecha = modeling.connect(a, b);
          if (u.nombre) modeling.updateLabel(flecha, u.nombre);
        }
      }
      // El paso que se movió o se agregó queda a la derecha del que lo precede, en su carril.
      const ultimo = cambios.at(-1)?.unir;
      if (ultimo?.length) {
        const previo = registro().get(ultimo[0]!.desde);
        const puesto = registro().get(ultimo[0]!.hasta);
        if (previo && puesto) modeling.moveElements([puesto], { x: previo.x + previo.width + 60 - puesto.x, y: previo.y + previo.height / 2 - (puesto.y + puesto.height / 2) });
      }
    },
    deshacer() {
      s<{ undo(): void }>("commandStack").undo();
    },
    rehacer() {
      s<{ redo(): void }>("commandStack").redo();
    },
    acercar() {
      s<{ stepZoom(n: number): void }>("zoomScroll").stepZoom(1);
    },
    alejar() {
      s<{ stepZoom(n: number): void }>("zoomScroll").stepZoom(-1);
    },
    verTodo() {
      s<{ zoom(z: string): void }>("canvas").zoom("fit-viewport");
    },
  }), [soloLectura]);

  return <div ref={contenedor} className={`procesos-lienzo ${className ?? ""}`} data-testid="procesos-lienzo" tabIndex={0} aria-label="El dibujo del proceso" />;
});
