import { useEffect, useState } from "react";

// Enrutamiento por hash (#/listas, #/vincular?codigo=…). Por hash y no por ruta real
// porque el cliente vive en GitHub Pages, que no reescribe rutas: una URL real daría 404
// al recargar. Suficiente para un puñado de pantallas.
export type Ruta = { nombre: string; parametros: URLSearchParams };

function leer(): Ruta {
  const hash = location.hash.replace(/^#\/?/, "");
  const [nombre, consulta = ""] = hash.split("?");
  return { nombre: nombre || "inicio", parametros: new URLSearchParams(consulta) };
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(leer);
  useEffect(() => {
    const alCambiar = () => setRuta(leer());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);
  return ruta;
}

export function irA(nombre: string): void {
  location.hash = `#/${nombre}`;
}
