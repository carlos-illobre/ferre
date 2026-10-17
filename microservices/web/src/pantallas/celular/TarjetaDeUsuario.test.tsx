import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AutorizarOtro, TarjetaDeUsuario, type Persona } from "./TarjetaDeUsuario";
import { FiltroDeUsuarios } from "./FiltroDeUsuarios";
import { useFiltroDeUsuarios } from "../filtro-de-usuarios";

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

  it("«Autorizar otro correo de Google» se toca", () => {
    const alTocar = vi.fn();
    render(<AutorizarOtro alTocar={alTocar} />);
    fireEvent.click(screen.getByTestId("autorizar"));
    expect(alTocar).toHaveBeenCalled();
  });
});

// 007-T033: debajo de «Autorizar otro correo de Google», buscar por correo o nombre y filtrar por rol.
describe("buscar y filtrar por rol en el celular", () => {
  const GENTE: Persona[] = [
    { id: "u4", nombre: "Carlos", email: "carlos@ferre.test", activo: true, roles: [ROLES[0]!, ROLES[1]!] },
    { id: "u2", nombre: "Marta", email: "marta.bress@ferre.test", activo: true, roles: [ROLES[0]!] },
    LUCIA,
  ];
  function Lista() {
    const f = useFiltroDeUsuarios(GENTE, ROLES);
    return <><FiltroDeUsuarios filtro={f} roles={ROLES} /><ul>{f.visibles.map((u) => <li key={u.id} data-testid="visible">{u.nombre}</li>)}</ul></>;
  }
  const visibles = () => screen.queryAllByTestId("visible").map((l) => l.textContent);

  it("al escribir sugiere con el correo resaltado y el nombre; elegir una deja solo a esa persona", () => {
    render(<Lista />);
    fireEvent.change(screen.getByTestId("buscar-usuario"), { target: { value: "lu" } });
    const [sugerencia] = screen.getAllByTestId("sugerencia-usuario");
    expect(sugerencia!.querySelector("b")!.textContent).toBe("lu");
    expect(sugerencia!.textContent).toContain("Lucía Fernández");
    expect(visibles()).toEqual(["Lucía Fernández"]);
    fireEvent.click(sugerencia!);
    expect((screen.getByTestId("buscar-usuario") as HTMLInputElement).value).toBe("lucia.fernandez.deposito@ferre.test");
    expect(screen.queryByTestId("sugerencia-usuario")).toBeNull();
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("1 de 3 usuarios");
  });

  it("la cruz borra la búsqueda y vuelven todos", () => {
    render(<Lista />);
    fireEvent.change(screen.getByTestId("buscar-usuario"), { target: { value: "marta" } });
    expect(visibles()).toEqual(["Marta"]);
    fireEvent.click(screen.getByRole("button", { name: "Borrar la búsqueda" }));
    expect(visibles()).toEqual(["Carlos", "Marta", "Lucía Fernández"]);
    expect(screen.queryByTestId("cuantos-quedan")).toBeNull();
  });

  it("con un rol elegido quedan solo quienes lo tienen, la lista se marca y dice cuántos", () => {
    render(<Lista />);
    expect(screen.getByTestId("filtro-rol").textContent).toBe("TodosAdministradorVendedor");
    fireEvent.change(screen.getByTestId("filtro-rol"), { target: { value: "r2" } });
    expect(visibles()).toEqual(["Carlos", "Lucía Fernández"]);
    expect(screen.getByTestId("filtro-rol").closest("label")!.className).toContain("si");
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("2 de 3 usuarios con el rol Vendedor");
    fireEvent.change(screen.getByTestId("buscar-usuario"), { target: { value: "zz" } });
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("Nadie coincide con la búsqueda.");
  });
});
