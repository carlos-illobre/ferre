import { useEffect, useState } from "react";
import { cambiarPreferencia, usePreferencias } from "../preferencias";
import { borrarLoGuardado } from "../almacen";
import { pendientes } from "../cola";
import { esCelularAca } from "../guardado";
import "./configuracion.css";

// Configuración (RF-83, decisión 79): las preferencias de la aplicación en este dispositivo.
// Una sola pantalla para el celular y la computadora; cada preferencia es un renglón con su
// llave y una línea que dice qué cambia. La primera: las animaciones.
// Las dos formas de buscar productos cuando el celular no guarda el catálogo (RF-85), cada una
// con lo que tiene de bueno y de malo.
const FORMAS_DE_BUSCAR: { valor: "memoria" | "servidor"; nombre: string; ventaja: string; desventaja: string }[] = [
  { valor: "memoria", nombre: "Bajar el catálogo al abrir", ventaja: "la búsqueda es instantánea y escanear responde en el acto.", desventaja: "abrir la aplicación tarda unos segundos más y gasta datos cada vez." },
  { valor: "servidor", nombre: "Buscar en el servidor", ventaja: "no baja el catálogo: abre enseguida y casi no gasta datos.", desventaja: "cada búsqueda y cada código escaneado espera a la red." },
];

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

export function Configuracion({ celular = false, alCambiarElGuardado = () => location.reload() }: { celular?: boolean; alCambiarElGuardado?: () => void }) {
  const { animaciones, sinConexion, buscar } = usePreferencias();
  // Trabajar sin conexión (RF-84): solo en el celular. Cambiarlo vuelve a abrir la aplicación,
  // para que arranque guardando todo o sin guardar nada. Deshabilitarlo borra lo guardado; si
  // había cambios sin enviar se pierden, y antes se avisa.
  async function cambiarSinConexion() {
    if (sinConexion) {
      const sinEnviar = (await pendientes().catch(() => [])).length;
      const pregunta = sinEnviar > 0
        ? `Hay ${sinEnviar} ${sinEnviar === 1 ? "cambio que todavía no se envió" : "cambios que todavía no se enviaron"} al servidor. Si dejás de guardar en este celular, se ${sinEnviar === 1 ? "pierde" : "pierden"}. ¿Seguir?`
        : "Se va a borrar de este celular el catálogo y lo demás que estaba guardado. ¿Seguir?";
      if (!window.confirm(pregunta)) return;
      cambiarPreferencia("sinConexion", false);
      await borrarLoGuardado();
    } else cambiarPreferencia("sinConexion", true);
    alCambiarElGuardado();
  }
  const reducir = useReducirMovimiento();
  // Las opciones de guardado son del aparato (un teléfono), no de la interfaz que se esté viendo.
  const telefono = esCelularAca();
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
        {telefono && (
          <li className="cfg-fila">
            <span className="cfg-nombre" id="cfg-sin-conexion">Trabajar sin conexión</span>
            <button type="button" role="switch" aria-checked={sinConexion} aria-labelledby="cfg-sin-conexion" aria-describedby="cfg-sin-conexion-detalle"
              className={`cfg-llave ${sinConexion ? "si" : ""}`} onClick={() => void cambiarSinConexion()} data-testid="cfg-sin-conexion" />
            <span className="cfg-detalle" id="cfg-sin-conexion-detalle">
              {sinConexion
                ? "Este celular guarda el catálogo, el stock y lo que falta enviar, para seguir trabajando si se corta internet. Ocupa varios megas."
                : "Este celular no guarda datos del negocio. Si se corta internet, no se puede registrar nada hasta que vuelva."}
            </span>
          </li>
        )}
        {telefono && !sinConexion && (
          <li className="cfg-fila cfg-opciones" role="radiogroup" aria-labelledby="cfg-buscar">
            <span className="cfg-nombre" id="cfg-buscar">Cómo buscar productos</span>
            <span className="cfg-detalle">Como este celular no guarda el catálogo, hay dos formas de buscar. Elegí la que te resulte mejor.</span>
            {FORMAS_DE_BUSCAR.map((f) => (
              <button key={f.valor} type="button" role="radio" aria-checked={buscar === f.valor} className={`cfg-opcion ${buscar === f.valor ? "elegida" : ""}`}
                onClick={() => { if (buscar !== f.valor) { cambiarPreferencia("buscar", f.valor); alCambiarElGuardado(); } }} data-testid={`cfg-buscar-${f.valor}`}>
                <strong>{f.nombre}</strong>
                <span><b>Ventaja:</b> {f.ventaja}</span>
                <span><b>Desventaja:</b> {f.desventaja}</span>
              </button>
            ))}
          </li>
        )}
      </ul>
      <p className="cfg-nota">Se guarda en {donde}. No cambia nada en los demás dispositivos.</p>
    </main>
  );
}
