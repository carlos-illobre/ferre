import { useSesion, useVincularConCodigo } from "../../../negocio/entrada";
import { esFallaDeRed } from "../negocio/negocio-comun";
import { irA } from "../base/rutas";
import { Aviso, Boton, Icono, Progreso } from "../base/ui";
import { BotonGoogle, BotonHuella } from "./BotonesDeEntrada";
import { MarcoDeEntrada } from "./MarcoDeEntrada";
import "../base/estilos/entrar.css";

type ErrorDeVinculo = { texto: string; reintentable: boolean };
const explicar = (e: Error): ErrorDeVinculo => (esFallaDeRed(e)
  ? { texto: "No se pudo vincular: no hay conexión con el servidor. Revisá internet y probá de nuevo.", reintentable: true }
  : { texto: e.message, reintentable: false });

const TITULO = "Usar este celular para escanear";
const BAJADA = "Leíste el código de la computadora del mostrador. Con el celular vinculado, lo que escaneás acá aparece en la venta que se está armando allá.";

// Se abre en el celular al leer el código QR de la computadora: los empareja, y
// desde entonces lo que el celular escanea aparece en la venta de la computadora.
export function VincularCelular({ codigo }: { codigo: string }) {
  const { sesion } = useSesion();
  const conSesion = sesion.estado === "con-sesion";
  const v = useVincularConCodigo(codigo, conSesion, explicar);
  if (sesion.estado === "cargando") return <main className="entrar-cargando" aria-busy="true"><p>Abriendo Ferrebress…</p></main>;
  if (!conSesion) return <PrimeroEntra />;
  return <Vinculando v={v} />;
}

function PrimeroEntra() {
  return (
    <MarcoDeEntrada titulo={TITULO} bajada={BAJADA} testId="vincular-celular-entrar">
      <h2>Primero, entrá</h2>
      <p className="entrar-como">Entrá con tu cuenta y este celular queda vinculado a la computadora, sin más pasos.</p>
      <BotonHuella />
      <BotonGoogle />
    </MarcoDeEntrada>
  );
}

function Vinculando({ v }: { v: ReturnType<typeof useVincularConCodigo<ErrorDeVinculo>> }) {
  return (
    <MarcoDeEntrada titulo={TITULO} bajada={BAJADA} testId="vincular-celular-pagina">
      <h2>Vincular celular</h2>
      {!v.resultado && !v.error && <Progreso texto="Vinculando este celular con la computadora…" />}
      {v.resultado && <Listo nombre={v.resultado.nombre} />}
      <ErrorDelVinculo error={v.error} reintentar={v.reintentar} />
      {(v.resultado || v.error) && <Boton variante="principal" tam="grande" ancho icono="vender" onClick={() => irA("vender")} data-testid="ir-a-vender">Ir a vender</Boton>}
    </MarcoDeEntrada>
  );
}

function Listo({ nombre }: { nombre: string | null | undefined }) {
  return (
    <div className="vincular-resultado">
      <span className="vincular-tilde"><Icono nombre="tilde" tam={36} grosor={3} /></span>
      <p role="status" data-testid="vinculacion-ok">Listo: este celular quedó vinculado a <strong>{nombre ?? "la computadora"}</strong>. Lo que escanees acá aparece allá, y si te pide una foto te aparece acá.</p>
    </div>
  );
}

function ErrorDelVinculo({ error, reintentar }: { error: ErrorDeVinculo | null; reintentar: () => void }) {
  return <Aviso tipo="error" accion={error?.reintentable ? <Boton tam="chico" onClick={reintentar}>Probar de nuevo</Boton> : undefined}>{error?.texto}</Aviso>;
}
