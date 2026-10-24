import { beforeAll, describe, expect, it } from "vitest";
import { cuantos, pagina, type Filtros } from "./actividad.js";
import { base } from "./conexion.js";
import { anotarEvento } from "./eventos.js";
import { usuario } from "./pruebas/datos.js";

const sinFiltros: Filtros = { usuario: null, tipo: null, desde: null, hasta: null };

describe("quién hizo qué", () => {
  let ana = "";
  beforeAll(async () => {
    ana = await usuario({ nombre: "Ana" });
    await base.deleteFrom("evento").execute();
    await anotarEvento(base, { tipo: "venta.registrada", usuarioId: ana, contenido: {} });
    await anotarEvento(base, { tipo: "venta.anulada", usuarioId: null, contenido: {} });
    await anotarEvento(base, { tipo: "lista.cargada", usuarioId: ana, contenido: {} });
  });

  it("sin filtros, todo, lo más nuevo primero, de a páginas", async () => {
    expect(await cuantos(base, sinFiltros)).toBe(3);
    expect((await pagina(base, sinFiltros, 2, 0)).map((e) => e.tipo)).toEqual(["lista.cargada", "venta.anulada"]);
    expect((await pagina(base, sinFiltros, 2, 2)).map((e) => [e.tipo, e.nombre])).toEqual([["venta.registrada", "Ana"]]);
  });

  it("por usuario, por tipo (lo que empieza así) y por fechas", async () => {
    expect(await cuantos(base, { ...sinFiltros, usuario: ana, tipo: "venta" })).toBe(1);
    expect(await cuantos(base, { ...sinFiltros, desde: "2000-01-01", hasta: "2999-01-01" })).toBe(3);
    expect(await cuantos(base, { ...sinFiltros, hasta: "2000-01-01" })).toBe(0);
  });
});
