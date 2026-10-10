import { useEffect, useState, type ReactNode } from "react";
import { urlApi } from "../../api";
import { esAmbienteDePrueba } from "../../ambiente";
import { fecha, pesos } from "../../formato";
import { useSesion } from "../../sesion";
import { NOMBRE_MEDIO, type DatosDelDia as DatosHoy } from "./VentasDeHoy";
import { irA } from "../rutas";
import { useEsCelular } from "../vista";
import { Aviso, Boton, EstadoDeConexion, Explicado, Icono, Indicador, Pagina, Pastilla, Vacio, pesosCortos, type NombreDeIcono } from "../ui";
import { diaYHora, useCarga, useEnLinea, type Carga } from "./negocio-comun";
import "../estilos/negocio.css";

type Gastos = { desde: string; por_proveedor: { proveedor: string; compras: string; total: string }[]; total: number };
type Consulta = { id: string; fecha: string; descripcion: string; precio_ofrecido: string | null; motivo: string | null };

const ICONO_MEDIO: Record<string, NombreDeIcono> = { efectivo: "plata", mercado_pago: "celular", tarjeta: "caja", cuenta_corriente: "contar" };
const CONSULTAS_A_LA_VISTA = 6;
const plural = (n: number, uno: string, muchos: string) => `${n.toLocaleString("es-AR")} ${n === 1 ? uno : muchos}`;
const esDeHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

