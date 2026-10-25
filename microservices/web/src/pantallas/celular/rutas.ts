import { crearRutasPorHash, type Ruta } from "../../plataforma/navegacion";

// Las direcciones de Ferrebress. La navegación en sí es tecnología de la plataforma; acá se
// dice qué pantalla abre sin dirección, qué direcciones viejas siguen andando y qué movimiento
// le toca a cada cambio de pantalla (decisión 78).
export type { Ruta };

// Rutas viejas (una pantalla por opción del menú) que siguen abriendo lo que abrían.
const ALIAS: Record<string, string> = {
  inicio: "vender", productos: "catalogo", listas: "catalogo/listas", duplicados: "catalogo/duplicados",
  stock: "deposito/stock", compras: "deposito/ingreso", contar: "deposito/contar", administracion: "negocio",
};

// De dónde a dónde se va, para elegir el movimiento: entrar a una pantalla desde una lista
// («adelante»), volver («atras») o cambiar de parte o de pestaña («funde»).
export function movimientoDe(desde: string, hacia: string): "adelante" | "atras" | "funde" {
  const limpio = (c: string) => c.replace(/^#?\/?/, "").split("?")[0] ?? "";
  const [a, b] = [limpio(desde), limpio(hacia)];
  if (a === "mas" && b.startsWith("mas/")) return "adelante";
  if (b === "mas" && (a.startsWith("mas/") || a === "negocio")) return "atras";
  return "funde";
}

const rutas = crearRutasPorHash({
  resolver: (camino) => ALIAS[camino || "inicio"] ?? (camino || "vender"),
  movimiento: movimientoDe,
  // Deshabilitadas en Configuración (RF-83): la raíz de la página lleva la marca.
  sePuedeAnimar: () => document.documentElement.dataset.animaciones !== "no",
});

// La aplicación del celular va envuelta en `ConRutas` (React Router).
export const ConRutas = rutas.ConRutas;
export const useRuta = rutas.useRuta;
export const irA = rutas.irA;
// La navegación animada del celular: la activa la aplicación del celular; la computadora no anima.
export const animarNavegacion = rutas.animar;
