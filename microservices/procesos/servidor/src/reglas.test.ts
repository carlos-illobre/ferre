import { afterEach, describe, expect, it, vi } from "vitest";
import { ANOTAR_BORRADOR_CADA_MS, crearReglas, ErrorDeProcesos, type Quien } from "./reglas.js";
import { almacenEnMemoria } from "./memoria.js";
import { bpmnInicial } from "./bpmn.js";

const dibuja: Quien = { id: "u1", nombre: "Carlos", puede: { ver: true, dibujar: true } };
const otro: Quien = { id: "u2", nombre: "Ana", puede: { ver: true, dibujar: true } };
const mira: Quien = { id: "u3", nombre: "Pedro", puede: { ver: true, dibujar: false } };

const conPasos = (n: number) => `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D" targetNamespace="x">
  <bpmn:process id="P">
    <bpmn:startEvent id="S" />
    ${Array.from({ length: n - 1 }, (_, i) => `<bpmn:task id="T${i}" name="Paso ${i}" />`).join("")}
  </bpmn:process>
</bpmn:definitions>`;

const nuevas = () => crearReglas(almacenEnMemoria());

async function falla(promesa: Promise<unknown>, estado: number, texto?: RegExp) {
  const error = await promesa.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeProcesos);
  expect((error as ErrorDeProcesos).estado).toBe(estado);
  if (texto) expect((error as ErrorDeProcesos).message).toMatch(texto);
  return error as ErrorDeProcesos;
}

describe("los procesos del negocio", () => {
  it("011-E16 sin procesos cargados la lista viene vacía, para quien dibuja y para quien mira", async () => {
    const r = nuevas();
    expect(await r.listar(dibuja)).toEqual([]);
    expect(await r.listar(mira)).toEqual([]);
  });

  it("011-E17 un proceso nuevo se crea con un inicio ya puesto y en borrador", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "  Venta en el mostrador  " }, dibuja);
    expect(p.nombre).toBe("Venta en el mostrador");
    expect(p.vigente).toBeNull();
    expect(p.borrador?.estado).toBe("borrador");
    expect(p.borrador?.pasos).toBe(1);
    expect(p.borrador?.bpmn).toContain("startEvent");
    expect(p.borrador?.hechaPor).toBe("Carlos");
  });

  it("011-E18 un nombre vacío, de varios renglones, demasiado largo o repetido no se guarda y dice por qué", async () => {
    const r = nuevas();
    await falla(r.crear({ nombre: "   " }, dibuja), 400, /Escribí un nombre/);
    await falla(r.crear({ nombre: "Venta\nmostrador" }, dibuja), 400, /un solo renglón/);
    await falla(r.crear({ nombre: "x".repeat(121) }, dibuja), 400, /120/);
    await r.crear({ nombre: "Compra a un proveedor" }, dibuja);
    await falla(r.crear({ nombre: "compra A UN proveedor" }, dibuja), 409, /Ya hay un proceso que se llama/);
    const otroProceso = await r.crear({ nombre: "Cierre de caja" }, dibuja);
    await falla(r.renombrar(otroProceso.id, "Compra a un proveedor", dibuja), 409);
    expect((await r.renombrar(otroProceso.id, "Cierre de la caja", dibuja)).nombre).toBe("Cierre de la caja");
  });

  it("011-E19 la lista trae cada proceso con su estado y cuántos pasos tiene, el más reciente primero", async () => {
    const r = nuevas();
    const a = await r.crear({ nombre: "Venta en el mostrador", bpmn: conPasos(9) }, dibuja);
    await r.marcarVigente(a.id, { revision: a.revision }, dibuja);
    await new Promise((listo) => setTimeout(listo, 5));
    await r.crear({ nombre: "Compra a un proveedor", bpmn: conPasos(4) }, dibuja);
    const lista = await r.listar(dibuja);
    expect(lista.map((p) => [p.nombre, p.vigente, p.borrador, p.pasos])).toEqual([
      ["Compra a un proveedor", false, true, 4],
      ["Venta en el mostrador", true, false, 9],
    ]);
  });

  it("011-E20 borrar un proceso lo saca con todas sus versiones", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "Contar una estantería" }, dibuja);
    await r.marcarVigente(p.id, { revision: p.revision }, dibuja);
    await r.borrar(p.id, dibuja);
    expect(await r.listar(dibuja)).toEqual([]);
    await falla(r.leer(p.id, dibuja), 404);
    await falla(r.historial(p.id, dibuja), 404);
    await falla(r.borrar(p.id, dibuja), 404);
    await falla(r.leer("no-es-un-id", dibuja), 404);
  });
});

