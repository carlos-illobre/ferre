import { useEffect, useState } from "react";
import { cambiarPreferencia, usePreferencias } from "../preferencias";
import "./configuracion.css";

// Configuración (RF-80, decisión 79): las preferencias de la aplicación en este dispositivo.
// Una sola pantalla para el celular y la computadora; cada preferencia es un renglón con su
// llave y una línea que dice qué cambia. La primera: las animaciones.
function useReducirMovimiento(): boolean {
  const consulta = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const [pedido, setPedido] = useState(consulta?.matches ?? false);
  useEffect(() => {
    if (!consulta) return;
    const alCambiar = () => setPedido(consulta.matches);
    consulta.addEventListener?.("change", alCambiar);
    return () => consulta.removeEventListener?.("change", alCambiar);
  }, [consulta]);
  return pedido;
}

export function Configuracion({ celular = false }: { celular?: boolean }) {
  const { animaciones } = usePreferencias();
  const reducir = useReducirMovimiento();
  const donde = celular ? "este celular" : "esta computadora";
  return (
    <main id="contenido" className={celular ? "contenido cfg" : "pagina cfg"} tabIndex={-1} data-testid="configuracion">
      <header className={celular ? "encabezado" : "pagina-cabeza"}>
        <h1 className={celular ? "titulo" : undefined}>Configuración</h1>
        <p className={celular ? "cfg-bajada" : "bajada"}>Cómo se comporta la aplicación en {donde}.</p>
      </header>
      <ul className="cfg-lista">
        <li className="cfg-fila">
          <span className="cfg-nombre" id="cfg-animaciones">Animaciones</span>
          <button type="button" role="switch" aria-checked={animaciones} aria-labelledby="cfg-animaciones" aria-describedby="cfg-animaciones-detalle"
            className={`cfg-llave ${animaciones ? "si" : ""}`} onClick={() => cambiarPreferencia("animaciones", !animaciones)} data-testid="cfg-animaciones" />
          <span className="cfg-detalle" id="cfg-animaciones-detalle">
            {animaciones
              ? (celular ? "Las pantallas se deslizan al navegar, como en una aplicación de iPhone" : "Las ventanas y los avisos aparecen con movimiento")
              : (celular ? "Las pantallas cambian en el acto, sin moverse" : "Las ventanas y los avisos aparecen en el acto, sin moverse")}
          </span>
          {reducir && animaciones && <span className="cfg-detalle cfg-aviso" data-testid="cfg-reducir-movimiento">Este dispositivo tiene pedido «reducir movimiento»: no se anima igual, hasta que lo cambies en sus ajustes.</span>}
        </li>
      </ul>
      <p className="cfg-nota">Se guarda en {donde}. No cambia nada en los demás dispositivos.</p>
    </main>
  );
}