// Cómo va el negocio hoy: lo vendido y por qué medio, lo gastado en compras en la semana y
// lo que preguntaron y no llevaron. Cada bloque carga por su cuenta.
export function Resumen() {
  const { sesion } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const enLinea = useEnLinea();
  const hoy = useCarga<DatosHoy>("/ventas", "No se pudieron traer las ventas de hoy");
  const gastos = useCarga<Gastos>("/compras/semana", "No se pudieron traer los gastos de la semana");
  const consultas = useCarga<Consulta[]>("/consultas", "No se pudieron traer las consultas");
  const hoyTexto = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  const confirmadas = hoy.datos?.ventas.filter((v) => v.estado === "confirmada").length ?? 0;
  const anuladas = hoy.datos ? hoy.datos.ventas.length - confirmadas : 0;
  const deHoy = consultas.datos?.filter((c) => esDeHoy(c.fecha)) ?? [];
  const hasta = gastos.datos ? new Date(new Date(`${gastos.datos.desde}T00:00:00`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10) : null;
  const periodo = gastos.datos ? `del ${fecha(gastos.datos.desde).slice(0, 5)} al ${fecha(hasta).slice(0, 5)}` : "";

  function actualizar() { hoy.recargar(); gastos.recargar(); consultas.recargar(); }

  return (
    <Pagina titulo="Resumen" testId="resumen" bajada={`Cómo va el negocio hoy, ${hoyTexto}.`}
      acciones={<Boton icono="repetir" onClick={actualizar} disabled={!enLinea || hoy.cargando || gastos.cargando || consultas.cargando}>Actualizar</Boton>}>
      {!enLinea && <Aviso tipo="alerta" testId="resumen-sin-conexion">Sin conexión: los números se ven cuando vuelva internet. Se actualizan solos.</Aviso>}

      <div className="indicadores">
        <Indicador rotulo="Vendido hoy" icono="plata" color="ambar" testId="indicador-vendido"
          valor={<Numero carga={hoy}>{hoy.datos && <Explicado valor={pesosCortos(hoy.datos.total)} etiqueta="Vendido hoy" titulo="De dónde sale lo vendido hoy" pasos={pasosDeVentas(hoy.datos, anuladas)} />}</Numero>}
          detalle={hoy.datos ? (confirmadas === 0 ? "Todavía no se registraron ventas en el día" : "Suma de las ventas confirmadas") : textoDeEspera(hoy, enLinea)} />
        <Indicador rotulo="Ventas de hoy" icono="ventas" testId="indicador-ventas"
          valor={<Numero carga={hoy}>{confirmadas.toLocaleString("es-AR")}</Numero>}
          detalle={hoy.datos ? (anuladas ? `${plural(anuladas, "anulada", "anuladas")}, que no ${anuladas === 1 ? "suma" : "suman"}` : "Ninguna anulada") : textoDeEspera(hoy, enLinea)} />
        <Indicador rotulo="Gastos de la semana" icono="compras" testId="indicador-gastos"
          valor={<Numero carga={gastos}>{gastos.datos && <Explicado valor={pesosCortos(gastos.datos.total)} etiqueta="Gastos de la semana" titulo="De dónde salen los gastos de la semana" pasos={pasosDeGastos(gastos.datos, periodo)} />}</Numero>}
          detalle={gastos.datos ? `En compras, ${periodo}` : textoDeEspera(gastos, enLinea)} />
        <Indicador rotulo="No llevaron hoy" icono="info" color={deHoy.length ? "rojo" : undefined} testId="indicador-consultas"
          valor={<Numero carga={consultas}>{deHoy.length.toLocaleString("es-AR")}</Numero>}
          detalle={consultas.datos ? (deHoy.length ? "Preguntaron el precio y no compraron" : "Nadie se fue sin comprar") : textoDeEspera(consultas, enLinea)} />
      </div>

      <div className="resumen-columnas">
        <section className="tarjeta negocio-bloque" data-testid="resumen-hoy" aria-labelledby="resumen-medios">
          <header className="negocio-bloque-cabeza">
            <h2 id="resumen-medios">Ventas de hoy por medio de pago</h2>
            {hoy.datos && <span className="importe chico">{pesosCortos(hoy.datos.total)}</span>}
          </header>
          <ErrorDeBloque carga={hoy} />
          {!hoy.datos && !hoy.error && <Esqueleto renglones={4} />}
          {hoy.datos && (
            <ul className="resumen-medios">
              {Object.keys(NOMBRE_MEDIO).map((m) => {
                const importe = hoy.datos!.totales[m] ?? 0;
                const parte = hoy.datos!.total > 0 ? importe / hoy.datos!.total : 0;
                return (
                  <li key={m} data-testid={`medio-${m}`}>
                    <span className="resumen-medio-icono"><Icono nombre={ICONO_MEDIO[m] ?? "plata"} tam={18} /></span>
                    <span className="resumen-medio-nombre">{NOMBRE_MEDIO[m]}</span>
                    <span className="importe chico">{pesosCortos(importe)}</span>
                    <span className="resumen-barra" aria-hidden="true"><i style={{ transform: `scaleX(${parte})` }} /></span>
                    <span className="detalle resumen-parte">{hoy.datos!.total > 0 ? `${Math.round(parte * 100)} %` : "—"}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <footer className="negocio-bloque-pie">
            <span className="detalle">{hoy.datos ? `${plural(confirmadas, "venta", "ventas")} en el día` : ""}</span>
            <Boton icono="ventas" onClick={() => irA("ventas")} data-testid="ver-ventas">Ver las ventas de hoy</Boton>
          </footer>
        </section>

        <GastosDeLaSemana gastos={gastos} periodo={periodo} />
      </div>

      <NoLlevaron consultas={consultas} deHoy={deHoy.length} />

      <footer className="resumen-pie">
        {usuario && <span>Entraste como <strong data-testid="usuario-negocio">{usuario.nombre}</strong> <span className="detalle">({usuario.email})</span></span>}
        <EstadoDeConexion testId="conexion-negocio" />
        <EstadoDelServidor />
      </footer>
    </Pagina>
  );
}

function pasosDeVentas(d: DatosHoy, anuladas: number): string[] {
  const pasos = Object.keys(NOMBRE_MEDIO).filter((m) => (d.totales[m] ?? 0) > 0).map((m) => `${NOMBRE_MEDIO[m]}: ${pesos(d.totales[m])}`);
  if (anuladas) pasos.push(`${plural(anuladas, "venta anulada", "ventas anuladas")}: no ${anuladas === 1 ? "suma" : "suman"}`);
  if (!pasos.length) pasos.push("Todavía no se registraron ventas en el día");
  return [...pasos, `Vendido hoy: ${pesos(d.total)}`];
}

function pasosDeGastos(g: Gastos, periodo: string): string[] {
  const pasos = g.por_proveedor.map((p) => `${p.proveedor}, ${plural(Number(p.compras), "compra", "compras")}: ${pesos(p.total)}`);
  if (!pasos.length) pasos.push("En la semana no se registraron compras");
  return [...pasos, `Gastos de la semana (${periodo}): ${pesos(g.total)}`];
}

const textoDeEspera = (c: Carga<unknown>, enLinea: boolean) => (c.error ? (enLinea ? "No se pudo cargar" : "Se ve cuando vuelva internet") : "Trayendo el dato…");

// El lugar del número: mientras carga no muestra $0, y si falló lo dice sin moverse de lugar.
function Numero({ carga, children }: { carga: Carga<unknown>; children: ReactNode }) {
  if (carga.datos) return <>{children}</>;
  if (carga.error) return <span className="resumen-sin-dato" aria-label="Sin dato">—</span>;
  return <span className="esqueleto resumen-esqueleto" role="status" aria-label="Cargando" />;
}

function ErrorDeBloque({ carga }: { carga: Carga<unknown> }) {
  return <Aviso tipo="error" accion={<Boton tam="chico" onClick={carga.recargar}>Reintentar</Boton>}>{carga.error}</Aviso>;
}

function Esqueleto({ renglones }: { renglones: number }) {
  return <div className="negocio-esqueleto" role="status" aria-label="Cargando">{Array.from({ length: renglones }, (_, i) => <span key={i} className="esqueleto" />)}</div>;
}

function GastosDeLaSemana({ gastos, periodo }: { gastos: Carga<Gastos>; periodo: string }) {
  const esCelular = useEsCelular();
  const filas = gastos.datos?.por_proveedor ?? [];
  return (
    <section className="tarjeta negocio-bloque" data-testid="gastos-semana" aria-labelledby="resumen-gastos">
      <header className="negocio-bloque-cabeza">
        <h2 id="resumen-gastos">Gastos de la semana</h2>
        {gastos.datos && <span className="importe chico">{pesosCortos(gastos.datos.total)}</span>}
        {gastos.datos && <p className="detalle">Lo comprado a cada proveedor, {periodo}.</p>}
      </header>
      <ErrorDeBloque carga={gastos} />
      {!gastos.datos && !gastos.error && <Esqueleto renglones={3} />}
      {gastos.datos && filas.length === 0 && <p className="negocio-bloque-vacio">En la semana no se registraron compras.</p>}
      {filas.length > 0 && (esCelular ? (
        <ul className="negocio-renglones">
          {filas.map((g) => (
            <li key={g.proveedor} className="renglon">
              <span className="nombre">{g.proveedor}</span>
              <span className="importe chico">{pesosCortos(g.total)}</span>
              <span className="detalle">{plural(Number(g.compras), "compra", "compras")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <table className="tabla negocio-tabla">
          <thead><tr><th scope="col">Proveedor</th><th scope="col" className="num">Compras</th><th scope="col" className="num">Total</th></tr></thead>
          <tbody>
            {filas.map((g) => (
              <tr key={g.proveedor}>
                <td className="nombre">{g.proveedor}</td>
                <td className="num">{Number(g.compras).toLocaleString("es-AR")}</td>
                <td className="num"><span className="importe chico">{pesosCortos(g.total)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </section>
  );
}

// Lo que preguntaron y no compraron: demanda que hoy se pierde. Se anota en Vender con «No llevó».
function NoLlevaron({ consultas, deHoy }: { consultas: Carga<Consulta[]>; deHoy: number }) {
  const esCelular = useEsCelular();
  const [todas, setTodas] = useState(false);
  const lista = consultas.datos ?? [];
  const visibles = todas ? lista : lista.slice(0, CONSULTAS_A_LA_VISTA);
  return (
    <section className="tarjeta negocio-bloque" data-testid="consultas" aria-labelledby="resumen-consultas">
      <header className="negocio-bloque-cabeza">
        <h2 id="resumen-consultas">Preguntaron y no llevaron</h2>
        {consultas.datos && lista.length > 0 && <Pastilla tipo={deHoy ? "alerta" : undefined} sinPunto>{deHoy ? `${deHoy} hoy` : "Ninguna hoy"}</Pastilla>}
        <p className="detalle">Lo que se anota en Vender con «No llevó»: sirve para ver qué falta o qué está caro.</p>
      </header>
      <ErrorDeBloque carga={consultas} />
      {!consultas.datos && !consultas.error && <Esqueleto renglones={3} />}
      {consultas.datos && lista.length === 0 && (
        <Vacio icono="info" titulo="Todavía no hay consultas anotadas">Cuando alguien pregunta un precio y no compra, tocá «No llevó» en Vender y queda anotado acá.</Vacio>
      )}
      {visibles.length > 0 && (esCelular ? (
        <ul className="negocio-renglones">
          {visibles.map((c) => (
            <li key={c.id} className="renglon" data-testid="consulta">
              <span className="nombre">{c.descripcion}</span>
              <span className="importe chico">{c.precio_ofrecido ? pesosCortos(c.precio_ofrecido) : "—"}</span>
              <span className="detalle">{diaYHora(c.fecha)}{c.motivo ? ` · ${c.motivo}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <table className="tabla negocio-tabla">
          <thead><tr><th scope="col" className="angosta">Cuándo</th><th scope="col">Qué preguntaron</th><th scope="col" className="num">Precio que se dijo</th><th scope="col">Motivo</th></tr></thead>
          <tbody>
            {visibles.map((c) => (
              <tr key={c.id} data-testid="consulta">
                <td className="angosta">{diaYHora(c.fecha)}</td>
                <td className="nombre">{c.descripcion}</td>
                <td className="num">{c.precio_ofrecido ? <span className="importe chico">{pesosCortos(c.precio_ofrecido)}</span> : <span className="detalle">Sin precio</span>}</td>
                <td className={c.motivo ? "" : "detalle"}>{c.motivo ?? "No se anotó"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      {lista.length > CONSULTAS_A_LA_VISTA && (
        <footer className="negocio-bloque-pie">
          <span className="detalle">{todas ? `Las últimas ${lista.length}` : `${CONSULTAS_A_LA_VISTA} de ${lista.length}`}</span>
          <Boton aria-expanded={todas} onClick={() => setTodas((t) => !t)}>{todas ? "Ver menos" : `Ver las ${lista.length}`}</Boton>
        </footer>
      )}
    </section>
  );
}

// Si la app responde: se pregunta sin sesión, así que sirve también cuando algo anda mal.
function EstadoDelServidor() {
  const [estado, setEstado] = useState<{ texto: string; bien: boolean | null }>({ texto: "Consultando el servidor…", bien: null });
  useEffect(() => {
    let vigente = true;
    fetch(urlApi("/health"))
      .then((r) => r.json() as Promise<{ ok: boolean; db: string }>)
      .then((s) => { if (vigente) setEstado({ texto: `Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`, bien: s.ok && s.db === "ok" }); })
      .catch(() => { if (vigente) setEstado({ texto: "Sin conexión con el servidor.", bien: false }); });
    return () => { vigente = false; };
  }, []);
  const prueba = esAmbienteDePrueba();
  const version = import.meta.env.VITE_VERSION ?? "local";
  const pastilla = <Pastilla tipo={estado.bien === null ? undefined : estado.bien ? "ok" : "mal"}><span data-testid="estado">{estado.texto}</span></Pastilla>;
  if (!prueba) return pastilla;
  return <span className="resumen-ambiente" data-testid="ambiente-negocio"><span className="detalle">Ambiente de prueba ·</span> {pastilla} <span className="detalle">· versión {version}</span></span>;
}
