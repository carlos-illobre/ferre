import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAtrasCierra } from "./atras";

// Una ventana sobre la pantalla: Escape o tocar afuera la cierra.
export function Dialogo({ titulo, children, alCerrar, testId }: { titulo: string; children: ReactNode; alCerrar: () => void; testId?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  useAtrasCierra(alCerrar);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); };
    document.addEventListener("keydown", tecla);
    caja.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    return () => document.removeEventListener("keydown", tecla);
  }, [alCerrar]);
  return (
    <div className="procesos-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div ref={caja} className="procesos-dialogo" role="dialog" aria-modal="true" aria-label={titulo} data-testid={testId}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/** Pedir un nombre (proceso nuevo, cambiar el nombre). */
export function PedirNombre({ titulo, inicial = "", boton, alAceptar, alCerrar }: { titulo: string; inicial?: string; boton: string; alAceptar: (nombre: string) => Promise<unknown>; alCerrar: () => void }) {
  const [nombre, setNombre] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  return (
    <Dialogo titulo={titulo} alCerrar={alCerrar} testId="procesos-pedir-nombre">
      <form onSubmit={async (e) => { e.preventDefault(); setEnviando(true); await alAceptar(nombre); setEnviando(false); }}>
        <label className="procesos-campo">
          <span>Nombre del proceso</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} placeholder="Por ejemplo: Venta en el mostrador" data-testid="procesos-nombre" />
        </label>
        <div className="procesos-botones">
          <button type="button" className="procesos-boton" onClick={alCerrar}>Cancelar</button>
          <button type="submit" className="procesos-boton principal" disabled={enviando || !nombre.trim()} data-testid="procesos-aceptar-nombre">{boton}</button>
        </div>
      </form>
    </Dialogo>
  );
}

/** Lo único que pregunta antes: borrar, porque no se puede recuperar (E20). */
export function ConfirmarBorrar({ nombre, alBorrar, alCerrar }: { nombre: string; alBorrar: () => void; alCerrar: () => void }) {
  return (
    <Dialogo titulo={`¿Borrar «${nombre}»?`} alCerrar={alCerrar} testId="procesos-confirmar-borrar">
      <p>Se borra con todas sus versiones y no se puede recuperar.</p>
      <div className="procesos-botones">
        <button type="button" className="procesos-boton" onClick={alCerrar}>Cancelar</button>
        <button type="button" className="procesos-boton peligro" onClick={alBorrar} data-testid="procesos-si-borrar">Borrar el proceso</button>
      </div>
    </Dialogo>
  );
}
