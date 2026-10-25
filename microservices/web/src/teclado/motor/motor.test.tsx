import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { olvidarLasOfertas, useComandos, type Acciones } from "../../plataforma/comandos";
import { teclaDe } from "./tecla";
import { teclear, type Linea } from "./tabla";

const evento = (p: Partial<KeyboardEventInit> & { code?: string }, objetivo: HTMLElement = document.body) => {
  const e = new KeyboardEvent("keydown", { cancelable: true, bubbles: true, ...p });
  Object.defineProperty(e, "target", { value: objetivo });
  return e;
};
function Ofrece({ acciones }: { acciones: Acciones }) { useComandos(acciones); return null; }

describe("el nombre de una tecla", () => {
  it("las letras y los números salen de la tecla física, con sus modificadores", () => {
    expect(teclaDe(evento({ code: "KeyC", key: "c", altKey: true }))).toBe("Alt+C");
    expect(teclaDe(evento({ code: "Digit3", key: "#", shiftKey: true }))).toBe("Mayús+3");
    expect(teclaDe(evento({ code: "F2", key: "F2" }))).toBe("F2");
    expect(teclaDe(evento({ code: "Equal", key: "+", shiftKey: true }))).toBe("+");
    expect(teclaDe(evento({ code: "KeyB", key: "b", ctrlKey: true }))).toBe("Ctrl+B");
  });
});

describe("la tabla de teclas", () => {
  afterEach(olvidarLasOfertas);
  const tabla: Linea[] = [
    { tecla: "F2", accion: "cobrar", enCampos: true },
    { tecla: "E", accion: "corregir" },
    { tecla: "Enter", accion: "agregar", donde: ".busqueda" },
    { tecla: "Enter", accion: "abrir" },
  ];

  it("pide la acción de la tecla, y no en un campo salvo que la línea lo diga", () => {
    const hechas: string[] = [];
    render(<Ofrece acciones={{ cobrar: () => { hechas.push("cobrar"); }, corregir: () => { hechas.push("corregir"); } }} />);
    const campo = document.createElement("input");
    expect(teclear(tabla, evento({ code: "F2", key: "F2" }, campo))).toBe(true);
    expect(teclear(tabla, evento({ code: "KeyE", key: "e" }, campo))).toBe(false);
    expect(teclear(tabla, evento({ code: "KeyE", key: "e" }))).toBe(true);
    expect(hechas).toEqual(["cobrar", "corregir"]);
  });

  it("una línea con lugar vale solo ahí, y si nadie ofrece la acción sigue con la próxima", () => {
    const hechas: string[] = [];
    render(<Ofrece acciones={{ agregar: () => { hechas.push("agregar"); }, abrir: () => { hechas.push("abrir"); } }} />);
    const busqueda = document.createElement("div"); busqueda.className = "busqueda";
    const caja = document.createElement("span"); busqueda.appendChild(caja);
    teclear(tabla, evento({ code: "Enter", key: "Enter" }, caja));
    teclear(tabla, evento({ code: "Enter", key: "Enter" }));
    expect(hechas).toEqual(["agregar", "abrir"]);
  });

  it("con el foco en una zona propia, las teclas de moverse no llegan a la pantalla", () => {
    const hechas: string[] = [];
    render(<Ofrece acciones={{ abrir: () => { hechas.push("abrir"); } }} />);
    const menu = document.createElement("nav"); menu.className = "lateral";
    expect(teclear(tabla, evento({ code: "Enter", key: "Enter" }, menu), ".lateral")).toBe(false);
    expect(hechas).toEqual([]);
  });
});
