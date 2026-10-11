import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cambiarParametro, useEsCelular, useEstadoDeMaqueta } from "../ruta";
import { Icono } from "./Icono";

export type EstadoDeMaqueta = { clave: string; nombre: string };

/**
 * Andamiaje de la maqueta: el control «Maqueta: ver estado». Cada pantalla le pasa su lista
 * (la primera clave es "normal") y lee lo elegido con `useEstadoDeMaqueta()`. El estado viaja
 * en la dirección (#/vender?estado=sin-precio), así se puede enlazar y capturar.
 * En la computadora flota en el centro del encabezado. En el celular va dentro de la franja
 * «Ambiente de prueba» (arriba, se va al desplazar): así no tapa contenido ni acciones.
 */
export function EstadosDeMaqueta({ estados, sinMenu = false }: { estados: EstadoDeMaqueta[]; /** Para pantallas sin menú lateral (Entrar). */ sinMenu?: boolean }) {
  const elegido = useEstadoDeMaqueta();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const esCelular = useEsCelular();
  const [franja, setFranja] = useState<HTMLElement | null>(null);
  useEffect(() => { setFranja(esCelular ? document.getElementById("lugar-de-maqueta") : null); }, [esCelular]);
  const actual = estados.find((e) => e.clave === elegido) ?? estados[0];

  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", afuera); document.removeEventListener("keydown", tecla); };
  }, [abierto]);

  if (!actual) return null;
  const control = (
    <div className={franja ? "maqueta maqueta--en-franja" : sinMenu ? "maqueta maqueta--sin-menu" : "maqueta"} ref={caja}>
      {abierto && (
        <ul className="maqueta__lista">
          {estados.map((e) => (
            <li key={e.clave}>
              <button type="button" aria-current={e.clave === actual.clave ? "true" : undefined} onClick={() => { cambiarParametro("estado", e.clave === "normal" ? null : e.clave); setAbierto(false); }}>
                {e.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="maqueta__boton" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <Icono nombre="maqueta" tam={16} />
        <span className="maqueta__rotulo">Maqueta: ver estado</span>
        <span className="maqueta__corto">Maqueta</span>
        <strong>{actual.nombre}</strong>
      </button>
    </div>
  );
  return franja ? createPortal(control, franja) : control;
}
