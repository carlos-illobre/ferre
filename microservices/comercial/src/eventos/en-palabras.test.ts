import { describe, expect, it } from "vitest";
import { problemaDelEvento } from "auditoria-kit";
import { enPalabras, personasDelDetalle } from "./en-palabras.js";

const persona = (id: unknown) => (id === "u-ana" ? "Ana" : "un usuario");

// Cada evento sale de Comercial con sus palabras: Auditoría no conoce los tipos (specs/027).
describe("los eventos en palabras", () => {
  it("una venta: título, detalle con el total, el medio y los productos, y su grupo", () => {
    expect(enPalabras("venta.registrada", { total: 12500, medio_pago: "mercado_pago", items: 3 }, persona))
      .toEqual({ titulo: "Venta cobrada", detalle: "$12.500 · Mercado Pago · 3 productos", grupo: "Ventas", importancia: "normal" });
    expect(enPalabras("venta.registrada", { total: 800, medio_pago: "cuenta_corriente", items: 1 }, persona))
      .toMatchObject({ titulo: "Venta en cuenta corriente", detalle: "$800 · Cuenta corriente · 1 producto" });
  });

  it("lo que el dueño revisa: rojo lo anulado, ámbar los cambios de margen y de stock", () => {
    expect(enPalabras("venta.anulada", { motivo: "se equivocó" }, persona)).toMatchObject({ titulo: "Venta anulada", detalle: "Motivo: se equivocó", importancia: "anulacion" });
    expect(enPalabras("compra.anulada", {}, persona)).toMatchObject({ detalle: "Sin motivo anotado", importancia: "anulacion", grupo: "Compras" });
    expect(enPalabras("producto.precio_elegido", { margen_elegido: 35 }, persona)).toMatchObject({ titulo: "Cambio de margen", detalle: "Margen del 35 %", importancia: "revisar" });
    expect(enPalabras("producto.precio_elegido", { unidad: "metro" }, persona)).toMatchObject({ titulo: "Cambio en un producto", detalle: "Se vende por metro", importancia: "normal" });
    expect(enPalabras("stock.ajustado", { antes: 4, despues: 2.5, motivo: "rotura" }, persona)).toMatchObject({ detalle: "De 4 a 2,5 · rotura", importancia: "revisar", grupo: "Ajustes de stock" });
  });

  it("nombra a la persona sobre la que se hizo el cambio", () => {
    expect(personasDelDetalle("usuario.modificado", { id: "u-ana" })).toEqual(["u-ana"]);
    expect(personasDelDetalle("apartado.aceptado", { de: "u-ana" })).toEqual(["u-ana"]);
    expect(personasDelDetalle("venta.registrada", { id: "v1" })).toEqual([]);
    expect(enPalabras("usuario.modificado", { id: "u-ana", cambios: { activo: false } }, persona)).toMatchObject({ titulo: "Usuario desactivado", detalle: "Desactivó a Ana", grupo: "Usuarios" });
    expect(enPalabras("usuario.modificado", { id: "u-ana", cambios: { roles: ["r"], nombre: "Ana P." } }, persona)).toMatchObject({ titulo: "Cambio en un usuario", detalle: "Cambió los roles de Ana · Ahora se llama Ana P." });
    expect(enPalabras("apartado.descartado", { de: "u-otro" }, persona).detalle).toBe("De un usuario");
  });

  it("las listas con la fecha del día; los ajustes, de cuánto a cuánto", () => {
    expect(enPalabras("lista.cargada", { proveedor: "Bahco", archivo: "lista.xlsx", fechaLista: "2026-10-01" }, persona).detalle).toBe("Bahco · lista.xlsx · lista del 01/10/2026");
    expect(enPalabras("sistema.ajustes_cambiados", { antes: { celular_segundos: 30 }, despues: { celular_segundos: 0 } }, persona).detalle).toBe("Pregunta del celular: de 30 s a no recordarla");
  });

  it("un tipo sin palabras propias se lee igual, y sin detalle", () => {
    expect(enPalabras("cosa.rara_nueva", {}, persona)).toEqual({ titulo: "cosa rara nueva", detalle: null, grupo: "Otras", importancia: "normal" });
  });

  it("cada evento que anota Comercial cumple el contrato", () => {
    const tipos = ["venta.registrada", "venta.pagada", "venta.corregida", "venta.cambio", "compra.registrada", "pedido.enviado", "pedido.recibido", "pedido.cancelado", "pedido.cerrado",
      "producto.foto", "producto.unido", "producto.separado", "equivalencia.rechazada", "lista.aplicada", "lista.descartada", "sector.creado", "conteo.abierto", "conteo.cerrado",
      "usuario.creado", "rol.creado", "rol.modificado", "rol.borrado", "sesion.iniciada", "sesion.cerrada", "sesion.revocada", "credencial.vinculada", "credencial.quitada",
      "puesto.vinculado", "puesto.desvinculado", "vinculo.dias_cambiados", "cliente.creado", "proveedor.creado", "proveedor.modificado"];
    for (const tipo of tipos) {
      const palabras = enPalabras(tipo, { nombre: "X", dias: 7 }, persona);
      expect(palabras.titulo, tipo).not.toBe(tipo.replace(/[._]/g, " "));
      expect(palabras.grupo, tipo).not.toBe("Otras");
      expect(problemaDelEvento({ id: crypto.randomUUID(), servicio: "comercial", fecha: new Date().toISOString(), tipo, ...palabras }), tipo).toBeNull();
    }
  });
});
