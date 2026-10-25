import { useCallback, type KeyboardEvent, type RefObject } from "react";
import { otraCantidad, type Item, type Medio } from "../../../negocio/ventas";
import { teclearCon, useTablaDeTeclas, useTeclasGlobales, type TablaDeTeclas } from "../../../plataforma/teclado";
import { MEDIOS } from "../../textos";

// Las teclas de Vender en la computadora: F5 a F8 eligen cómo paga, F2 cobra, F1 muestra el panel,
// F9 elige el cliente y F4 es «No llevó» (Esc queda para cerrar el desplegable, decisión 127). Con
// la búsqueda vacía, + y − cambian la cantidad del renglón elegido y Supr lo quita.
type DeVender = {
  activas: boolean; caja: RefObject<HTMLInputElement>; consulta: string; items: Item[]; renglon: Item | null;
  elegirMedio: (m: Medio) => void; cobrar: () => unknown; alternarPanel: () => void; elegirCliente: () => void; noLlevo: () => void;
  cambiarItem: (clave: string, c: Partial<Item>) => void; quitar: (it: Item) => void;
};

const enOtroCampo = (caja: HTMLInputElement | null) => {
  const foco = document.activeElement;
  return foco instanceof HTMLElement && foco !== caja && (foco.matches("input, select, textarea") || foco.isContentEditable);
};

export function useTeclasDeVender(t: DeVender) {
  const medios = Object.fromEntries(MEDIOS.map((m) => [m.tecla, () => t.elegirMedio(m.valor)]));
  // Sobre el renglón elegido solo con la búsqueda vacía y el cursor fuera de otro campo.
  const alRenglon = (hacer: (it: Item) => void) => () => (t.renglon && !t.consulta && !enOtroCampo(t.caja.current) ? hacer(t.renglon) : false);
  const sumar = (signo: 1 | -1) => alRenglon((it) => { const cantidad = otraCantidad(it, signo); if (cantidad) t.cambiarItem(it.clave, { cantidad }); });
  useTablaDeTeclas({
    ...medios, F1: t.alternarPanel, F2: () => void t.cobrar(), F9: t.elegirCliente,
    F4: () => { if (t.items.length) t.noLlevo(); },
    "+": sumar(1), "-": sumar(-1), Delete: alRenglon(t.quitar),
  }, t.activas);
}

// ↑ ↓ eligen un producto del desplegable; sin resultados a la vista no son para eso: recorren la
// pantalla (flechas.ts).
export function flechasDeLaBusqueda(hayResultados: boolean, mover: (paso: 1 | -1) => void): TablaDeTeclas {
  return { ArrowDown: () => (hayResultados ? mover(1) : false), ArrowUp: () => (hayResultados ? mover(-1) : false) };
}

// En la caja: las flechas, Enter (agrega o cobra) y Esc (borra lo escrito).
export const teclasDeLaCaja = (flechas: TablaDeTeclas, alEnter: () => void, consulta: string, limpiar: () => void) =>
  (e: KeyboardEvent<HTMLInputElement>) => teclearCon({ ...flechas, Enter: alEnter, Escape: () => (consulta ? limpiar() : false) }, e);

// Las flechas y Esc también sin el cursor en la búsqueda (salvo dentro de otro campo): Esc vuelve a ella.
export function useFlechasFueraDeLaCaja(flechas: TablaDeTeclas, caja: RefObject<HTMLInputElement>, activas: boolean) {
  useTeclasGlobales(useCallback((e: globalThis.KeyboardEvent) => {
    if (document.activeElement === caja.current || !activas) return;
    teclearCon({ ...flechas, Escape: () => { caja.current?.focus(); return false; } }, e);
  }, [flechas, caja, activas]), caja.current);
}
