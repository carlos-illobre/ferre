import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Boton } from "./Boton";
import { Icono } from "./iconos";

// La caja de búsqueda con su lupa, la «×» para borrar y, si hay, el botón de escanear. `controla`
// y `activo` la hacen combobox de una lista de resultados (el id de la lista y del marcado).
type Props = {
  valor: string; alCambiar: (v: string) => void; placeholder: string; etiqueta?: string; alEscanear?: () => void; chico?: boolean;
  autoFoco?: boolean; disabled?: boolean; onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void; cajaRef?: RefObject<HTMLInputElement>;
  testId?: string; controla?: string; activo?: string; extra?: ReactNode;
};

// Como autoFocus, pero también al habilitarse (la caja espera deshabilitada a que bajen los datos)
// y sin quitarle el foco a lo que la persona eligió con el teclado (el menú, una pestaña; decisión 82).
function useAutoFoco(caja: RefObject<HTMLInputElement>, autoFoco: boolean | undefined, disabled: boolean | undefined) {
  useLayoutEffect(() => {
    const foco = document.activeElement;
    const eligioOtro = foco instanceof HTMLElement && foco !== document.body && foco.matches(":focus-visible");
    if (autoFoco && !disabled && !eligioOtro) caja.current?.focus();
    // Solo al aparecer y al habilitarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
}

const combobox = (controla?: string, activo?: string) =>
  controla ? { role: "combobox", "aria-controls": controla, "aria-expanded": Boolean(activo), "aria-activedescendant": activo, "aria-autocomplete": "list" as const } : {};

export function Buscador({ valor, alCambiar, placeholder, etiqueta, alEscanear, chico, autoFoco, disabled, onKeyDown, cajaRef, testId = "busqueda", controla, activo, extra }: Props) {
  const propia = useRef<HTMLInputElement>(null);
  const caja = cajaRef ?? propia;
  useAutoFoco(caja, autoFoco, disabled);
  return (
    <div className={`buscador ${chico ? "chico" : ""}`} role="search">
      <div className="buscador-caja">
        <Icono nombre="buscar" tam={chico ? 18 : 22} grosor={2.2} className="lupa" />
        <input ref={caja} type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} aria-label={etiqueta ?? placeholder}
          autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" disabled={disabled} onKeyDown={onKeyDown} data-testid={testId} {...combobox(controla, activo)} />
        {valor && <button type="button" className="borrar" aria-label="Borrar la búsqueda" onClick={() => { alCambiar(""); caja.current?.focus(); }}><Icono nombre="cerrar" tam={18} /></button>}
      </div>
      {alEscanear && <Boton icono="escanear" variante="marino" className="escanear" aria-label="Escanear el código de barras" onClick={alEscanear} data-testid="escanear" />}
      {extra}
    </div>
  );
}
