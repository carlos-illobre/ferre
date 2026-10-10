import { useEffect, useState } from "react";
import { api } from "../../api";
import { guardarPuestoRemoto } from "../../puesto";
import { useSesion } from "../../sesion";
import { irA } from "../rutas";
import { BotonGoogle, BotonHuella, MarcoDeEntrada } from "./Entrar";
import { esFallaDeRed } from "./negocio-comun";
import { Aviso, Boton, Icono, Progreso } from "../ui";
import "../estilos/entrar.css";

type Vinculado = { id: string; nombre: string | null; horas: number };

// El código de la computadora vale una sola vez: si la pantalla se monta dos veces, el
// segundo pedido lo encontraría usado. Se guarda el pedido en curso de cada código.
const pedidos = new Map<string, Promise<Vinculado>>();
function vincular(codigo: string): Promise<Vinculado> {
  let pedido = pedidos.get(codigo);
  if (!pedido) {
    pedido = api<Vinculado>(`/puestos/${encodeURIComponent(codigo)}/vincular`, { method: "POST" });
    pedidos.set(codigo, pedido);
    pedido.catch(() => pedidos.delete(codigo));
  }
  return pedido;
}

// Se abre en el celular al leer el código QR de la computadora: lo vincula 12 horas, y
// desde entonces lo que el celular escanea aparece en la venta de la computadora.
export function VincularCelular({ codigo }: { codigo: string }) {
  const { sesion } = useSesion();
  const [resultado, setResultado] = useState<Vinculado | null>(null);
  const [error, setError] = useState<{ texto: string; reintentable: boolean } | null>(null);
  const [intento, setIntento] = useState(0);
  const conSesion = sesion.estado === "con-sesion";

  useEffect(() => {
    if (!conSesion) return;
    let vigente = true;
    setError(null);
    vincular(codigo)
      .then((r) => {
        guardarPuestoRemoto({ id: r.id, nombre: r.nombre, expira_en: new Date(Date.now() + r.horas * 3600_000).toISOString() });
        if (vigente) setResultado(r);
      })
      .catch((e: Error) => {
        if (!vigente) return;
        setError(esFallaDeRed(e)
          ? { texto: "No se pudo vincular: no hay conexión con el servidor. Revisá internet y probá de nuevo.", reintentable: true }
          : { texto: e.message, reintentable: false });
      });
    return () => { vigente = false; };
  }, [codigo, conSesion, intento]);

  const titulo = "Usar este celular para escanear";
  const bajada = "Leíste el código de la computadora del mostrador. Con el celular vinculado, lo que escaneás acá aparece en la venta que se está armando allá.";

  if (sesion.estado === "cargando") return <main className="entrar-cargando" aria-busy="true"><p>Abriendo Ferrebress…</p></main>;
  if (!conSesion) {
    return (
      <MarcoDeEntrada titulo={titulo} bajada={bajada} testId="vincular-celular-entrar">
        <h2>Primero, entrá</h2>
        <p className="entrar-como">Entrá con tu cuenta y este celular queda vinculado a la computadora, sin más pasos.</p>
        <BotonHuella />
        <BotonGoogle />
      </MarcoDeEntrada>
    );
  }
  return (
    <MarcoDeEntrada titulo={titulo} bajada={bajada} testId="vincular-celular-pagina">
      <h2>Vincular celular</h2>
      {!resultado && !error && <Progreso texto="Vinculando este celular con la computadora…" />}
      {resultado && (
        <div className="vincular-resultado">
          <span className="vincular-tilde"><Icono nombre="tilde" tam={36} grosor={3} /></span>
          <p role="status" data-testid="vinculacion-ok">Listo: este celular quedó vinculado a <strong>{resultado.nombre ?? "la computadora"}</strong> por {resultado.horas} horas. Lo que escanees acá aparece allá.</p>
        </div>
      )}
      <Aviso tipo="error" accion={error?.reintentable ? <Boton tam="chico" onClick={() => setIntento((n) => n + 1)}>Probar de nuevo</Boton> : undefined}>{error?.texto}</Aviso>
      {(resultado || error) && <Boton variante="principal" tam="grande" ancho icono="vender" onClick={() => irA("vender")} data-testid="ir-a-vender">Ir a vender</Boton>}
    </MarcoDeEntrada>
  );
}
