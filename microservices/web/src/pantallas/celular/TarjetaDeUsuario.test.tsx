import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AutorizarOtro, cuantosEntran, TarjetaDeUsuario, type Persona } from "./TarjetaDeUsuario";
import { FiltroDeUsuarios } from "./FiltroDeUsuarios";
import { useFiltroDeUsuarios } from "../filtro-de-usuarios";

const ROLES = [{ id: "r1", nombre: "Administrador" }, { id: "r2", nombre: "Vendedor" }];
const LUCIA = { id: "u1", nombre: "Lucía Fernández", email: "lucia.fernandez.deposito@ferre.test", activo: false, creado_en: "2026-09-02T12:00:00", roles: [ROLES[1]!] };
const SIN_ACCESO = { sesiones: [], celulares: [], alCerrarSesion: () => undefined, alQuitarCelular: () => undefined };
const abrir = () => fireEvent.click(screen.getByTestId("abrir-usuario"));

// 007-T044: Más → Usuarios en el celular, una tarjeta plegada por persona (decisión 102).
describe("tarjeta de una persona en el celular", () => {
  it("plegada muestra las iniciales, el nombre con su estado, el correo y los roles en una línea; nada más", () => {
    render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={() => undefined} />);
    const cabeza = screen.getByTestId("abrir-usuario");
    expect(cabeza.getAttribute("aria-expanded")).toBe("false");
    expect(cabeza.textContent).toContain("LF");
    expect(cabeza.textContent).toContain("Lucía FernándezInactivo");
    expect(cabeza.textContent).toContain("lucia.fernandez.deposito@ferre.test");
    expect(screen.getByRole("list", { name: "Roles de Lucía Fernández: Vendedor" }).textContent).toBe("Vendedor");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByTestId("reactivar")).toBeNull();
  });

  it("los roles que no entran en la línea se cuentan con «+N», dejando lugar para el «+N»", () => {
    expect(cuantosEntran([100, 100], 300)).toBe(2);
    expect(cuantosEntran([100, 120, 90], 300)).toBe(2);
    expect(cuantosEntran([130, 130, 90], 300)).toBe(1);
    expect(cuantosEntran([300, 50], 300)).toBe(0);
  });

  it("al abrirla está en «Información»: el correo, cuándo se unió y «Reactivar», sin «Cambiar roles»", () => {
    render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={() => undefined} acceso={SIN_ACCESO} />);
    abrir();
    expect(screen.getAllByRole("tab").map((p) => [p.textContent, p.getAttribute("aria-selected")])).toEqual([["Información", "true"], ["Roles", "false"], ["Acceso (0)", "false"]]);
    expect(screen.getByTestId("se-unio").textContent).toBe("Se unió el 02/09/2026");
    expect(screen.getByTestId("reactivar").textContent).toBe("Reactivar");
    expect(screen.queryByTestId("cambiar-roles")).toBeNull();
  });

  it("en «Roles» están todos y «Cambiar roles», que abre las casillas y guarda los elegidos; ahí no está «Desactivar»", async () => {
    const alCambiarRoles = vi.fn(async () => null);
    render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={alCambiarRoles} alActivar={() => undefined} />);
    abrir();
    fireEvent.click(screen.getByTestId("pestana-roles"));
    expect(screen.getByTestId("roles-de-usuario").textContent).toBe("Vendedor");
    expect(screen.queryByTestId("reactivar")).toBeNull();
    fireEvent.click(screen.getByTestId("cambiar-roles"));
    fireEvent.click(screen.getByTestId("rol-Administrador"));
    fireEvent.click(screen.getByTestId("guardar-roles"));
    await waitFor(() => expect(alCambiarRoles).toHaveBeenCalledWith(["r2", "r1"]));
    await waitFor(() => expect(screen.getByTestId("cambiar-roles")).toBeTruthy());
  });

  it("al cerrarla y volver a abrirla, vuelve a «Información»", () => {
    render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={() => undefined} />);
    abrir();
    fireEvent.click(screen.getByTestId("pestana-roles"));
    abrir();
    abrir();
    expect(screen.getByTestId("pestana-info").getAttribute("aria-selected")).toBe("true");
  });

  it("en «Acceso» están sus sesiones y celulares con «Cerrar» y «Quitar»; sin ninguno, lo dice", () => {
    const alCerrarSesion = vi.fn();
    const acceso = { ...SIN_ACCESO, alCerrarSesion, sesiones: [{ id: "s1", usuario_id: "u1", dispositivo: "computadora · Firefox", ultimo_uso_en: null, email: LUCIA.email, nombre: LUCIA.nombre }],
      celulares: [{ id: "c1", usuario_id: "u1", dispositivo: "Samsung", creada_en: "2026-09-01T10:00:00Z", ultimo_uso_en: null }] };
    const { unmount } = render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={() => undefined} acceso={acceso as never} />);
    abrir();
    fireEvent.click(screen.getByTestId("pestana-sesiones"));
    expect(screen.getByTestId("pestana-sesiones").textContent).toBe("Acceso (2)");
    const lista = screen.getByTestId("acceso-de-usuario");
    expect(lista.textContent).toContain("computadora · Firefox");
    expect(lista.textContent).toContain("Samsung");
    fireEvent.click(within(lista).getByRole("button", { name: "Cerrar la sesión de Lucía Fernández en computadora · Firefox" }));
    expect(alCerrarSesion).toHaveBeenCalled();
    unmount();
    render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={() => undefined} acceso={SIN_ACCESO} />);
    abrir();
    fireEvent.click(screen.getByTestId("pestana-sesiones"));
    expect(screen.getByText("No tiene sesiones abiertas ni celulares con huella.")).toBeTruthy();
  });

  it("021-T013 dos sesiones en aparatos con el mismo nombre van en dos renglones y cada una se cierra (decisión 153)", () => {
    const alCerrarSesion = vi.fn();
    const sesion = (id: string) => ({ id, usuario_id: "u1", dispositivo: "computadora · Chrome", ultimo_uso_en: null, email: LUCIA.email, nombre: LUCIA.nombre });
    const acceso = { ...SIN_ACCESO, alCerrarSesion, sesiones: [sesion("s1"), sesion("s2")] };
    render(<TarjetaDeUsuario persona={LUCIA} orden={0} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={() => undefined} acceso={acceso as never} />);
    abrir();
    fireEvent.click(screen.getByTestId("pestana-sesiones"));
    const cerrar = within(screen.getByTestId("acceso-de-usuario")).getAllByRole("button", { name: "Cerrar la sesión de Lucía Fernández en computadora · Chrome" });
    expect(cerrar).toHaveLength(2);
    fireEvent.click(cerrar[1]!);
    expect(alCerrarSesion).toHaveBeenCalledWith(expect.objectContaining({ id: "s2" }));
  });

  it("«Desactivar» avisa a la pantalla", () => {
    const alActivar = vi.fn();
    render(<TarjetaDeUsuario persona={{ ...LUCIA, activo: true }} orden={1} disponibles={ROLES} alCambiarRoles={async () => null} alActivar={alActivar} />);
    abrir();
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

// 007-T033 y 007-T044: debajo de «Autorizar otro correo de Google», buscar, filtrar y ordenar.
describe("buscar, filtrar y ordenar en el celular", () => {
  const GENTE: Persona[] = [
    { id: "u4", nombre: "Carlos", email: "carlos@ferre.test", activo: true, roles: [ROLES[0]!, ROLES[1]!] },
    { id: "u2", nombre: "Marta", email: "marta.bress@ferre.test", activo: true, roles: [ROLES[0]!] },
    LUCIA,
  ];
  function Lista() {
    const f = useFiltroDeUsuarios(GENTE);
    return <><FiltroDeUsuarios filtro={f} roles={ROLES} filas={GENTE} /><ul>{f.visibles.map((u) => <li key={u.id} data-testid="visible">{u.nombre}</li>)}</ul></>;
  }
  const visibles = () => screen.queryAllByTestId("visible").map((l) => l.textContent);
  const opcion = (nombre: string) => within(screen.getByRole("group", { name: "Roles" })).getByRole("button", { name: nombre });

  it("siempre dice cuántos son, y la lista va por correo", () => {
    render(<Lista />);
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("3 usuarios · 2 activos");
    expect(visibles()).toEqual(["Carlos", "Lucía Fernández", "Marta"]);
    expect((screen.getByTestId("buscar-usuario") as HTMLInputElement).placeholder).toBe("Nombre o correo");
  });

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
    expect(visibles()).toEqual(["Carlos", "Lucía Fernández", "Marta"]);
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("3 usuarios · 2 activos");
  });

  it("«Filtros»: varios roles a la vez (queda quien tiene cualquiera) y el estado; se marca y dice cuántos", () => {
    render(<Lista />);
    fireEvent.click(screen.getByTestId("abrir-filtros"));
    expect(screen.getByTestId("panel-filtros").textContent).toContain("Seleccioná uno o más");
    expect(opcion("Todos").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(opcion("Administrador"));
    expect(visibles()).toEqual(["Carlos", "Marta"]);
    fireEvent.click(opcion("Vendedor"));
    expect(visibles()).toEqual(["Carlos", "Lucía Fernández", "Marta"]);
    fireEvent.click(within(screen.getByRole("group", { name: "Estado" })).getByRole("button", { name: "Inactivos" }));
    expect(visibles()).toEqual(["Lucía Fernández"]);
    expect(screen.getByTestId("ver-usuarios").textContent).toBe("Aplicar filtrosVer 1 usuario");
    expect(screen.getByTestId("abrir-filtros").className).toContain("si");
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("1 de 3 usuarios");
    fireEvent.click(screen.getByTestId("ver-usuarios"));
    expect(screen.queryByTestId("panel-filtros")).toBeNull();
    fireEvent.change(screen.getByTestId("buscar-usuario"), { target: { value: "zz" } });
    expect(screen.getByTestId("cuantos-quedan").textContent).toBe("Nadie coincide con la búsqueda.");
  });

  it("«Quitar filtros» vuelve a todos", () => {
    render(<Lista />);
    fireEvent.click(screen.getByTestId("abrir-filtros"));
    fireEvent.click(opcion("Vendedor"));
    fireEvent.click(within(screen.getByRole("group", { name: "Estado" })).getByRole("button", { name: "Activos" }));
    expect(visibles()).toEqual(["Carlos"]);
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(visibles()).toEqual(["Carlos", "Lucía Fernández", "Marta"]);
    expect(screen.getByTestId("abrir-filtros").className).not.toContain("si");
  });

  it("«Ordenar» por estado pone primero a los activos", () => {
    render(<Lista />);
    fireEvent.click(screen.getByTestId("ordenar"));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Estado" }));
    expect(visibles()).toEqual(["Carlos", "Marta", "Lucía Fernández"]);
    expect(screen.getByTestId("ordenar").textContent).toBe("Ordenar: estado");
  });
});
