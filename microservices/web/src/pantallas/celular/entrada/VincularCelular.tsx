import { useSesion, useVincularConCodigo } from "../../../negocio/entrada";
import { irA } from "../rutas";
import { AvisoError } from "../componentes/base";
import { BotonGoogle } from "./BotonesDeEntrada";

const explicar = (e: Error) => e.message;

// Se abre en el celular al leer el QR que la computadora muestra en Vender: los empareja y vuelve a vender.
export function VincularCelular({ codigo }: { codigo: string }) {
  const { sesion } = useSesion();
  const v = useVincularConCodigo(codigo, sesion.estado === "con-sesion", explicar);
  if (sesion.estado === "cargando") return <main className="pantalla-centrada"><p>Cargando…</p></main>;
  if (sesion.estado !== "con-sesion") {
    return (
      <main className="entrar">
        <div className="arriba">
          <div className="logo">fe</div>
          <h1>Usar este celular para escanear</h1>
          <p className="lema">Entrá con tu cuenta de Google y este celular queda vinculado a la computadora.</p>
        </div>
        <div className="abajo"><BotonGoogle /></div>
      </main>
    );
  }
  return (
    <main className="pantalla-centrada">
      <h1>Vincular celular</h1>
      {v.resultado && <p role="status" data-testid="vinculacion-ok">Listo: este celular quedó vinculado a {v.resultado.nombre ?? "la computadora"}. Lo que escanees le llega, y si te pide una foto te aparece acá.</p>}
      <AvisoError texto={v.error} />
      {(v.resultado || v.error) && <button type="button" className="boton tinta" onClick={() => irA("vender")}>Ir a vender</button>}
    </main>
  );
}
