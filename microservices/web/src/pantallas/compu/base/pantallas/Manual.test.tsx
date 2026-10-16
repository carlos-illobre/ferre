import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConRutas, irA } from "../rutas";
import { CAPITULOS, Manual } from "./Manual";

// El manual de uso (RF-97, specs/012-manual-de-uso).
describe("el manual de uso", () => {
  it("012-E02: el índice tiene los nueve capítulos en orden; solo «Entrar» se abre, los demás dicen «pronto»", () => {
    render(<Manual />);
    const capitulos = screen.getAllByTestId("manual-capitulo");
    expect(capitulos.map((c) => c.firstElementChild?.textContent?.replace(/^\d+|pronto$/g, ""))).toEqual(
      ["Entrar", "Catálogo", "Vender", "Cómo va el negocio", "Usuarios", "Anomalías", "Procesos", "Mejoras y errores", "Configuración"]);
    expect(capitulos[0]!.querySelector("button")?.getAttribute("aria-current")).toBe("page");
    for (const c of capitulos.slice(1)) {
      expect(c.querySelector("button")).toBeNull();
      expect(c.textContent).toContain("pronto");
    }
    expect(CAPITULOS.filter((c) => c.escrito).map((c) => c.nombre)).toEqual(["Entrar"]);
  });

  it("012-E03: «Entrar» tiene el aviso, el clip, cuatro pasos con sus capturas, las otras formas y los problemas", () => {
    render(<Manual />);
    const capitulo = screen.getByTestId("manual-entrar");
    expect(capitulo.textContent).toContain("Antes de empezar");
    expect(screen.getAllByTestId("manual-paso").map((p) => p.querySelector("h3")?.textContent?.replace(/^Paso \d+: /, ""))).toEqual([
      "Abrí Ferrebress en la computadora", "Leé el código con el celular", "Confirmá en el celular", "Listo: la computadora entra sola"]);
    expect(capitulo.querySelectorAll(".manual-marca")).toHaveLength(4);
    expect(capitulo.querySelectorAll(".manual-leyenda li")).toHaveLength(4);
    expect(capitulo.querySelector(".manual-resumen")?.textContent).toMatch(/Qué necesitás.*Cuánto tarda.*Dónde se hace/);
    expect(capitulo.textContent).toContain("De paso, quedan vinculados");
    expect(capitulo.textContent).toContain("Figura 1.6");
    expect(screen.getByRole("heading", { name: "Otras formas de entrar" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Si algo no funciona" })).toBeTruthy();
    // El orden: el clip va antes del primer paso.
    const clip = screen.getByTestId("manual-clip");
    expect(clip.compareDocumentPosition(screen.getAllByTestId("manual-paso")[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("012-E04: el clip está quieto, sin sonido y con sus controles", () => {
    render(<Manual />);
    const clip = screen.getByTestId("manual-clip") as HTMLVideoElement;
    expect(clip.autoplay).toBe(false);
    expect(clip.muted).toBe(true);
    expect(clip.controls).toBe(true);
    expect(clip.getAttribute("src")).toMatch(/manual\/entrar\/clip\.mp4$/);
  });

  it("012-E05: «Volver a Ferrebress» vuelve a la entrada", async () => {
    render(<ConRutas><Manual /></ConRutas>);
    irA("manual");
    await waitFor(() => expect(location.hash).toBe("#/manual"));
    fireEvent.click(screen.getByTestId("manual-volver"));
    await waitFor(() => expect(location.hash).toBe("#/"));
  });

  it("012-E06: cada captura dice qué muestra, y se llega a todo con el teclado", () => {
    render(<Manual />);
    for (const img of screen.getByTestId("manual-entrar").querySelectorAll("img")) expect(img.getAttribute("alt")?.length).toBeGreaterThan(10);
    expect(screen.getByTestId("manual-volver").tagName).toBe("BUTTON");
    // Elegir una sección del índice lleva el foco a su título, para seguir con el teclado.
    Element.prototype.scrollIntoView = () => undefined;
    fireEvent.click(screen.getByRole("button", { name: "Si algo no funciona" }));
    expect(document.activeElement?.id).toBe("problemas");
    expect(screen.getByTestId("manual-clip").getAttribute("aria-label")).toBeTruthy();
  });
});
