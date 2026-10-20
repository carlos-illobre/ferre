import { useLayoutEffect, useRef } from "react";

// Las animaciones del lenguaje «Mostrador», con los tiempos y curvas de su maqueta: lo que entra
// usa la curva suave, lo que se suma rebota y lo que se va acelera. Solo transform y opacity, y
// nada para quien pidió menos movimiento en su sistema.
export const CURVA = "cubic-bezier(.2, .8, .2, 1)";
export const CURVA_SALIDA = "cubic-bezier(.4, 0, 1, 1)";
export const REBOTE = "cubic-bezier(.34, 1.4, .64, 1)";

export const conMovimiento = (): boolean => typeof window !== "undefined" && typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animar = (el: Element | null | undefined, cuadros: Keyframe[], opciones: KeyframeAnimationOptions): Animation | null =>
  el && conMovimiento() && typeof (el as HTMLElement).animate === "function" ? (el as HTMLElement).animate(cuadros, opciones) : null;

// Algo que se suma (un renglón): sube 8 px con un rebote y el borde verde se apaga solo.
export function entra(el: HTMLElement | null): void {
  if (!el) return;
  animar(el, [{ transform: "translateY(8px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: REBOTE });
  if (!conMovimiento()) return;
  // Un atributo y no una clase: la pantalla vuelve a escribir sus clases cuando se redibuja.
  el.dataset.animNuevo = "";
  setTimeout(() => { delete el.dataset.animNuevo; }, 1250);
}

// Lo que se va: sube y se desvanece, uno detrás de otro; `listo` corre al terminar (o enseguida, sin movimiento).
export function sale(els: HTMLElement[], listo: () => void): void {
  if (!conMovimiento() || els.length === 0) { listo(); return; }
  els.forEach((el, i) => animar(el, [{ transform: "none", opacity: 1 }, { transform: "translateY(-14px)", opacity: 0 }], { duration: 200, delay: i * 30, easing: CURVA_SALIDA, fill: "forwards" }));
  setTimeout(listo, 200 + els.length * 30);
}

// Para avisar que falta algo ahí.
export const sacudir = (el: Element | null | undefined) =>
  animar(el, [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }], { duration: 320 });

// Una insignia que suma.
export const saltar = (el: Element | null | undefined) =>
  animar(el, [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 320, easing: REBOTE });

// Un número que cambia: rueda hacia arriba si sube y hacia abajo si baja.
export function useRueda<T extends HTMLElement>(valor: number): React.RefObject<T> {
  const ref = useRef<T>(null);
  const antes = useRef(valor);
  useLayoutEffect(() => {
    if (antes.current !== valor) {
      const sube = valor > antes.current;
      animar(ref.current, [{ transform: `translateY(${sube ? ".4em" : "-.4em"})`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 200, easing: CURVA });
      antes.current = valor;
    }
  }, [valor]);
  return ref;
}

// Una lista cuyos elementos se mueven (uno se quita, otro se agrega): cada uno se desliza a su
// lugar nuevo en vez de saltar. Los elementos se reconocen por `data-clave`.
export function useDeslizar(contenedor: React.RefObject<HTMLElement | null>, dependencia: unknown): void {
  const lugares = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) { lugares.current = new Map(); return; }
    const nuevos = new Map<string, number>();
    el.querySelectorAll<HTMLElement>(":scope > [data-clave]").forEach((hijo) => {
      const clave = hijo.dataset.clave!;
      const arriba = hijo.getBoundingClientRect().top;
      nuevos.set(clave, arriba);
      const antes = lugares.current.get(clave);
      if (antes !== undefined && Math.abs(antes - arriba) > 1) animar(hijo, [{ transform: `translateY(${antes - arriba}px)` }, { transform: "none" }], { duration: 320, easing: CURVA });
    });
    lugares.current = nuevos;
  }, [contenedor, dependencia]);
}
