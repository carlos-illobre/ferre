/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a), reducirImagen: async (f: File) => f }));

// jsdom no sabe guardar un archivo en su IndexedDB simulada: el almacén del dispositivo se
// reemplaza por uno en memoria, que alcanza para probar que nada se pierde ni se duplica.
const guardado = vi.hoisted(() => new Map<string, unknown>());
vi.mock("../almacen", () => ({ guardarMeta: async (clave: string, valor: unknown) => { guardado.set(clave, valor); }, leerMeta: async (clave: string) => guardado.get(clave) ?? null }));

import { Tickets } from "./Tickets";

const abierto = { id: "t-1", tipo: "error", descripcion: "La pantalla quedó en blanco", dispositivo: "celular · Chrome", version: "abc", creado_en: "2026-10-11T12:00:00Z", estado: "abierto", resuelto_en: null, nota: null, usuario: "Marta", resuelto_por: null, fotos: [] };
const resuelto = { ...abierto, id: "t-2", descripcion: "No imprimía", estado: "resuelto", resuelto_en: "2026-10-11T13:00:00Z", resuelto_por: "Carlos", nota: "Corregido" };

// Mejoras y errores (RF-80 y RF-81).
describe("Mejoras y errores", () => {
  let enviados: FormData[];
  let hayRed: boolean;
  beforeEach(async () => {
    enviados = []; hayRed = true;
    guardado.clear();
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string, opciones?: RequestInit) => {
      if (!hayRed) throw new Error("Failed to fetch");
      if (ruta === "/tickets" && opciones?.method === "POST") { enviados.push(opciones.body as FormData); return { id: "nuevo" }; }
      if (ruta === "/tickets") return [abierto, resuelto];
      return { ok: true };
    });
    globalThis.fetch = vi.fn(async () => ({ ok: false })) as never;
    Object.defineProperty(URL, "createObjectURL", { value: () => "blob:prueba", configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: () => undefined, configurable: true });
  });

  it("sin texto no se envía y dice qué falta", async () => {
    render(<Tickets />);
    fireEvent.click(screen.getByTestId("enviar"));
    expect(screen.getByRole("alert").textContent).toContain("Contá qué pasó");
    expect(enviados).toHaveLength(0);
  });

  it("se envía con el tipo elegido, el texto y las fotos, con un id propio del dispositivo", async () => {
    render(<Tickets />);
    fireEvent.click(screen.getByTestId("tipo-mejora"));
    fireEvent.change(screen.getByTestId("descripcion"), { target: { value: "Ver el stock al buscar" } });
    fireEvent.change(screen.getByTestId("archivo-foto"), { target: { files: [new File(["x"], "captura.png", { type: "image/png" }), new File(["y"], "nota.txt", { type: "text/plain" })] } });
    fireEvent.click(screen.getByTestId("enviar"));
    await waitFor(() => expect(enviados).toHaveLength(1));
    const f = enviados[0]!;
    expect(f.get("tipo")).toBe("mejora");
    expect(f.get("descripcion")).toBe("Ver el stock al buscar");
    expect(String(f.get("id"))).toMatch(/.{8,}/);
    expect(f.getAll("fotos")).toHaveLength(1); // lo que no es una imagen no viaja
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Ticket enviado"));
  });

  it("son hasta 5 fotos por ticket", async () => {
    render(<Tickets />);
    const seis = Array.from({ length: 6 }, (_, i) => new File(["x"], `f${i}.png`, { type: "image/png" }));
    fireEvent.change(screen.getByTestId("archivo-foto"), { target: { files: seis } });
    expect(screen.getByRole("alert").textContent).toContain("hasta 5 fotos");
    expect(screen.getByLabelText("Fotos del ticket").querySelectorAll("li")).toHaveLength(5);
  });

  it("sin conexión queda por enviar en el dispositivo y sale solo, una vez, cuando vuelve", async () => {
    hayRed = false;
    render(<Tickets />);
    fireEvent.change(screen.getByTestId("descripcion"), { target: { value: "Se cortó internet" } });
    fireEvent.click(screen.getByTestId("enviar"));
    await screen.findByText("Por enviar", { selector: "h2" });
    expect(enviados).toHaveLength(0);
    hayRed = true;
    fireEvent(window, new Event("online"));
    await waitFor(() => expect(enviados).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText("Por enviar", { selector: "h2" })).toBeNull());
    fireEvent(window, new Event("online"));
    await new Promise((r) => setTimeout(r, 30));
    expect(enviados).toHaveLength(1);
  });

  it("todos ven todos: abiertos y resueltos por separado; se marca resuelto con nota y se reabre", async () => {
    render(<Tickets />);
    const lista = await screen.findByTestId("lista-de-tickets");
    expect(lista.textContent).toContain("La pantalla quedó en blanco");
    expect(lista.textContent).not.toContain("No imprimía");
    fireEvent.click(within(lista).getByTestId("resolver"));
    fireEvent.change(screen.getByTestId("nota"), { target: { value: "Listo" } });
    fireEvent.click(screen.getByTestId("confirmar-resuelto"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/tickets/t-1/resolver", expect.objectContaining({ method: "POST", body: JSON.stringify({ nota: "Listo" }) })));
    fireEvent.click(screen.getByRole("button", { name: /Resueltos/ }));
    const resueltos = await screen.findByTestId("lista-de-tickets");
    expect(resueltos.textContent).toContain("Resuelto por Carlos");
    expect(resueltos.textContent).toContain("Corregido");
    fireEvent.click(within(resueltos).getByTestId("reabrir"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/tickets/t-2/reabrir", expect.objectContaining({ method: "POST" })));
  });
});
