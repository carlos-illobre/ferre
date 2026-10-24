import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "../config.js";
import { guardar, leer, ruta } from "./archivos.js";

// Los archivos del servidor se guardan y se leen por un solo lugar (022-E13).
describe("los archivos", () => {
  it("022-E13: guarda en su carpeta, sin dejar el archivo a medias, y lo lee", async () => {
    const carpeta = `prueba-${crypto.randomUUID()}`;
    const destino = await guardar(carpeta, "una.jpg", Buffer.from("imagen"));
    expect(destino).toBe(path.join(config.carpetaListas, carpeta, "una.jpg"));
    expect(ruta(carpeta, "una.jpg")).toBe(destino);
    expect(String(await leer(destino))).toBe("imagen");
    expect(await readdir(path.dirname(destino))).toEqual(["una.jpg"]);
  });

  it("lo que no está se lee como nada", async () => {
    expect(await leer(ruta("fotos", "no-esta.jpg"))).toBeNull();
  });
});
