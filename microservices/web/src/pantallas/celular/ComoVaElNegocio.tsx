import { useEffect, useState } from "react";
import { irA } from "../../rutas";
import { urlApi } from "../../api";
import { esAmbienteDePrueba } from "../../ambiente";
import { fecha, pesos, pesosCortos } from "../../formato";
import { useSesion } from "../../sesion";
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../negocio/ventas/venta";
import { useConsultas, useVentasDelDia } from "../../negocio/ventas/ventas-del-dia";
import { useGastosDeLaSemana } from "../../negocio/compras";
import { usePuede } from "../permisos";
import { SECCIONES_DE_NEGOCIO, type SeccionDeNegocio } from "../pestanas-de-negocio";
import { NOMBRES } from "../textos";
import { DineroInvertido } from "../DineroInvertido";
import { ComprasRecientes } from "./ComprasRecientes";
import { EstadoDeConexion } from "./componentes/EstadoDeConexion";
import { Lista } from "./componentes/base";
import { Pestanas } from "./Pestanas";

// Más → Cómo va el negocio (decisión 89): las mismas tres secciones que en la computadora, cada
// una con su permiso. La dirección de cada sección en el celular.
export const SUB_DE_SECCION: Record<SeccionDeNegocio, string> = { ventas: "negocio", compras: "gastos", inventario: "invertido" };
const esDeHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function ComoVaElNegocio({ seccion }: { seccion: SeccionDeNegocio }) {
  const puedeEsto = usePuede();
  const visibles = SECCIONES_DE_NEGOCIO.filter((s) => puedeEsto(...s.pide));
  const actual = SECCIONES_DE_NEGOCIO.find((s) => s.valor === seccion)!;
  return (
    <main className="contenido" data-testid={`negocio-${seccion}`}>
      <div className="encabezado">
        <h1 className="titulo">{NOMBRES.comoVaElNegocio}</h1>
        {visibles.length > 1 && <Pestanas opciones={visibles.map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.icono }))} actual={seccion} alElegir={(v) => irA(`mas/${SUB_DE_SECCION[v]}`)} />}
        <p className="bajada-de-pestana" data-testid="bajada-de-pestana">{actual.bajada.corto}</p>
      </div>
      {seccion === "ventas" ? <Ventas /> : seccion === "compras" ? <Compras /> : <DineroInvertido />}
      <QuienYDesdeDonde />
    </main>
  );
}

function Ventas() {
  const hoy = useVentasDelDia().datos;
  const consultas = useConsultas().datos;
  const confirmadas = hoy?.ventas.filter((v) => v.estado === "confirmada").length ?? 0;
  const deHoy = consultas?.filter((c) => esDeHoy(c.fecha)) ?? [];
  return (
    <>
      <div className="numeros-del-negocio">
        <Numero rotulo="Vendido hoy" valor={hoy ? pesosCortos(hoy.total) : null} testId="numero-vendido" />
        <Numero rotulo="Ventas de hoy" valor={hoy ? confirmadas.toLocaleString("es-AR") : null} testId="numero-ventas" />
        <Numero rotulo="No llevaron hoy" valor={consultas ? deHoy.length.toLocaleString("es-AR") : null} rojo={deHoy.length > 0} testId="numero-consultas" />
      </div>
      {hoy ? (
        <div className="tarjeta" data-testid="resumen-hoy">
          <h2 className="tarjeta-titulo"><span>Por medio de pago</span><span className="importe">{pesosCortos(hoy.total)}</span></h2>
          {MEDIOS.map((m) => {
            const importe = hoy.totales[m] ?? 0;
            const parte = hoy.total > 0 ? importe / hoy.total : 0;
            return (
              <div key={m} className="medio-de-pago" data-testid={`medio-${m}`}>
                <span>{NOMBRE_DE_MEDIO[m]}</span>
                <strong className="importe">{pesosCortos(importe)} · {Math.round(parte * 100)} %</strong>
                <span className="medio-barra" aria-hidden="true"><i style={{ width: `${Math.round(parte * 100)}%` }} /></span>
              </div>
            );
          })}
          <small>{confirmadas} {confirmadas === 1 ? "venta" : "ventas"} en el día</small>
        </div>
      ) : <div className="aviso-suave">Sin conexión: las ventas de hoy se ven cuando vuelva internet.</div>}
      <h2 className="seccion" data-testid="consultas"><span>Preguntaron y no llevaron</span>{consultas && <span className="suave">{deHoy.length} hoy</span>}</h2>
      {consultas && consultas.length === 0 && <div className="aviso-suave">Todavía no hay consultas anotadas. Cuando alguien pregunta un precio y no compra, tocá «No llevó» en Vender.</div>}
      {consultas && consultas.length > 0 && (
        <Lista>
          {consultas.slice(0, 6).map((c) => (
            <div key={c.id} className="fila" data-testid="consulta">
              <span className="nombre">{c.descripcion}</span>
              <strong className="derecha importe">{c.precio_ofrecido ? pesosCortos(c.precio_ofrecido) : "—"}</strong>
              <span className="detalle">{esDeHoy(c.fecha) ? hora(c.fecha) : fecha(c.fecha)}{c.motivo ? ` · ${c.motivo}` : ""}</span>
            </div>
          ))}
        </Lista>
      )}
    </>
  );
}

