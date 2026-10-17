import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AutorizarOtro, CabeceraDeUsuarios, TarjetaDeUsuario } from "./TarjetaDeUsuario";

const ROLES = [{ id: "r1", nombre: "Administrador" }, { id: "r2", nombre: "Vendedor" }];
const LUCIA = { id: "u1", nombre: "Lucía Fernández", email: "lucia.fernandez.deposito@ferre.test", activo: false, roles: [ROLES[1]!] };

// 007-T032: Más → Usuarios en el celular, una tarjeta por persona.
describe("tarjeta de una persona en el celular", () => {
  it("muestra las iniciales, el estado, el correo entero, los roles y abajo «Cambiar roles» y «Reactivar»", () => {
    render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={() => undefined} />);
    const t = screen.getByTestId("usuario-fila");
    expect(t.textContent).toContain("LF");
    expect(t.textContent).toContain("Inactivo");
    expect(t.textContent).toContain("lucia.fernandez.deposito@ferre.test");
    expect(screen.getByTestId("roles-de-usuario").textContent).toContain("Vendedor");
    expect(screen.getByTestId("cambiar-roles")).toBeTruthy();
    expect(screen.getByTestId("reactivar").textContent).toBe("Reactivar");
  });

  it("«Cambiar roles» abre las casillas y guarda los elegidos", async () => {
    const alCambiarRoles = vi.fn(async () => null);
    render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={alCambiarRoles} alActivar={() => undefined} />);
    fireEvent.click(screen.getByTestId("cambiar-roles"));
    fireEvent.click(screen.getByTestId("rol-Administrador"));
    fireEvent.click(screen.getByTestId("guardar-roles"));
    await waitFor(() => expect(alCambiarRoles).toHaveBeenCalledWith(["r2", "r1"]));
    await waitFor(() => expect(screen.getByTestId("cambiar-roles")).toBeTruthy());
  });

  it("«Desactivar» avisa a la pantalla", () => {
    const alActivar = vi.fn();
    render(<TarjetaDeUsuario persona={{ ...LUCIA, activo: true }} orden={1} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={alActivar} />);
    fireEvent.click(screen.getByTestId("desactivar"));
    expect(alActivar).toHaveBeenCalled();
  });

  it("la cabecera dice cuántos son, y «Autorizar otro correo de Google» se toca", () => {
    const alTocar = vi.fn();
    render(<><CabeceraDeUsuarios cuantos={4} /><AutorizarOtro alTocar={alTocar} /></>);
    expect(screen.getByTestId("cuantos-usuarios").textContent).toBe("4 usuarios");
    fireEvent.click(screen.getByTestId("autorizar"));
    expect(alTocar).toHaveBeenCalled();
  });
});
