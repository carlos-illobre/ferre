import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

// Navegación por la parte de la dirección que va después del «#» (#/catalogo/listas,
// #/algo?codigo=…). Sirve donde el sitio no puede reescribir direcciones (un sitio estático):
// una dirección real daría 404 al recargar. Opcionalmente anima el cambio de pantalla con las
// transiciones de vista del navegador. Sirve para cualquier aplicación: quien la usa dice cómo
// se resuelve un camino (alias, pantalla de arranque) y qué movimiento le toca a cada cambio.
export type Ruta = { nombre: string; sub: string | null; parametros: URLSearchParams };

export type OpcionesDeRutas = {
  // De un camino escrito en la dirección (puede venir vacío) al camino que de verdad se abre.
  resolver: (camino: string) => string;
  // Qué movimiento le toca a un cambio de dirección; queda en `data-nav` de la página mientras
  // dura la transición, para que la hoja de estilos elija la animación.
  movimiento?: (desde: string, hacia: string) => string;
  // Si hoy se puede animar (una preferencia, por ejemplo). Sin esto, siempre.
  sePuedeAnimar?: () => boolean;
};

type ConTransicion = Document & { startViewTransition?: (cambio: () => Promise<void> | void) => { finished: Promise<void> } };

export function crearRutasPorHash(opciones: OpcionesDeRutas) {
  let animada = false;
  let enTransicion = false;

  function leer(): Ruta {
    const hash = location.hash.replace(/^#\/?/, "");
    const [camino = "", consulta = ""] = hash.split("?");
    const [nombre = "", sub = null] = opciones.resolver(camino).split("/");
    return { nombre, sub, parametros: new URLSearchParams(consulta) };
  }

  function useRuta(): Ruta {
    const [ruta, setRuta] = useState<Ruta>(leer);
    useEffect(() => {
      // Durante una navegación animada la pantalla nueva se dibuja en el acto, dentro del mismo
      // aviso de cambio de dirección: el navegador está esperando ese dibujo para animar.
      const alCambiar = () => { if (enTransicion) flushSync(() => setRuta(leer())); else setRuta(leer()); };
      window.addEventListener("hashchange", alCambiar);
      return () => window.removeEventListener("hashchange", alCambiar);
    }, []);
    return ruta;
  }

  // La navegación animada se activa aparte: una misma aplicación puede animar en una interfaz y no en otra.
  function animar(si: boolean): void { animada = si; }

  function irA(camino: string): void {
    const destino = `#/${camino}`;
    const doc = document as ConTransicion;
    const sinMovimiento = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const permitida = opciones.sePuedeAnimar ? opciones.sePuedeAnimar() : true;
    if (!animada || !permitida || !doc.startViewTransition || sinMovimiento || location.hash === destino) { location.hash = destino; return; }
    if (opciones.movimiento) document.documentElement.dataset.nav = opciones.movimiento(location.hash, destino);
    // El navegador saca una foto de la pantalla, espera a que esté dibujada la nueva y anima de
    // una a la otra. Mientras espera no corre ningún cuadro de animación, así que acá no se puede
    // esperar uno: la pantalla nueva se dibuja en el aviso de cambio de dirección (ver `useRuta`)
    // y con ese mismo aviso se le dice al navegador que ya está. El reloj es solo una red de
    // seguridad por si el aviso no llegara.
    enTransicion = true;
    const transicion = doc.startViewTransition(() => new Promise<void>((listo) => {
      const red = setTimeout(listo, 400);
      window.addEventListener("hashchange", () => { clearTimeout(red); listo(); }, { once: true });
      location.hash = destino;
    }));
    void transicion.finished.catch(() => undefined).then(() => { enTransicion = false; delete document.documentElement.dataset.nav; });
  }

  return { useRuta, irA, animar };
}
