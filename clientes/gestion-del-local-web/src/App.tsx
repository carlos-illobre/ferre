import { useEffect, useState } from "react";
import { VERSION_CALCULO_DE_PRECIOS } from "@ferre/calculo-de-precios";
import { urlApi } from "./api";

type Salud = { ok: boolean; db: string; calculoDePrecios: string };

// Pantalla mínima del esqueleto: muestra que el cliente, la API y la base se hablan.
// Las pantallas reales (buscar, vender, cargar lista) llegan con los issues #12 a #15.
export function App() {
  const [salud, setSalud] = useState<Salud | "cargando" | "sin-conexion">("cargando");

  useEffect(() => {
    fetch(urlApi("/health"))
      .then((r) => r.json() as Promise<Salud>)
      .then(setSalud)
      .catch(() => setSalud("sin-conexion"));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 480 }}>
      <h1>ferre</h1>
      <p data-testid="estado">
        {salud === "cargando" && "Consultando el servidor…"}
        {salud === "sin-conexion" && "Sin conexión con el servidor."}
        {typeof salud === "object" &&
          `Servidor ${salud.ok ? "ok" : "con problemas"} · base ${salud.db} · cálculo de precios v${salud.calculoDePrecios}`}
      </p>
      <small>cliente web v{VERSION_CALCULO_DE_PRECIOS}</small>
    </main>
  );
}
