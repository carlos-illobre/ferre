import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createHashRouter, useLocation } from "react-router";
import { RouterProvider } from "react-router/dom";

// Navegación por la parte de la dirección que va después del «#» (#/catalogo/listas,
// #/algo?codigo=…), con React Router (ADR-018). Sirve donde el sitio no puede reescribir
// direcciones (un sitio estático): una dirección real daría 404 al recargar. Opcionalmente
// anima el cambio de pantalla con las transiciones de vista del navegador, que React Router
// sincroniza con el dibujo de la pantalla nueva. Sirve para cualquier aplicación: quien la usa
// dice cómo se resuelve un camino (alias, pantalla de arranque) y qué movimiento le toca a cada
// cambio. La aplicación elige la pantalla con `useRuta`: React Router lleva la dirección, el
// historial y la animación, y una sola ruta comodín muestra la aplicación entera.
export type Ruta = { nombre: string; sub: string | null; parametros: URLSearchParams };

export type OpcionesDeRutas = {
  // De un camino escrito en la dirección (puede venir vacío) al camino que de verdad se abre.
  resolver: (camino: string) => string;
  // Qué movimiento le toca a un cambio de dirección; queda en `data-nav` de la página, para que
  // la hoja de estilos elija la animación de la transición.
  movimiento?: (desde: string, hacia: string) => string;
  // Si hoy se puede animar (una preferencia, por ejemplo). Sin esto, siempre.
  sePuedeAnimar?: () => boolean;
};

type Enrutador = ReturnType<typeof createHashRouter>;

export function crearRutasPorHash(opciones: OpcionesDeRutas) {
  let animada = false;
  // Lo que muestra la ruta comodín: la aplicación que envuelve `ConRutas`.
  const Aplicacion = createContext<ReactNode>(null);
  function Contenido() { return <>{useContext(Aplicacion)}</>; }
  // El enrutador se crea la primera vez que hace falta: así solo escucha la dirección la
  // aplicación que de verdad se abrió.
  let enrutador: Enrutador | null = null;
  const elEnrutador = (): Enrutador => (enrutador ??= createHashRouter([{ path: "*", Component: Contenido }]));

  function ConRutas({ children }: { children: ReactNode }) {
    return <Aplicacion.Provider value={children}><RouterProvider router={elEnrutador()} /></Aplicacion.Provider>;
  }

  function useRuta(): Ruta {
    const { pathname, search } = useLocation();
    return useMemo(() => {
      const [nombre = "", sub = null] = opciones.resolver(pathname.replace(/^\//, "")).split("/");
      return { nombre, sub, parametros: new URLSearchParams(search) };
    }, [pathname, search]);
  }

  // La navegación animada se activa aparte: una misma aplicación puede animar en una interfaz y no en otra.
  function animar(si: boolean): void { animada = si; }

  // Se anima si el navegador puede, nadie pidió quietud y la aplicación lo deja.
  function seAnima(): boolean {
    const sinMovimiento = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    return !sinMovimiento && (opciones.sePuedeAnimar ? opciones.sePuedeAnimar() : true) && "startViewTransition" in document;
  }

  // Va a un camino («catalogo/listas», «foto?codigo=…»). Se puede llamar desde cualquier lado,
  // también fuera de la aplicación (un aviso, el espejo con el otro dispositivo).
  function irA(camino: string): void {
    const r = elEnrutador();
    const destino = `/${camino}`;
    const { pathname, search } = r.state.location;
    if (pathname + search === destino) return;
    const conTransicion = animada && seAnima();
    if (conTransicion && opciones.movimiento) document.documentElement.dataset.nav = opciones.movimiento(`#${pathname}${search}`, `#${destino}`);
    void r.navigate(destino, { viewTransition: conTransicion });
  }

  return { ConRutas, useRuta, irA, animar };
}
