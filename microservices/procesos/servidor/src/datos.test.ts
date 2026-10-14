import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { almacenEnPostgres } from "./datos.js";
import { aplicarMigraciones } from "./migraciones.js";
import { crearReglas, type Quien } from "./reglas.js";

// Los datos contra un Postgres de verdad. Corre solo con PROCESOS_BASE_DE_PRUEBA (una base que
// se puede borrar): en la subida no hay base, y la regla ya se prueba contra la memoria.
const url = process.env.PROCESOS_BASE_DE_PRUEBA;
const quien: Quien = { id: "u1", nombre: "Carlos", puede: { ver: true, dibujar: true } };
const bpmn = (n: number) => `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D" targetNamespace="x"><bpmn:process id="P">${Array.from({ length: n }, (_, i) => `<bpmn:task id="T${i}"/>`).join("")}</bpmn:process></bpmn:definitions>`;

describe.skipIf(!url)("los datos en Postgres", () => {
  const pool = new pg.Pool({ connectionString: url });
  const reglas = crearReglas(almacenEnPostgres(pool));

  beforeAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS procesos CASCADE");
    await aplicarMigraciones(pool, path.resolve(import.meta.dirname, "../migraciones"));
  });
  afterAll(() => pool.end());

  it("las migraciones van en su propio esquema y no se repiten", async () => {
    expect(await aplicarMigraciones(pool, path.resolve(import.meta.dirname, "../migraciones"))).toEqual([]);
    const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'procesos' ORDER BY 1");
    expect(rows.map((r) => r.table_name)).toEqual(["migracion", "proceso", "version"]);
  });

  it("011-E17 011-E22 011-E41 011-E20 crea, guarda con revisión, marca vigente, guarda historial y borra todo junto", async () => {
    const p = await reglas.crear({ nombre: "Venta en el mostrador" }, quien);
    await expect(reglas.crear({ nombre: "VENTA en el mostrador" }, quien)).rejects.toMatchObject({ estado: 409 });
    const b = await reglas.guardarBorrador(p.id, { bpmn: bpmn(3), revision: p.revision }, quien);
    await expect(reglas.guardarBorrador(p.id, { bpmn: bpmn(4), revision: p.revision }, quien)).rejects.toMatchObject({ estado: 409 });
    const v1 = await reglas.marcarVigente(p.id, { revision: b.revision }, quien);
    const b2 = await reglas.guardarBorrador(p.id, { bpmn: bpmn(5), revision: v1.revision }, quien);
    expect(b2.vigente?.pasos).toBe(3);
    expect(b2.borrador?.pasos).toBe(5);
    const v2 = await reglas.marcarVigente(p.id, { revision: b2.revision }, quien);
    expect((await reglas.historial(p.id, quien)).map((v) => [v.estado, v.pasos])).toEqual([["vigente", 5], ["anterior", 3]]);
    expect((await reglas.listar(quien))[0]).toMatchObject({ nombre: "Venta en el mostrador", vigente: true, borrador: false, pasos: 5 });
    const descartable = await reglas.guardarBorrador(p.id, { bpmn: bpmn(1), revision: v2.revision }, quien);
    expect((await reglas.descartarBorrador(p.id, { revision: descartable.revision }, quien)).borrador).toBeNull();
    await reglas.borrar(p.id, quien);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM procesos.version");
    expect(rows[0].n).toBe(0);
  });
});