// Compras: los gastos con «Ver los gastos» y las compras recientes con «Ver las compras».
function Compras() {
  const puedeEsto = usePuede();
  return (
    <>
      {puedeEsto("negocio.gastos") && <GastosDeLaSemana />}
      {puedeEsto("deposito.compras") && <ComprasRecientes soloVer />}
    </>
  );
}

function GastosDeLaSemana() {
  const gastos = useGastosDeLaSemana().datos;
  return (
    <>
      <div className="numeros-del-negocio">
        <Numero rotulo={NOMBRES.gastosDeLaSemana} valor={gastos ? pesosCortos(gastos.total) : null} testId="numero-gastos" ancho />
      </div>
      <h2 className="seccion" data-testid="gastos-semana"><span>{NOMBRES.gastosDeLaSemana}</span>{gastos && <span className="importe" style={{ fontSize: 16 }}>{pesosCortos(gastos.total)}</span>}</h2>
      {!gastos && <div className="aviso-suave">Sin conexión: los gastos se ven cuando vuelva internet.</div>}
      {gastos && gastos.por_proveedor.length === 0 && <div className="aviso-suave">En la semana no se registraron compras.</div>}
      {gastos && gastos.por_proveedor.length > 0 && (
        <Lista>
          {gastos.por_proveedor.map((g) => (
            <div key={g.proveedor} className="fila">
              <span className="nombre">{g.proveedor}</span>
              <strong className="derecha importe">{pesos(g.total)}</strong>
              <span className="detalle">{g.compras} {Number(g.compras) === 1 ? "compra" : "compras"} desde el {fecha(gastos.desde)}</span>
            </div>
          ))}
        </Lista>
      )}
    </>
  );
}

function Numero({ rotulo, valor, rojo, ancho, testId }: { rotulo: string; valor: string | null; rojo?: boolean; ancho?: boolean; testId: string }) {
  return (
    <div className={`tarjeta numero-del-negocio ${ancho ? "ancho" : ""}`} data-testid={testId}>
      <small>{rotulo}</small>
      <strong className={`importe ${rojo ? "rojo" : ""}`}>{valor ?? "—"}</strong>
    </div>
  );
}

// Quién entró, la conexión y el servidor: van al pie de cualquier sección.
function QuienYDesdeDonde() {
  const { sesion, salir } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const [servidor, setServidor] = useState<string | null>(null);
  useEffect(() => {
    fetch(urlApi("/health")).then((r) => r.json() as Promise<{ ok: boolean; db: string }>).then((s) => setServidor(`Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`)).catch(() => setServidor("Sin conexión con el servidor."));
  }, []);
  return (
    <>
      {usuario && (
        <div className="tarjeta usuario-actual">
          <div className="avatar">{usuario.nombre.charAt(0).toUpperCase()}</div>
          <div className="textos">
            <strong data-testid="usuario-negocio">{usuario.nombre}</strong>
            <small>{(usuario.roles ?? []).join(", ") || "sin roles"} · <EstadoDeConexion testId="conexion-negocio" /></small>
          </div>
          <button type="button" className="boton chico solo-celular" style={{ height: 34, fontSize: 13, borderRadius: 10 }} onClick={salir}>Salir</button>
        </div>
      )}
      {esAmbienteDePrueba() && <div className="aviso-suave" data-testid="ambiente-negocio">Ambiente de prueba · {servidor ?? "…"} · versión {import.meta.env.VITE_VERSION ?? "local"}</div>}
      {!esAmbienteDePrueba() && servidor && <small style={{ padding: "0 4px" }} data-testid="estado">{servidor}</small>}
    </>
  );
}
