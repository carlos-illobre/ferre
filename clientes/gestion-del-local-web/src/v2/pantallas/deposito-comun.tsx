import { useEffect, useId, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { ErrorApi } from "../../api";
import type { Producto } from "../../pantallas/Productos";
import { Buscador, numero } from "../ui";
import "../estilos/deposito-comun.css";

// Lo que comparten Stock, Compras y Contar: el buscador de productos que se maneja con
// flechas y Enter, y las pocas cuentas y palabras que las tres escriben igual.
export type { Producto };

export const detalleDe = (p: Pick<Producto, "marca" | "proveedor">) => [p.marca, p.proveedor].filter(Boolean).join(" · ");
export const nombreUnidad = (u: string) => (u === "unidad" ? "u." : u);
// Diferencia con su signo; «=» cuando coincide.
export const conSigno = (n: number) => (n === 0 ? "=" : `${n > 0 ? "+" : "−"}${numero(Math.abs(n))}`);
// Un error del servidor ya viene en castellano; cualquier otro es que no hubo conexión.
export const mensajeDe = (e: unknown, sinConexion: string) => (e instanceof ErrorApi ? e.message : sinConexion);
export const plural = (n: number, uno: string, varios: string) => `${numero(n)} ${n === 1 ? uno : varios}`;

export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  useEffect(() => {
    const si = () => setEnLinea(true);
    const no = () => setEnLinea(false);
    window.addEventListener("online", si);
    window.addEventListener("offline", no);
    return () => { window.removeEventListener("online", si); window.removeEventListener("offline", no); };
  }, []);
  return enLinea;
}

// Busca mientras se escribe. Flechas recorren, Enter elige, Escape limpia. En la computadora
// los resultados flotan debajo de la caja; en el celular empujan lo que sigue.
export function BuscadorDeProducto({ consulta, alCambiar, resultados, alElegir, alCrear, alEscanear, aLaDerecha, cajaRef, placeholder, disabled, autoFoco }: {
  consulta: string; alCambiar: (v: string) => void; resultados: Producto[]; alElegir: (p: Producto) => void;
  alCrear?: (descripcion: string) => void; alEscanear?: () => void; aLaDerecha?: (p: Producto) => ReactNode;
  cajaRef?: RefObject<HTMLInputElement>; placeholder: string; disabled?: boolean; autoFoco?: boolean;
}) {
  const [marcado, setMarcado] = useState(0);
  const id = useId();
  useEffect(() => { setMarcado(0); }, [consulta]);
  const texto = consulta.trim();
  const abierta = texto !== "" && !disabled;
  const ofreceCrear = Boolean(alCrear) && abierta && resultados.length === 0;
  const total = resultados.length + (ofreceCrear ? 1 : 0);

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((i) => Math.min(i + 1, total - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const p = resultados[marcado];
      if (p) alElegir(p); else if (ofreceCrear) alCrear?.(texto);
    } else if (e.key === "Escape" && consulta) { e.preventDefault(); alCambiar(""); }
  }

  return (
    <div className="deposito-buscador">
      <Buscador valor={consulta} alCambiar={alCambiar} placeholder={placeholder} disabled={disabled} onKeyDown={teclas} cajaRef={cajaRef} alEscanear={alEscanear} autoFoco={autoFoco}
        controla={abierta && total > 0 ? id : undefined} activo={abierta && total > 0 ? `${id}-${marcado}` : undefined} />
      {abierta && total > 0 && (
        <ul id={id} role="listbox" aria-label="Productos encontrados" className="lista deposito-sugerencias" data-testid="sugerencias">
          {resultados.map((p, i) => (
            // mousedown no saca el foco de la caja: se sigue escribiendo después de elegir.
            <li key={p.id} id={`${id}-${i}`} role="option" aria-selected={i === marcado} className="renglon" onMouseDown={(e) => e.preventDefault()} onClick={() => alElegir(p)}>
              <span className="nombre">{p.descripcion}</span>
              {aLaDerecha?.(p)}
              <span className="detalle">{detalleDe(p) || "Sin marca ni proveedor"}</span>
            </li>
          ))}
          {ofreceCrear && (
            <li id={`${id}-0`} role="option" aria-selected className="renglon" onMouseDown={(e) => e.preventDefault()} onClick={() => alCrear?.(texto)} data-testid="agregar-nuevo">
              <span className="nombre">Agregar «{texto}» como producto nuevo</span>
              <span className="detalle">No está en el catálogo. Le ponés la cantidad y el costo del comprobante.</span>
            </li>
          )}
        </ul>
      )}
      {abierta && total === 0 && <p className="deposito-nada" role="status">Nada con «{texto}». Probá con otra palabra o con el código.</p>}
    </div>
  );
}
