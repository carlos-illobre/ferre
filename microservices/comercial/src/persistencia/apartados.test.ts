import { describe, expect, it } from "vitest";
import * as datos from "./apartados.js";
import { base } from "./conexion.js";
import { producto } from "./pruebas/datos.js";

// Lo apartado que se repite acá (014-E08, 029-E07).
describe("lo apartado", () => {
  it("de unos productos, los que ya no están: unidos (con cuál) o dados de baja", async () => {
    const nuevo = await producto({ descripcion: "Nuevo" });
    const unido = await producto({ descripcion: "Viejo", activo: false, reemplazado_por: nuevo });
    const baja = await producto({ descripcion: "De baja", activo: false });
    expect(await datos.productosQueYaNoEstan(base, [nuevo, unido, baja])).toEqual(expect.arrayContaining([{ descripcion: "Viejo", reemplazo: "Nuevo" }, { descripcion: "De baja", reemplazo: null }]));
  });
});
