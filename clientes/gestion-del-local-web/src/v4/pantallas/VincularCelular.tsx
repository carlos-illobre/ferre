import { useEffect, useState } from "react";
import { api, ErrorApi } from "../../api";
import { hayHuella } from "../../credenciales";
import { guardarPuestoRemoto } from "../../puesto";
import { useSesion } from "../../sesion";
import { Aviso, Boton, Cargando, Icono } from "../piezas";
import { ir } from "../rutas";
import { BotonGoogle, BotonHuella, PantallaDeCarga } from "./Entrar";
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

// Se abre en el celular al leer el código QR de la computadora: lo vincula por unas horas, y
// desde entonces lo que el celular escanea aparece en la venta de la computadora.
export function VincularCelular({ codigo }: { codigo: string }) {
  const { sesion } = useSesion();
  const [resultado, setResultado] = useState<Vinculado | null>(null);
  const [error, setError] = useState<{ titulo: string; texto: string; reintentable: boolean } | null>(null);
  const [intento, setIntento] = useState(0);
  const [sinAcceso, setSinAcceso] = useState<string | null | undefined>(undefined);
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
        setError(e instanceof ErrorApi
          ? { titulo: "No se pudo vincular", texto: e.message, reintentable: false }
          : { titulo: "Sin conexión", texto: "No se pudo vincular. Revisá internet y probá de nuevo.", reintentable: true });
      });
    return () => { vigente = false; };
  }, [codigo, conSesion, intento]);

  if (sesion.estado === "cargando") return <PantallaDeCarga />;

  if (!conSesion) {
    return (
      <main className="entrar entrar--estado" data-testid="vincular-celular-entrar">
        <section className="entrar__tarjeta entrar__tarjeta--entrar">
          <span className="entrar__circulo"><Icono nombre="escanear" tam={32} /></span>
          <h1>Usar este celular para escanear</h1>
          <p>Primero entrá con tu cuenta: el celular queda vinculado a la computadora, sin más pasos.</p>
          {sinAcceso !== undefined && (
            <Aviso tipo="error" titulo="Todavía no estás autorizado" testId="error-google">
              {sinAcceso ? `${sinAcceso} no tiene acceso a Ferrebress.` : "Esa cuenta no tiene acceso a Ferrebress."} Pedile acceso a un Administrador.
            </Aviso>
          )}
          <BotonGoogle alNoAutorizado={setSinAcceso} />
          {hayHuella() && <BotonHuella />}
        </section>
      </main>
    );
  }

  return (
    <main className="entrar entrar--estado" data-testid="vincular-celular-pagina">
      <section className="entrar__tarjeta">
        {!resultado && !error && <Cargando texto="Vinculando este celular con la computadora…" />}
        {resultado && (
          <>
            <span className="entrar__circulo entrar__circulo--bien"><Icono nombre="tilde" tam={34} grosor={2.4} /></span>
            <h1>Celular vinculado</h1>
            <p role="status" data-testid="vinculacion-ok">Quedó vinculado a <strong>{resultado.nombre ?? "la computadora"}</strong> por {resultado.horas} horas. Lo que escanees acá aparece en la venta de allá.</p>
          </>
        )}
        {error && (
          <>
            <span className="entrar__circulo entrar__circulo--alerta"><Icono nombre="alerta" tam={32} /></span>
            <h1>{error.titulo}</h1>
            <p role="alert" data-testid="vinculacion-error">{error.texto}</p>
            {error.reintentable && <Boton ancho icono="deshacer" onClick={() => setIntento((n) => n + 1)}>Probar de nuevo</Boton>}
          </>
        )}
        {(resultado || error) && <Boton variante="principal" tam="grande" ancho icono="vender" autoFocus onClick={() => ir("vender")} data-testid="ir-a-vender">Ir a vender</Boton>}
      </section>
    </main>
  );
}
