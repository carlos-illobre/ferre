import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import { anotar, bandeja } from "./eventos.js";
import { Deshacer, enTransaccion } from "./transaccion.js";

const evento = { tipo: "prueba.hecha", titulo: "Prueba", grupo: "Pruebas", importancia: "normal" as const };
const enLaBandeja = () => sql<{ evento: { tipo: string; servicio: string } }>`SELECT evento FROM auditoria_bandeja WHERE evento->>'tipo' LIKE 'prueba.%'`.execute(base).then((r) => r.rows.map((f) => f.evento));

// Cada acción deja su evento en la bandeja, en su transacción (specs/027, 027-E05).
describe("los eventos de Comercial", () => {
  beforeAll(() => bandeja.iniciar());
  afterAll(() => bandeja.parar());

  it("027-E05: el evento queda en la bandeja con la acción, y se va si la acción se deshace", async () => {
    await enTransaccion(async (trx) => { await anotar(trx, { ...evento, tipo: "prueba.deshecha" }); throw new Deshacer(null); });
    await anotar(base, evento);
    expect(await enLaBandeja()).toEqual([expect.objectContaining({ tipo: "prueba.hecha", servicio: "comercial" })]);
  });

});
