import { useEffect, useState } from "react";

// Enrutamiento por hash (#/catalogo/listas, #/vincular-celular?codigo=…). Por hash y no por ruta
// real porque el cliente vive en GitHub Pages, que no reescribe rutas: una URL real daría
// 404 al recargar. Cuatro pestañas y, dentro de dos de ellas, sub-pantallas.
export type Ruta = { nombre: string; sub: string | null; parametros: URLSearchParams };

// Rutas viejas (una pantalla por opción del menú) que siguen abriendo lo que abrían.
const ALIAS: Record<string, string> = {
  inicio: "vender", productos: "catalogo", listas: "catalogo/listas", duplicados: "catalogo/duplicados",
  stock: "deposito/stock", compras: "deposito/ingreso", contar: "deposito/contar", administracion: "negocio",
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

// La navegación animada del celular (decisión 78): la activa la aplicación del celular; las
// demás siguen cambiando de pantalla sin animar.
let animada = false;
export function animarNavegacion(si: boolean): void { animada = si; }

// De dónde a dónde se va, para elegir el movimiento: entrar a una pantalla desde una lista
// («adelante»), volver («atras») o cambiar de parte o de pestaña («funde»).
export function movimientoDe(desde: string, hacia: string): "adelante" | "atras" | "funde" {
  const limpio = (c: string) => c.replace(/^#?\/?/, "").split("?")[0] ?? "";
  const [a, b] = [limpio(desde), limpio(hacia)];
  if (a === "mas" && b.startsWith("mas/")) return "adelante";
  if (b === "mas" && (a.startsWith("mas/") || a === "negocio")) return "atras";
  return "funde";
}

type ConTransicion = Document & { startViewTransition?: (cambio: () => Promise<void> | void) => { finished: Promise<void> } };

export function irA(camino: string): void {
  const destino = `#/${camino}`;
  const doc = document as ConTransicion;
  const sinMovimiento = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Deshabilitadas en Configuración (RF-80): la raíz de la página lleva la marca.
  const deshabilitadas = document.documentElement.dataset.animaciones === "no";
  if (!animada || deshabilitadas || !doc.startViewTransition || sinMovimiento || location.hash === destino) { location.hash = destino; return; }
  document.documentElement.dataset.nav = movimientoDe(location.hash, destino);
  // La pantalla nueva se dibuja cuando llega el aviso del cambio de dirección: se espera eso y un cuadro más.
  const transicion = doc.startViewTransition(() => new Promise<void>((listo) => {
    const seguir = () => requestAnimationFrame(() => listo());
    window.addEventListener("hashchange", seguir, { once: true });
    setTimeout(seguir, 300);
    location.hash = destino;
  }));
  void transicion.finished.catch(() => undefined).then(() => { delete document.documentElement.dataset.nav; });
}
