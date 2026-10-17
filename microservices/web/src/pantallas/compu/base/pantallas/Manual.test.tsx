import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ConRutas, irA } from "../rutas";
import { CAPITULOS, Manual } from "./Manual";

const elegir = (d: "compu" | "celu") => fireEvent.click(screen.getByTestId(`manual-dispositivo-${d}`));
const nombres = (capitulo: HTMLElement) => within(capitulo).getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

// El manual de uso (RF-97, specs/012-manual-de-uso).
describe("el manual de uso", () => {
  beforeEach(() => { localStorage.clear(); Element.prototype.scrollIntoView = () => undefined; window.scrollTo = () => undefined; });

  it("012-E02: el índice tiene los nueve capítulos en orden; se abren los escritos para el dispositivo elegido y los demás dicen «pronto»", () => {
    render(<Manual />);
    const capitulos = () => screen.getAllByTestId("manual-capitulo");
    expect(capitulos().map((c) => c.firstElementChild?.textContent?.replace(/^\d+|pronto$/g, ""))).toEqual(
      ["Entrar", "Catálogo", "Vender", "Cómo va el negocio", "Usuarios", "Anomalías", "Procesos", "Mejoras y errores", "Configuración"]);
    expect(capitulos()[0]!.querySelector("button")?.getAttribute("aria-current")).toBe("page");
    const abiertos = () => capitulos().filter((c) => c.querySelector(":scope > button")).map((c) => c.querySelector(":scope > button")?.textContent?.replace(/^\d+/, ""));
    expect(abiertos()).toEqual(["Entrar", "Catálogo"]);
    for (const c of capitulos().slice(2)) expect(c.textContent).toContain("pronto");
    elegir("celu");
    expect(abiertos()).toEqual(["Entrar"]);
    expect(capitulos()[1]!.textContent).toContain("pronto");
    expect(CAPITULOS.filter((c) => c.escrito?.compu).map((c) => c.nombre)).toEqual(["Entrar", "Catálogo"]);
  });

  it("012-E03 012-T010 012-T013: «Entrar» en la computadora tiene el aviso, sus tres formas, una sección por forma con sus pasos y capturas, y los problemas", () => {
    render(<Manual />);
    const capitulo = screen.getByTestId("manual-entrar");
    expect(capitulo.textContent).toContain("Antes de la primera vez");
    expect(nombres(capitulo)).toEqual(["¿Cuál uso?", "Con el celular", "Con Google", "Con la huella", "Si algo no funciona"]);
    // Cada forma de «¿Cuál uso?» lleva a su sección.
    const formas = within(screen.getByTestId("manual-formas")).getAllByRole("button");
    expect(formas.map((f) => f.querySelector("strong")?.textContent)).toEqual(["Con el celular", "Con Google", "Con la huella"]);
    fireEvent.click(formas[2]!);
    expect(document.activeElement?.id).toBe("compu-huella");
    // Los dos casos de entrar con el celular, cada uno con sus pasos.
    expect([...capitulo.querySelectorAll(".manual-caso")].map((c) => c.textContent)).toEqual(["Si en el celular ya tenés Ferrebress abierto", "Si en el celular todavía no entraste"]);
    expect(within(capitulo).getAllByTestId("manual-paso").map((p) => p.querySelector("h3")?.textContent?.replace(/^Paso \d+: /, "")).slice(0, 5)).toEqual([
      "Abrí Ferrebress en la computadora", "En el celular, tocá «Vincular»", "Apuntá al código", "Tocá «Entrar en la computadora»", "Listo"]);
    // Cada captura marca con números lo que se mira o se toca, y su leyenda dice qué es cada número.
    const figuras = [...capitulo.querySelectorAll(".manual-figura")];
    expect(figuras).toHaveLength(11);
    for (const f of figuras) {
      expect(f.querySelectorAll(".manual-marca").length).toBeGreaterThan(0);
      expect(f.querySelectorAll(".manual-leyenda li").length).toBe(f.querySelectorAll(".manual-marca").length);
    }
    // Lo que se toca va en un recuadro: «Entrar en la computadora» y «Ahora no».
    expect(figuras[3]!.querySelectorAll(".manual-recuadro")).toHaveLength(2);
    expect(capitulo.textContent).toContain("De paso, quedan vinculados");
    expect(capitulo.textContent).toContain("Figura 1.11");
    expect(capitulo.querySelectorAll(".manual-problemas tbody tr")).toHaveLength(6);
  });

  it("012-E03 012-T013: «Entrar» en el celular tiene sus dos formas, el aviso para entrar a la computadora y sus problemas", () => {
    render(<Manual />);
    elegir("celu");
    const capitulo = screen.getByTestId("manual-entrar");
    expect(nombres(capitulo)).toEqual(["¿Cuál uso?", "Con Google", "Con la huella", "Si algo no funciona"]);
    expect(within(screen.getByTestId("manual-formas")).getAllByRole("button").map((f) => f.querySelector("strong")?.textContent)).toEqual(["Con Google", "Con la huella"]);
    expect(capitulo.textContent).toContain("¿Querés entrar a la computadora con el celular?");
    expect(capitulo.textContent).not.toContain("Vincular");
    const figuras = [...capitulo.querySelectorAll(".manual-figura")];
    expect(figuras.map((f) => f.querySelector("figcaption b")?.textContent)).toEqual(["Figura 1.1", "Figura 1.2", "Figura 1.3"]);
    expect(figuras.every((f) => f.querySelector(".manual-imagen.celular"))).toBe(true);
    expect(capitulo.querySelectorAll(".manual-problemas tbody tr")).toHaveLength(4);
    expect(capitulo.textContent).not.toContain("código venció");
  });

  it("012-E04: los clips están quietos, sin sonido y con sus controles; cada dispositivo tiene los suyos y la huella no tiene clip", () => {
    render(<Manual />);
    const revisar = (clips: (readonly [string, RegExp])[]) => {
      for (const [id, archivo] of clips) {
        const clip = screen.getByTestId(id) as HTMLVideoElement;
        expect(clip.autoplay).toBe(false);
        expect(clip.muted).toBe(true);
        expect(clip.controls).toBe(true);
        expect(clip.getAttribute("src")).toMatch(archivo);
        expect(clip.getAttribute("aria-label")).toBeTruthy();
      }
      expect(screen.getByTestId("manual-entrar").querySelectorAll("video")).toHaveLength(clips.length);
    };
    revisar([["manual-clip", /entrar\/clip-celular\.mp4$/], ["manual-clip-espejo", /clip-espejo\.mp4$/], ["manual-clip-google-compu", /clip-google-compu\.mp4$/]]);
    elegir("celu");
    revisar([["manual-clip-google-celu", /clip-google-celu\.mp4$/]]);
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

  it("012-E10: Ctrl+F abre el buscador, que encuentra «huella» sin importar tildes y lleva ahí con las flechas y Enter", () => {
    render(<Manual />);
    const caja = screen.getByTestId("manual-buscar") as HTMLInputElement;
    fireEvent.keyDown(window, { key: "f", ctrlKey: true });
    expect(document.activeElement).toBe(caja);
    fireEvent.change(caja, { target: { value: "HUELLA" } });
    const resultados = screen.getAllByTestId("manual-resultado");
    expect(resultados.length).toBeGreaterThan(1);
    expect(resultados.length).toBeLessThanOrEqual(6);
    expect(resultados[0]!.querySelector("mark")?.textContent?.toLowerCase()).toBe("huella");
    expect(resultados.every((r) => r.textContent?.startsWith("Entrar"))).toBe(true);
    fireEvent.change(caja, { target: { value: "codigo vencio" } });
    expect(screen.getAllByTestId("manual-resultado")[0]!.textContent).toContain("venció");
    fireEvent.keyDown(caja, { key: "Enter" });
    expect(screen.queryByTestId("manual-resultado")).toBeNull();
    expect(document.activeElement?.textContent).toContain("venció");
    fireEvent.change(caja, { target: { value: "huella" } });
    fireEvent.keyDown(caja, { key: "Escape" });
    expect(screen.queryByTestId("manual-resultado")).toBeNull();
  });

  it("012-E10 012-T013: el buscador busca en todos los capítulos del dispositivo elegido y elegir un resultado de otro capítulo lo abre", async () => {
    render(<Manual />);
    const caja = screen.getByTestId("manual-buscar") as HTMLInputElement;
    fireEvent.focus(caja);
    fireEvent.change(caja, { target: { value: "otro proveedor" } });
    const resultado = screen.getAllByTestId("manual-resultado")[0]!;
    expect(resultado.textContent).toMatch(/^Catálogo/);
    expect(screen.getByTestId("manual-catalogo").hidden).toBe(true);
    fireEvent.click(resultado);
    expect(screen.getByTestId("manual-catalogo").hidden).toBe(false);
    expect(screen.getByTestId("manual-entrar").hidden).toBe(true);
    await waitFor(() => expect(document.activeElement?.textContent).toMatch(/otro proveedor/i));
    // En el celular, el Catálogo todavía no está escrito: no aparece, y lo de la computadora tampoco.
    elegir("celu");
    fireEvent.focus(caja);
    fireEvent.change(caja, { target: { value: "otro proveedor" } });
    expect(screen.queryByTestId("manual-resultado")).toBeNull();
    fireEvent.change(caja, { target: { value: "vincular" } });
    expect(screen.queryByTestId("manual-resultado")).toBeNull();
  });

  it("012-E11: el menú tiene el dispositivo y las secciones del capítulo; la que se lee se marca en el menú y en las migas", () => {
    // Dónde está cada título: arriba, «¿Cuál uso?»; el resto, más abajo. Después se baja hasta «Si algo no funciona».
    let leido = "cual";
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) { return { top: this.id === leido ? 100 : this.id ? 900 : 0 } as DOMRect; };
    render(<Manual />);
    expect(screen.queryByText("Inicio del manual")).toBeNull();
    const menu = screen.getByRole("navigation", { name: "Capítulos" });
    expect(within(menu).getByRole("button", { name: "¿Cuál uso?" }).getAttribute("aria-current")).toBe("location");
    // Bajar hasta «Si algo no funciona»: su título queda arriba, debajo de la barra.
    leido = "problemas";
    fireEvent.scroll(window);
    Element.prototype.getBoundingClientRect = original;
    expect(within(menu).getByRole("button", { name: "Si algo no funciona" }).getAttribute("aria-current")).toBe("location");
    expect(screen.getByTestId("manual-migas").textContent).toBe("Manual de uso›Computadora›1. Entrar›Si algo no funciona");
  });

  it("012-E12: abre en Computadora; al elegir Celular todo el manual muestra lo del celular y la próxima vez abre así", () => {
    const { unmount } = render(<Manual />);
    const grupo = screen.getByRole("radiogroup", { name: "¿Dónde lo usás?" });
    expect(screen.getByTestId("manual-dispositivo-compu").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("manual-consejo").textContent).toContain("Vincular");
    // Con las flechas, como un grupo de opciones.
    fireEvent.keyDown(grupo, { key: "ArrowRight" });
    expect(screen.getByTestId("manual-dispositivo-celu").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(screen.getByTestId("manual-dispositivo-celu"));
    expect(screen.getByTestId("manual-migas").textContent).toContain("Celular");
    expect(screen.getByTestId("manual-consejo").textContent).toContain("huella");
    expect(screen.getAllByTestId("manual-relacionado").map((r) => r.querySelector("strong")?.textContent)).toEqual(["Si algo no funciona", "Entrar con la huella", "Entrar con Google"]);
    const menu = screen.getByRole("navigation", { name: "Capítulos" });
    expect(within(menu).getAllByRole("button").map((b) => b.textContent)).toEqual(expect.arrayContaining(["Con Google", "Con la huella"]));
    expect(within(menu).queryByRole("button", { name: "Con el celular" })).toBeNull();
    unmount();
    render(<Manual />);
    expect(screen.getByTestId("manual-dispositivo-celu").getAttribute("aria-checked")).toBe("true");
    // Con el Catálogo abierto, pasar al celular, donde no está escrito, vuelve a «Entrar».
    elegir("compu");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Capítulos" })).getByRole("button", { name: /Catálogo/ }));
    expect(screen.getByTestId("manual-catalogo").hidden).toBe(false);
    elegir("celu");
    expect(screen.queryByTestId("manual-catalogo")).toBeNull();
    expect(screen.getByTestId("manual-entrar").hidden).toBe(false);
  });

  it("012-E13 012-T012: «Catálogo: los productos» explica todo Productos, con capturas marcadas y un clip por tarea", () => {
    render(<Manual />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Capítulos" })).getByRole("button", { name: /Catálogo/ }));
    const capitulo = screen.getByTestId("manual-catalogo");
    expect(within(capitulo).getByRole("heading", { level: 1 }).textContent).toBe("Catálogo: los productos");
    expect(nombres(capitulo)).toEqual(["¿Qué querés hacer?", "La pantalla", "Buscar un producto", "Filtrar por stock o marca", "De dónde sale el precio",
      "Poner el margen", "Usar el costo de otro proveedor", "Bajar la lista del proveedor", "Sacarle una foto", "Agregar a la venta",
      "La ficha del producto", "Cargar el código de barras", "Buscar escaneando con el celular", "Con el teclado", "Si algo no funciona"]);
    expect(within(screen.getByTestId("manual-tareas")).getAllByRole("button")).toHaveLength(12);
    const figuras = [...capitulo.querySelectorAll(".manual-figura")];
    expect(figuras).toHaveLength(21);
    for (const f of figuras) {
      expect(f.querySelectorAll(".manual-marca").length).toBeGreaterThan(0);
      expect(f.querySelectorAll(".manual-leyenda li").length).toBe(f.querySelectorAll(".manual-marca").length);
      expect(f.querySelector("img")?.getAttribute("src")).toMatch(/manual\/catalogo\/[a-z-]+\.png$/);
    }
    const clips = [...capitulo.querySelectorAll("video")];
    expect(clips.map((v) => v.getAttribute("src")?.match(/clip-([a-z]+)\.mp4$/)?.[1])).toEqual(["buscar", "filtros", "precio", "margen", "proveedor", "foto", "agregar", "ficha", "codigo", "escanear"]);
    for (const v of clips) expect(v.muted && !v.autoplay && v.controls).toBe(true);
    expect(screen.getByTestId("manual-migas").textContent).toContain("2. Catálogo");
    expect(screen.getByTestId("manual-consejo").textContent).toContain("mecha 6");
    // El pie lleva al capítulo anterior.
    fireEvent.click(screen.getByRole("button", { name: "← Anterior: Entrar" }));
    expect(screen.getByTestId("manual-entrar").hidden).toBe(false);
  });

  it("012-T011: cada clip tiene su botón de play, que lo arranca y se esconde mientras anda", () => {
    render(<Manual />);
    const clip = screen.getByTestId("manual-clip") as HTMLVideoElement;
    let arranco = false;
    clip.play = () => { arranco = true; fireEvent.play(clip); return Promise.resolve(); };
    fireEvent.click(screen.getByTestId("manual-clip-play"));
    expect(arranco).toBe(true);
    expect(screen.queryByTestId("manual-clip-play")).toBeNull();
    fireEvent.pause(clip);
    expect(screen.getByTestId("manual-clip-play")).toBeTruthy();
    for (const id of ["manual-clip-espejo", "manual-clip-google-compu", "manual-clip-cat-buscar"]) expect(screen.getByTestId(`${id}-play`)).toBeTruthy();
  });
});
