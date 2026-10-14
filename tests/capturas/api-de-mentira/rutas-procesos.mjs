// Procesos (specs/011-procesos) de mentira: la misma forma que el servicio (contrato.ts), en
// memoria. Arranca con «Venta en el mostrador» (el ejemplo del módulo) y dos más.
// `PUT /mentira/procesos` con { vacio: true } deja la lista vacía; sin cuerpo, la vuelve al inicio.
import { readFileSync } from "node:fs";
import { permisosDeMentira } from "./rutas-z-roles.mjs";

const VENTA = readFileSync(new URL("../../../microservices/procesos/web/src/modelo/ejemplos/venta.bpmn", import.meta.url), "utf8");
const conPasos = (nombres) => `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="D" targetNamespace="x">
  <bpmn:process id="P">${nombres.map((n, i) => i === 0 ? `<bpmn:startEvent id="N0" name="${n}"/>` : i === nombres.length - 1 ? `<bpmn:endEvent id="N${i}" name="${n}"/>` : `<bpmn:task id="N${i}" name="${n}"/>`).join("")}${nombres.slice(1).map((_, i) => `<bpmn:sequenceFlow id="F${i}" sourceRef="N${i}" targetRef="N${i + 1}"/>`).join("")}</bpmn:process>
  <bpmndi:BPMNDiagram id="DD"><bpmndi:BPMNPlane id="PL" bpmnElement="P">${nombres.map((_, i) => i === 0 || i === nombres.length - 1 ? `<bpmndi:BPMNShape id="N${i}_di" bpmnElement="N${i}"><dc:Bounds x="${180 + i * 180 + 22}" y="182" width="36" height="36"/></bpmndi:BPMNShape>` : `<bpmndi:BPMNShape id="N${i}_di" bpmnElement="N${i}"><dc:Bounds x="${180 + i * 180}" y="160" width="120" height="80"/></bpmndi:BPMNShape>`).join("")}${nombres.slice(1).map((_, i) => `<bpmndi:BPMNEdge id="F${i}_di" bpmnElement="F${i}"><di:waypoint x="${180 + i * 180 + (i === 0 ? 58 : 120)}" y="200"/><di:waypoint x="${180 + (i + 1) * 180 + (i + 1 === nombres.length - 1 ? 22 : 0)}" y="200"/></bpmndi:BPMNEdge>`).join("")}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;
const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
const contar = (xml) => (xml.match(/<(bpmn:)?(startEvent|endEvent|task|userTask|serviceTask|exclusiveGateway|parallelGateway|intermediateCatchEvent|subProcess|dataObjectReference|textAnnotation)\b/g) ?? []).length;
const version = (estado, bpmn, min, por = "Carlos") => ({ id: `v-${Math.random().toString(16).slice(2, 10)}`, estado, bpmn, pasos: contar(bpmn), hechaPor: por, creada: hace(min), actualizada: hace(min) });
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

let procesos;
function inicio() {
  procesos = [
    { id: uuid(1), nombre: "Venta en el mostrador", revision: 3, versiones: [version("vigente", VENTA, 60), version("anterior", conPasos(["Llega el cliente", "Cobrar", "Venta lista"]), 3000, "Marta")] },
    { id: uuid(2), nombre: "Compra a un proveedor", revision: 2, versiones: [version("vigente", conPasos(["Falta mercadería", "Armar el pedido", "Mandar el pedido", "Esperar la respuesta", "Pedido hecho"]), 400)] },
    { id: uuid(3), nombre: "Recepción de mercadería con factura del proveedor que no coincide con lo que llegó", revision: 1, versiones: [version("borrador", conPasos(["Llega el camión", "Contar lo que llegó", "Comparar con la factura", "Anotar la diferencia", "Recibido"]), 30)] },
  ];
}
inicio();

const puede = () => { const p = permisosDeMentira(); const dibujar = p.includes("procesos.dibujar"); return { ver: dibujar || p.includes("procesos.ver"), dibujar }; };
const de = (p, estado) => p.versiones.find((v) => v.estado === estado) ?? null;
const ver = (p) => {
  const q = puede();
  if (!q.dibujar && !de(p, "vigente")) return null;
  return { id: p.id, nombre: p.nombre, revision: p.revision, vigente: de(p, "vigente"), borrador: q.dibujar ? de(p, "borrador") : null };
};
const buscar = (id) => procesos.find((p) => p.id === id);
const sinPermiso = [403, { error: "No tenés permiso para esto. Hace falta: Dibujar procesos" }];
const NO_EXISTE = [404, { error: "Ese proceso no existe" }];
const conflicto = (p) => [409, { error: "Alguien cambió este proceso mientras lo dibujabas. Se muestra cómo quedó; tus últimos cambios no se guardaron", proceso: ver(p) }];
const esBpmn = (xml) => typeof xml === "string" && /<([a-zA-Z0-9_-]+:)?definitions[\s>]/.test(xml) && /<([a-zA-Z0-9_-]+:)?process[\s>]/.test(xml);

export default {
  "PUT /mentira/procesos": ({ body }) => { inicio(); if (body?.vacio) procesos = []; return { procesos: procesos.length }; },
  "GET /procesos": () => {
    const q = puede();
    if (!q.ver) return [403, { error: "No tenés permiso para esto. Hace falta: Ver procesos o Dibujar procesos" }];
    return procesos.filter((p) => q.dibujar || de(p, "vigente")).map((p) => {
      const mostrada = (q.dibujar ? de(p, "borrador") : null) ?? de(p, "vigente");
      return { id: p.id, nombre: p.nombre, vigente: Boolean(de(p, "vigente")), borrador: q.dibujar && Boolean(de(p, "borrador")), pasos: mostrada?.pasos ?? 0, actualizado: mostrada?.actualizada ?? hace(0) };
    });
  },
  "POST /procesos": ({ body }) => {
    if (!puede().dibujar) return sinPermiso;
    const nombre = String(body?.nombre ?? "").trim();
    if (!nombre) return [400, { error: "Escribí un nombre para el proceso" }];
    if (procesos.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) return [409, { error: `Ya hay un proceso que se llama «${nombre}»` }];
    const bpmn = body?.bpmn ?? conPasos(["Inicio"]).replace(/<bpmn:sequenceFlow[^>]*\/>/g, "");
    if (!esBpmn(bpmn)) return [422, { error: "No es un archivo BPMN" }];
    const p = { id: uuid(procesos.length + 10 + Math.floor(Math.random() * 1e6)), nombre, revision: 1, versiones: [version("borrador", bpmn, 0)] };
    procesos.unshift(p);
    return [201, ver(p)];
  },
  "GET /procesos/:id": ({ params }) => { const p = buscar(params.id); return (p && ver(p)) ?? NO_EXISTE; },
  "PATCH /procesos/:id": ({ params, body }) => { if (!puede().dibujar) return sinPermiso; const p = buscar(params.id); if (!p) return NO_EXISTE; p.nombre = String(body?.nombre ?? p.nombre).trim(); return ver(p); },
  "DELETE /procesos/:id": ({ params }) => { if (!puede().dibujar) return sinPermiso; procesos = procesos.filter((p) => p.id !== params.id); return undefined; },
  "PUT /procesos/:id/borrador": ({ params, body }) => {
    if (!puede().dibujar) return sinPermiso;
    const p = buscar(params.id); if (!p) return NO_EXISTE;
    if (body?.revision !== p.revision) return conflicto(p);
    if (!esBpmn(body?.bpmn)) return [422, { error: "No es un archivo BPMN" }];
    const b = de(p, "borrador");
    if (b) Object.assign(b, { bpmn: body.bpmn, pasos: contar(body.bpmn), actualizada: hace(0) }); else p.versiones.push(version("borrador", body.bpmn, 0));
    p.revision += 1;
    return ver(p);
  },
  "DELETE /procesos/:id/borrador": ({ params, query }) => {
    if (!puede().dibujar) return sinPermiso;
    const p = buscar(params.id); if (!p) return NO_EXISTE;
    if (Number(query.get("revision")) !== p.revision) return conflicto(p);
    p.versiones = p.versiones.filter((v) => v.estado !== "borrador"); p.revision += 1;
    return ver(p);
  },
  "POST /procesos/:id/vigente": ({ params, body }) => {
    if (!puede().dibujar) return sinPermiso;
    const p = buscar(params.id); if (!p) return NO_EXISTE;
    if (!de(p, "borrador")) return [409, { error: "Este proceso no tiene cambios en borrador" }];
    if (body?.revision !== p.revision) return conflicto(p);
    for (const v of p.versiones) { if (v.estado === "vigente") v.estado = "anterior"; else if (v.estado === "borrador") { v.estado = "vigente"; v.actualizada = hace(0); } }
    p.revision += 1;
    return ver(p);
  },
  "GET /procesos/:id/versiones": ({ params }) => { const p = buscar(params.id); if (!p || !ver(p)) return NO_EXISTE; return p.versiones.filter((v) => v.estado !== "borrador").map(({ bpmn, ...v }) => v); },
  "GET /procesos/:id/versiones/:version": ({ params }) => { const p = buscar(params.id); const v = p?.versiones.find((x) => x.id === params.version); return v ?? [404, { error: "Esa versión no existe" }]; },
};
