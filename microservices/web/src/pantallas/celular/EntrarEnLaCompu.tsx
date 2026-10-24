import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../datos/conexion";
import { irA } from "../../rutas";
import { dispositivoId, sincronizarEmparejamiento } from "../../puesto";
import { avisarEnEsteDispositivo } from "../../espejo";
import { Logotipo } from "../Logotipo";
import "./entrar.css";
import type { AprobacionDeCodigo } from "@servidor/sesiones";

// El celular leyó el código de una computadora y ya tiene sesión (RF-76). Si acaba de entrar
// con la huella o con Google, eso fue la confirmación: la computadora entra sola. Si la sesión
// ya estaba abierta, hace falta un toque, porque abrir un enlace no puede alcanzar. Cuando la
// computadora entró, el celular sigue a su pantalla de siempre con un aviso breve; esta pantalla
// queda solo si no entró, para decir por qué (pedido de Carlos del 2026-10-15).
type Estado = "preguntar" | "entrando" | "error";

export function EntrarEnLaCompu({ codigo, automatico, nombre }: { codigo: string; automatico: boolean; nombre: string }) {
  const [estado, setEstado] = useState<Estado>(automatico ? "entrando" : "preguntar");
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(false);
  const dejarEntrar = useCallback(async () => {
    if (pedido.current) return;
    pedido.current = true;
    setEstado("entrando");
    try {
      await api("/sesiones/vinculaciones/aprobar", { method: "POST", body: JSON.stringify({ codigo, dispositivo_id: dispositivoId() } satisfies AprobacionDeCodigo) });
      avisarEnEsteDispositivo(`Listo: la computadora entró como ${nombre}`);
      irA("catalogo");
      // El emparejamiento nace cuando la computadora retira su sesión, un par de segundos después.
      void (async () => { for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 1500)); if ((await sincronizarEmparejamiento())?.comoCelular) break; } })();
    }
    catch (e) { pedido.current = false; setError((e as { estado?: number }).estado ? (e as Error).message : "Sin conexión: para dejar entrar a la computadora hace falta internet."); setEstado("error"); }
  }, [codigo, nombre]);
  useEffect(() => { if (automatico) void dejarEntrar(); }, [automatico, dejarEntrar]);
  const seguir = () => irA("catalogo");

  return (
    <main className="en en-compu-paso" data-testid="entrar-en-la-compu">
      <header className="en-marca"><h1><Logotipo sobre="claro" /></h1></header>
      <section className="en-centro">
        {estado === "preguntar" && (
          <>
            <h2>¿Entrar en la computadora?</h2>
            <p>Leíste el código de una computadora. Va a entrar con tu usuario, <strong>{nombre}</strong>.</p>
            <button type="button" className="en-boton naranja" onClick={() => void dejarEntrar()} data-testid="dejar-entrar">Entrar en la computadora</button>
            <button type="button" className="en-boton" onClick={seguir}>Ahora no</button>
          </>
        )}
        {estado === "entrando" && <><h2>Entrando en la computadora…</h2><p>Un momento.</p></>}
        {estado === "error" && (
          <>
            <h2>La computadora no entró</h2>
            <p role="alert" data-testid="compu-no-entro">{error}</p>
            <button type="button" className="en-boton verde" onClick={seguir}>Seguir en el celular</button>
          </>
        )}
      </section>
    </main>
  );
}
