import { useEffect, useState } from "react";

// Enrutamiento por hash (#/catalogo/listas, #/vincular?codigo=…). Por hash y no por ruta
// real porque el cliente vive en GitHub Pages, que no reescribe rutas: una URL real daría
// 404 al recargar. Cuatro pestañas y, dentro de dos de ellas, sub-pantallas.
export type Ruta = { nombre: string; sub: string | null; parametros: URLSearchParams };

// Rutas viejas (una pantalla por opción del menú) que siguen abriendo lo que abrían.
const ALIAS: Record<string, string> = {
  inicio: "vender", productos: "catalogo", listas: "catalogo/listas", duplicados: "catalogo/duplicados",
  stock: "deposito", compras: "deposito/ingreso", contar: "deposito/contar", administracion: "negocio",
};

function leer(): Ruta {
  const hash = location.hash.replace(/^#\/?/, "");
  const [camino, consulta = ""] = hash.split("?");
  const resuelto = ALIAS[camino || "inicio"] ?? camino ?? "vender";
  const [nombre, sub = null] = resuelto.split("/");
  return { nombre: nombre || "vender", sub, parametros: new URLSearchParams(consulta) };
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

export function irA(camino: string): void {
  location.hash = `#/${camino}`;
}
