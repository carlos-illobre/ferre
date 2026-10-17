import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("012-E03 012-T010: «Entrar» tiene el aviso, «¿Cuál uso?» con las cinco formas, una sección por forma con sus pasos y capturas, y los problemas", () => {
    Element.prototype.scrollIntoView = () => undefined;
    render(<Manual />);
    const capitulo = screen.getByTestId("manual-entrar");
    expect(capitulo.textContent).toContain("Antes de la primera vez");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent).filter((t) => t !== "Capítulos")).toEqual([
      "¿Cuál uso?", "En la computadora, con el celular", "En la computadora, con Google", "En la computadora, con la huella",
      "En el celular, con Google", "En el celular, con la huella", "Si algo no funciona"]);
    // Cada forma de «¿Cuál uso?» lleva a su sección.
    const formas = within(screen.getByTestId("manual-formas")).getAllByRole("button");
    expect(formas.map((f) => f.querySelector("strong")?.textContent)).toEqual(["Con el celular", "Con Google", "Con la huella", "Con Google", "Con la huella"]);
    fireEvent.click(formas[4]!);
    expect(document.activeElement?.id).toBe("celu-huella");
    // Los dos casos de entrar con el celular, cada uno con sus pasos.
    expect([...capitulo.querySelectorAll(".manual-caso")].map((c) => c.textContent)).toEqual(["Si en el celular ya tenés Ferrebress abierto", "Si en el celular todavía no entraste"]);
    expect(screen.getAllByTestId("manual-paso").map((p) => p.querySelector("h3")?.textContent?.replace(/^Paso \d+: /, "")).slice(0, 5)).toEqual([
      "Abrí Ferrebress en la computadora", "En el celular, tocá «Vincular»", "Apuntá al código", "Tocá «Entrar en la computadora»", "Listo"]);
    // Cada captura marca con números lo que se mira o se toca, y su leyenda dice qué es cada número.
    const figuras = [...capitulo.querySelectorAll(".manual-figura")];
    expect(figuras).toHaveLength(14);
    for (const f of figuras) {
      expect(f.querySelectorAll(".manual-marca").length).toBeGreaterThan(0);
      expect(f.querySelectorAll(".manual-leyenda li").length).toBe(f.querySelectorAll(".manual-marca").length);
    }
    // Lo que se toca va en un recuadro: «Entrar en la computadora» y «Ahora no».
    expect(figuras[3]!.querySelectorAll(".manual-recuadro")).toHaveLength(2);
    expect(capitulo.textContent).toContain("De paso, quedan vinculados");
    expect(capitulo.textContent).toContain("Figura 1.14");
  });

  it("012-E04: los clips están quietos, sin sonido y con sus controles; la huella no tiene clip", () => {
    render(<Manual />);
    const clips = [["manual-clip", /clip-celular\.mp4$/], ["manual-clip-espejo", /clip-espejo\.mp4$/], ["manual-clip-google-compu", /clip-google-compu\.mp4$/], ["manual-clip-google-celu", /clip-google-celu\.mp4$/]] as const;
    for (const [id, archivo] of clips) {
      const clip = screen.getByTestId(id) as HTMLVideoElement;
      expect(clip.autoplay).toBe(false);
      expect(clip.muted).toBe(true);
      expect(clip.controls).toBe(true);
      expect(clip.getAttribute("src")).toMatch(archivo);
      expect(clip.getAttribute("aria-label")).toBeTruthy();
    }
    expect(screen.getByTestId("manual-entrar").querySelectorAll("video")).toHaveLength(clips.length);
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
    fireEvent.click(within(screen.getByRole("navigation", { name: "Capítulos" })).getByRole("button", { name: "Si algo no funciona" }));
    expect(document.activeElement?.id).toBe("problemas");
    expect(screen.getByTestId("manual-clip").getAttribute("aria-label")).toBeTruthy();
    expect(screen.getByTestId("manual-clip-espejo").getAttribute("aria-label")).toBeTruthy();
  });
});
