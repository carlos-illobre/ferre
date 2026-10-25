import { useDejarEntrarALaCompu } from "../../../negocio/entrada";
import { irA } from "../rutas";
import { Logotipo } from "../../Logotipo";
import "./entrar.css";

// El celular leyó el código de una computadora y ya tiene sesión (RF-76). Si acaba de entrar
// con la huella o con Google, eso fue la confirmación: la computadora entra sola. Si la sesión
// ya estaba abierta, hace falta un toque, porque abrir un enlace no puede alcanzar. Cuando la
// computadora entró, el celular sigue a su pantalla de siempre con un aviso breve; esta pantalla
// queda solo si no entró, para decir por qué (pedido de Carlos del 2026-10-15).
export function EntrarEnLaCompu({ codigo, automatico, nombre }: { codigo: string; automatico: boolean; nombre: string }) {
  const c = useDejarEntrarALaCompu(codigo, automatico, nombre, () => irA("catalogo"));
  return (
    <main className="en en-compu-paso" data-testid="entrar-en-la-compu">
      <header className="en-marca"><h1><Logotipo sobre="claro" /></h1></header>
      <section className="en-centro">
        {c.estado === "preguntar" && (
          <>
            <h2>¿Entrar en la computadora?</h2>
            <p>Leíste el código de una computadora. Va a entrar con tu usuario, <strong>{nombre}</strong>.</p>
            <button type="button" className="en-boton naranja" onClick={() => void c.dejarEntrar()} data-testid="dejar-entrar">Entrar en la computadora</button>
            <button type="button" className="en-boton" onClick={c.seguir}>Ahora no</button>
          </>
        )}
        {c.estado === "entrando" && <><h2>Entrando en la computadora…</h2><p>Un momento.</p></>}
        {c.estado === "error" && (
          <>
            <h2>La computadora no entró</h2>
            <p role="alert" data-testid="compu-no-entro">{c.error}</p>
            <button type="button" className="en-boton verde" onClick={c.seguir}>Seguir en el celular</button>
          </>
        )}
      </section>
    </main>
  );
}
