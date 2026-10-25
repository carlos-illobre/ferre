import { describe, expect, it } from "vitest";
import { problemaDelEvento } from "./contrato.js";

const bueno = {
  id: "0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11", servicio: "comercial", tipo: "venta.registrada", fecha: "2026-10-25T12:00:00Z",
  titulo: "Venta cobrada", grupo: "Ventas", importancia: "normal",
};

// El contrato v1 (docs/auditoria/contrato-v1.md): lo valida el kit antes de anotar y Auditoría al recibir.
describe("el contrato de auditoría", () => {
  it("027-E12: un evento con lo obligatorio, y con lo opcional bien, cumple", () => {
    expect(problemaDelEvento(bueno)).toBeNull();
    expect(problemaDelEvento({
      ...bueno, quien: { id: "u1", nombre: "Ana" }, dispositivo: "Celular", detalle: "$12.000", referencias: [{ cosa: "venta", id: "v1" }], contenido: { total: 12000 },
    })).toBeNull();
    expect(problemaDelEvento({ ...bueno, quien: null, dispositivo: null, detalle: null })).toBeNull();
  });

  it("027-E13: dice qué campo no cumple", () => {
    const mal: [Record<string, unknown>, string][] = [
      [{ id: "no-es-uuid" }, "id"],
      [{ servicio: "" }, "servicio"],
      [{ tipo: "sinpunto" }, "tipo"],
      [{ tipo: "Venta.Registrada" }, "tipo"],
      [{ fecha: "ayer" }, "fecha"],
      [{ fecha: 12 }, "fecha"],
      [{ quien: { id: "u1" } }, "quien"],
      [{ quien: "Ana" }, "quien"],
      [{ dispositivo: "x".repeat(121) }, "dispositivo"],
      [{ titulo: "" }, "titulo"],
      [{ detalle: 5 }, "detalle"],
      [{ grupo: "x".repeat(61) }, "grupo"],
      [{ importancia: "alta" }, "importancia"],
      [{ referencias: "venta" }, "referencias"],
      [{ referencias: [{ cosa: "venta" }] }, "referencias"],
      [{ referencias: Array.from({ length: 21 }, () => ({ cosa: "venta", id: "v" })) }, "referencias"],
      [{ contenido: [1] }, "contenido"],
      [{ contenido: { texto: "x".repeat(17 * 1024) } }, "contenido"],
    ];
    for (const [cambio, campo] of mal) expect(problemaDelEvento({ ...bueno, ...cambio }), campo).toBe(`el campo «${campo}» no cumple el contrato`);
    expect(problemaDelEvento("venta")).toBe("el evento no es un objeto");
    expect(problemaDelEvento([bueno])).toBe("el evento no es un objeto");
  });
});
