import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import { usuario } from "./pruebas/datos.js";
import { guardarFoto, insertar, leerFoto, reabrir, resolver, ultimos } from "./tickets.js";

describe("los tickets", () => {
  it("se guarda una sola vez, con sus fotos, y se resuelve y se reabre", async () => {
    const ana = await usuario({ nombre: "Ana" });
    const beto = await usuario({ nombre: "Beto" });
    const id = crypto.randomUUID();
    const ticket = { id, tipo: "error" as const, descripcion: "Se cuelga", dispositivo: "celular", version: "1", usuario_id: ana };
    expect(await insertar(base, ticket)).toBe(true);
    expect(await insertar(base, ticket)).toBe(false);
    await guardarFoto(base, id, 1, Buffer.from("foto"), ".png");
    const [t] = await ultimos(base);
    expect(t).toMatchObject({ id, usuario: "Ana", estado: "abierto", resuelto_por: null });
    expect(String(await leerFoto(t!.fotos[0]!.replace("/tickets/fotos/", "")))).toBe("foto");
    expect(await leerFoto("no-esta.png")).toBeNull();
    expect(await resolver(base, id, beto, "listo")).toBe(true);
    expect(await resolver(base, id, beto, "otra vez")).toBe(false);
    expect((await ultimos(base))[0]).toMatchObject({ estado: "resuelto", resuelto_por: "Beto", nota: "listo" });
    expect(await reabrir(base, id)).toBe(true);
    expect(await reabrir(base, id)).toBe(false);
    expect((await ultimos(base))[0]).toMatchObject({ estado: "abierto", resuelto_por: null, nota: null, fotos: [expect.stringMatching(/^\/tickets\/fotos\/.+\.png$/)] });
  });
});
