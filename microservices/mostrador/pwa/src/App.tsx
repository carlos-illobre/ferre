import { useEffect, useState } from "react";
import { VERSION_PRECIOS } from "@ferre/precios";

type Salud = { ok: boolean; db: string; precios: string };

// Pantalla mínima del esqueleto: muestra que la PWA, la API y la base se hablan.
// Las pantallas reales (buscar, vender, cargar lista) llegan con los issues #12 a #15.
export function App() {
  const [salud, setSalud] = useState<Salud | "cargando" | "sin-conexion">("cargando");

  useEffect(() => {
    fetch("/health")
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
        {typeof salud === "object" && `Servidor ${salud.ok ? "ok" : "con problemas"} · base ${salud.db} · precios v${salud.precios}`}
      </p>
      <small>PWA v{VERSION_PRECIOS}</small>
    </main>
  );
}
