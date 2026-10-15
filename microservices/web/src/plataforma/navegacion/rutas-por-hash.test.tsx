import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { crearRutasPorHash } from "./rutas-por-hash";

// La navegación por hash, sobre React Router: la dirección sigue siendo #/camino?consulta, los
// alias se resuelven y la aplicación ve el nombre, la parte de adentro y los parámetros.
describe("rutas por hash", () => {
  const rutas = crearRutasPorHash({ resolver: (c) => ({ inicio: "vender", viejo: "catalogo/listas" })[c || "inicio"] ?? c });
  function Muestra() {
    const r = rutas.useRuta();
    return <p data-testid="ruta">{`${r.nombre}|${r.sub ?? ""}|${r.parametros.get("codigo") ?? ""}`}</p>;
  }

  it("sin dirección abre la de arranque; irA cambia la dirección y la ruta; un alias abre lo que abría", async () => {
    location.hash = "";
    render(<rutas.ConRutas><Muestra /></rutas.ConRutas>);
    expect(screen.getByTestId("ruta").textContent).toBe("vender||");
    rutas.irA("vincular?codigo=ABC");
    await waitFor(() => expect(screen.getByTestId("ruta").textContent).toBe("vincular||ABC"));
    expect(location.hash).toBe("#/vincular?codigo=ABC");
    rutas.irA("viejo");
    await waitFor(() => expect(screen.getByTestId("ruta").textContent).toBe("catalogo|listas|"));
    expect(location.hash).toBe("#/viejo");
  });
});
