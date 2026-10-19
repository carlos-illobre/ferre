import { useEffect, useState } from "react";

// Si el servidor contesta, no si hay red: con un wifi conectado y sin salida a internet, el
// navegador dice que está en línea igual. Se pregunta al abrir, cada `cadaMs` y cuando el
// navegador avisa que volvió la red; si se va la red, se sabe en el momento.
export type Disponibilidad = "conectando" | "en-linea" | "sin-conexion";

export function useResponde(url: string, cadaMs = 30_000, esperaMs = 8_000): Disponibilidad {
  const [estado, setEstado] = useState<Disponibilidad>("conectando");
  useEffect(() => {
    let vigente = true;
    const preguntar = async () => {
      if (!navigator.onLine) { setEstado("sin-conexion"); return; }
      const corte = new AbortController();
      const plazo = setTimeout(() => corte.abort(), esperaMs);
      const ok = await fetch(url, { cache: "no-store", signal: corte.signal }).then((r) => r.ok, () => false);
      clearTimeout(plazo);
      if (vigente) setEstado(ok ? "en-linea" : "sin-conexion");
    };
    const sinRed = () => setEstado("sin-conexion");
    const conRed = () => { setEstado("conectando"); void preguntar(); };
    void preguntar();
    const cada = setInterval(() => void preguntar(), cadaMs);
    window.addEventListener("online", conRed);
    window.addEventListener("offline", sinRed);
    return () => { vigente = false; clearInterval(cada); window.removeEventListener("online", conRed); window.removeEventListener("offline", sinRed); };
  }, [url, cadaMs, esperaMs]);
  return estado;
}