describe("borrador, vigente y versiones", () => {
  it("011-E10 cada cambio se guarda en el borrador y sube la revisión", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "Venta" }, dibuja);
    const guardado = await r.guardarBorrador(p.id, { bpmn: conPasos(3), revision: p.revision }, dibuja);
    expect(guardado.revision).toBe(p.revision + 1);
    expect(guardado.borrador?.pasos).toBe(3);
  });

  it("011-E21 un cambio a un proceso vigente queda en borrador y quien solo mira sigue viendo el vigente", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "Venta", bpmn: conPasos(2) }, dibuja);
    const vigente = await r.marcarVigente(p.id, { revision: p.revision }, dibuja);
    const cambiado = await r.guardarBorrador(p.id, { bpmn: conPasos(5), revision: vigente.revision }, dibuja);
    expect(cambiado.vigente?.pasos).toBe(2);
    expect(cambiado.borrador?.pasos).toBe(5);
    const visto = await r.leer(p.id, mira);
    expect(visto.vigente?.pasos).toBe(2);
    expect(visto.borrador).toBeNull();
    expect((await r.listar(mira))[0]).toMatchObject({ pasos: 2, borrador: false });
  });

  it("011-E22 marcar vigente el borrador lo hace el que vale y deja el anterior en el historial con quién lo hizo", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "Venta", bpmn: conPasos(2) }, dibuja);
    const v1 = await r.marcarVigente(p.id, { revision: p.revision }, dibuja);
    const b = await r.guardarBorrador(p.id, { bpmn: conPasos(3), revision: v1.revision }, otro);
    const v2 = await r.marcarVigente(p.id, { revision: b.revision }, otro);
    expect(v2.vigente?.pasos).toBe(3);
    expect(v2.borrador).toBeNull();
    const historial = await r.historial(p.id, dibuja);
    expect(historial.map((v) => [v.estado, v.pasos, v.hechaPor])).toEqual([["vigente", 3, "Ana"], ["anterior", 2, "Carlos"]]);
    expect(historial[0]).not.toHaveProperty("bpmn");
    await falla(r.marcarVigente(p.id, { revision: v2.revision }, dibuja), 409, /no tiene cambios en borrador/);
  });

  it("011-E23 una versión anterior se puede ver entera para copiarla al borrador", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "Venta", bpmn: conPasos(2) }, dibuja);
    const v1 = await r.marcarVigente(p.id, { revision: p.revision }, dibuja);
    const b = await r.guardarBorrador(p.id, { bpmn: conPasos(3), revision: v1.revision }, dibuja);
    const v2 = await r.marcarVigente(p.id, { revision: b.revision }, dibuja);
    const anterior = (await r.historial(p.id, dibuja)).find((v) => v.estado === "anterior")!;
    const vieja = await r.version(p.id, anterior.id, mira);
    expect(vieja.pasos).toBe(2);
    const copiada = await r.guardarBorrador(p.id, { bpmn: vieja.bpmn, revision: v2.revision }, dibuja);
    expect(copiada.borrador?.pasos).toBe(2);
    await falla(r.version(p.id, "otra", dibuja), 404);
  });

  it("011-E24 descartar el borrador vuelve al vigente", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "Venta", bpmn: conPasos(2) }, dibuja);
    await falla(r.descartarBorrador(p.id, { revision: p.revision }, dibuja), 409, /no tiene una versión vigente/);
    const v = await r.marcarVigente(p.id, { revision: p.revision }, dibuja);
    const b = await r.guardarBorrador(p.id, { bpmn: conPasos(4), revision: v.revision }, dibuja);
    const descartado = await r.descartarBorrador(p.id, { revision: b.revision }, dibuja);
    expect(descartado.borrador).toBeNull();
    expect(descartado.vigente?.pasos).toBe(2);
  });
});

describe("importar", () => {
  it("011-E35 un BPMN 2.0 de otro programa queda como un proceso nuevo en borrador, tal cual", async () => {
    const r = nuevas();
    const ajeno = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="d" targetNamespace="t">
  <process id="p"><startEvent id="s" /><userTask id="u" name="Revisar" camunda:assignee="x" /><endEvent id="e" /></process>
</definitions>`;
    const p = await r.crear({ nombre: "Importado", bpmn: ajeno }, dibuja);
    expect(p.borrador?.pasos).toBe(3);
    expect(p.borrador?.bpmn).toBe(ajeno);
  });

  it("011-E36 lo que no es BPMN, está dañado o pesa más de 5 MB no se importa y dice por qué", async () => {
    const r = nuevas();
    await falla(r.crear({ nombre: "a", bpmn: "hola" }, dibuja), 422, /No es un archivo BPMN/);
    await falla(r.crear({ nombre: "b", bpmn: "<html><body/></html>" }, dibuja), 422, /No es un archivo BPMN/);
    await falla(r.crear({ nombre: "c", bpmn: '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process' }, dibuja), 422, /dañado/);
    await falla(r.crear({ nombre: "d", bpmn: '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><definitions/>' }, dibuja), 422);
    await falla(r.crear({ nombre: "e", bpmn: '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d" targetNamespace="t"></definitions>' }, dibuja), 422, /ningún proceso/);
    await falla(r.crear({ nombre: "f", bpmn: conPasos(2) + " ".repeat(5 * 1024 * 1024) }, dibuja), 422, /5 MB/);
    expect(await r.listar(dibuja)).toEqual([]);
  });
});

describe("quién puede qué", () => {
  it("011-E38 quien solo mira no ve borradores ni procesos sin vigente", async () => {
    const r = nuevas();
    const soloBorrador = await r.crear({ nombre: "En borrador" }, dibuja);
    const p = await r.crear({ nombre: "Venta" }, dibuja);
    await r.marcarVigente(p.id, { revision: p.revision }, dibuja);
    expect((await r.listar(mira)).map((x) => x.nombre)).toEqual(["Venta"]);
    await falla(r.leer(soloBorrador.id, mira), 404);
    await falla(r.historial(soloBorrador.id, mira), 404);
  });

  it("011-E39 quien no puede dibujar no crea, cambia, marca vigente, importa ni borra", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "Venta" }, dibuja);
    const v = await r.marcarVigente(p.id, { revision: p.revision }, dibuja);
    const sinPermiso = /Hace falta: Dibujar procesos/;
    await falla(r.crear({ nombre: "Otro" }, mira), 403, sinPermiso);
    await falla(r.crear({ nombre: "Otro", bpmn: bpmnInicial() }, mira), 403, sinPermiso);
    await falla(r.renombrar(p.id, "Otro", mira), 403, sinPermiso);
    await falla(r.guardarBorrador(p.id, { bpmn: conPasos(2), revision: v.revision }, mira), 403, sinPermiso);
    await falla(r.descartarBorrador(p.id, { revision: v.revision }, mira), 403, sinPermiso);
    await falla(r.marcarVigente(p.id, { revision: v.revision }, mira), 403, sinPermiso);
    await falla(r.borrar(p.id, mira), 403, sinPermiso);
    expect((await r.leer(p.id, dibuja)).revision).toBe(v.revision);
  });
});

describe("dos personas a la vez", () => {
  it("011-E41 el segundo que guarda sobre una revisión vieja no pisa lo del primero y recibe cómo quedó", async () => {
    const r = nuevas();
    const p = await r.crear({ nombre: "Venta" }, dibuja);
    await r.guardarBorrador(p.id, { bpmn: conPasos(3), revision: p.revision }, dibuja);
    const error = await falla(r.guardarBorrador(p.id, { bpmn: conPasos(7), revision: p.revision }, otro), 409, /Alguien cambió este proceso/);
    expect(error.proceso?.borrador?.pasos).toBe(3);
    expect(error.proceso?.borrador?.hechaPor).toBe("Carlos");
    await falla(r.guardarBorrador(p.id, { bpmn: conPasos(7) }, otro), 400, /sobre qué versión/);
  });
});

// Lo que se hace en Procesos lo anota Procesos (specs/026): antes lo anotaba la aplicación al
// pasarle el pedido.
describe("lo que se anota", () => {
  afterEach(() => { vi.useRealTimers(); });
  const conAlmacen = () => { const almacen = almacenEnMemoria(); return { almacen, r: crearReglas(almacen) }; };
  const tipos = (almacen: ReturnType<typeof almacenEnMemoria>) => almacen.eventos.map((e) => e.tipo);

  it("026-E10: crear, importar, renombrar, marcar vigente, descartar el borrador y borrar se anotan con quién y el proceso", async () => {
    const { almacen, r } = conAlmacen();
    const p = await r.crear({ nombre: "Venta" }, dibuja);
    const importado = await r.crear({ nombre: "Compra", bpmn: conPasos(2) }, dibuja);
    await r.renombrar(p.id, "Venta en el mostrador", otro);
    const v = await r.marcarVigente(p.id, { revision: p.revision }, dibuja);
    const b = await r.guardarBorrador(p.id, { bpmn: conPasos(3), revision: v.revision }, dibuja);
    await r.descartarBorrador(p.id, { revision: b.revision }, dibuja);
    await r.borrar(importado.id, otro);
    expect(tipos(almacen)).toEqual(["proceso.creado", "proceso.importado", "proceso.renombrado", "proceso.vigente", "proceso.borrador_cambiado", "proceso.borrador_descartado", "proceso.borrado"]);
    expect(almacen.eventos[2]).toEqual({ tipo: "proceso.renombrado", usuario: { id: "u2", nombre: "Ana" }, proceso: { id: p.id, nombre: "Venta en el mostrador" } });
    expect(almacen.eventos.at(-1)).toEqual({ tipo: "proceso.borrado", usuario: { id: "u2", nombre: "Ana" }, proceso: { id: importado.id, nombre: "Compra" } });
  });

  it("026-E11: el borrador se anota la primera vez y, si sigue, uno cada media hora, por persona y proceso", async () => {
    vi.useFakeTimers();
    const { almacen, r } = conAlmacen();
    const p = await r.crear({ nombre: "Venta" }, dibuja);
    let rev = p.revision;
    const guardar = async (quien: Quien) => { rev = (await r.guardarBorrador(p.id, { bpmn: conPasos(2), revision: rev }, quien)).revision; };
    await guardar(dibuja);
    await guardar(dibuja);
    await guardar(otro);
    vi.advanceTimersByTime(ANOTAR_BORRADOR_CADA_MS - 1);
    await guardar(dibuja);
    vi.advanceTimersByTime(1);
    await guardar(dibuja);
    expect(almacen.eventos.filter((e) => e.tipo === "proceso.borrador_cambiado").map((e) => e.usuario.nombre)).toEqual(["Carlos", "Ana", "Carlos"]);
  });

  it("026-E12: lo que no sale bien no se anota, y un guardado que perdió con otro no cuenta para la media hora", async () => {
    const { almacen, r } = conAlmacen();
    const p = await r.crear({ nombre: "Venta" }, dibuja);
    await falla(r.crear({ nombre: "Venta" }, dibuja), 409);
    await falla(r.renombrar(p.id, "", dibuja), 400);
    await falla(r.borrar("no-existe", dibuja), 404);
    await falla(r.crear({ nombre: "Otra" }, mira), 403);
    await falla(r.guardarBorrador(p.id, { bpmn: conPasos(2), revision: p.revision + 5 }, dibuja), 409);
    expect(tipos(almacen)).toEqual(["proceso.creado"]);
    await r.guardarBorrador(p.id, { bpmn: conPasos(2), revision: p.revision }, dibuja);
    expect(tipos(almacen)).toEqual(["proceso.creado", "proceso.borrador_cambiado"]);
  });
});
