import { useEffect, useState, type ReactNode } from "react";
import { NOMBRES, TEXTOS } from "../../../textos";
import { usePuede } from "../../../permisos";
import { urlApi } from "../../../../api";
import { esAmbienteDePrueba } from "../../../../ambiente";
import { fecha, pesos } from "../../../../formato";
import { useSesion } from "../../../../sesion";
import { MEDIOS, NOMBRE_DE_MEDIO as NOMBRE_MEDIO } from "../../../../negocio/ventas/venta";
import type { VentasDelDia as DatosHoy } from "../../../../negocio/ventas/ventas-del-dia";
import { irA } from "../rutas";
import { useEsCelular } from "../vista";
import { Aviso, Boton, EstadoDeConexion, Explicado, Icono, Indicador, Pagina, Pastilla, Vacio, pesosCortos, type NombreDeIcono } from "../ui";
import { comoCarga, diaYHora, useEnLinea, type Carga } from "./negocio-comun";
import { useConsultas, useVentasDelDia, type Consulta } from "../../../../negocio/ventas/ventas-del-dia";
import { useGastosDeLaSemana, type Gastos } from "../../../../negocio/compras";
import "../estilos/negocio.css";


const ICONO_MEDIO: Record<string, NombreDeIcono> = { efectivo: "plata", mercado_pago: "celular", tarjeta: "caja", cuenta_corriente: "contar" };
const CONSULTAS_A_LA_VISTA = 6;
const plural = (n: number, uno: string, muchos: string) => `${n.toLocaleString("es-AR")} ${n === 1 ? uno : muchos}`;
const esDeHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

// Cómo va el negocio, en tres secciones con su permiso cada una (decisión 89): Ventas (lo
// vendido, por qué medio y lo que preguntaron y no llevaron), Compras (los gastos de la semana
// y las compras recientes) e Inventario (el dinero invertido). Son pestañas de la opción de
// Más; cada bloque carga por su cuenta y «Actualizar» vuelve a traer los de la sección.
export function ResumenVentas() {
  const enLinea = useEnLinea();
  const hoy = comoCarga(useVentasDelDia(), "No se pudieron traer las ventas de hoy");
  const consultas = comoCarga(useConsultas(), "No se pudieron traer las consultas");
  const hoyTexto = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  const confirmadas = hoy.datos?.ventas.filter((v) => v.estado === "confirmada").length ?? 0;
  const anuladas = hoy.datos ? hoy.datos.ventas.length - confirmadas : 0;
  const deHoy = consultas.datos?.filter((c) => esDeHoy(c.fecha)) ?? [];

  return (
    <SeccionDelNegocio testId="resumen" bajada={`Hoy, ${hoyTexto}. ${TEXTOS.negocio.seccionVentas.largo}`} cargando={hoy.cargando || consultas.cargando} alActualizar={() => { hoy.recargar(); consultas.recargar(); }}>
      <div className="indicadores">
        <Indicador rotulo="Vendido hoy" icono="plata" color="ambar" testId="indicador-vendido"
          valor={<Numero carga={hoy}>{hoy.datos && <Explicado valor={pesosCortos(hoy.datos.total)} etiqueta="Vendido hoy" titulo="De dónde sale lo vendido hoy" pasos={pasosDeVentas(hoy.datos, anuladas)} />}</Numero>}
          detalle={hoy.datos ? (confirmadas === 0 ? "Todavía no se registraron ventas en el día" : "Suma de las ventas confirmadas") : textoDeEspera(hoy, enLinea)} />
        <Indicador rotulo="Ventas de hoy" icono="ventas" testId="indicador-ventas"
          valor={<Numero carga={hoy}>{confirmadas.toLocaleString("es-AR")}</Numero>}
          detalle={hoy.datos ? (anuladas ? `${plural(anuladas, "anulada", "anuladas")}, que no ${anuladas === 1 ? "suma" : "suman"}` : "Ninguna anulada") : textoDeEspera(hoy, enLinea)} />
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
              {MEDIOS.map((m) => {
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
            <Boton icono="ventas" onClick={() => irA("hoy")} data-testid="ver-ventas">Ver las ventas de hoy</Boton>
          </footer>
        </section>

        <NoLlevaron consultas={consultas} deHoy={deHoy.length} />
      </div>
    </SeccionDelNegocio>
  );
}

// Compras: los gastos de la semana con «Ver los gastos» y las compras recientes con «Ver las
// compras». La sección se ve con cualquiera de los dos y muestra lo que cada uno deja.
export function ResumenCompras({ recientes }: { recientes: (vuelta: number) => ReactNode }) {
  const puedeEsto = usePuede();
  const veGastos = puedeEsto("negocio.gastos");
  const [vuelta, setVuelta] = useState(0);
  return (
    <SeccionDelNegocio testId="resumen-compras" bajada={TEXTOS.negocio.seccionCompras.largo} alActualizar={() => setVuelta((v) => v + 1)}>
      {veGastos && <GastosConSuNumero key={`gastos-${vuelta}`} />}
      {puedeEsto("deposito.compras") && recientes(vuelta)}
    </SeccionDelNegocio>
  );
}

function GastosConSuNumero() {
  const enLinea = useEnLinea();
  const gastos = comoCarga(useGastosDeLaSemana(), "No se pudieron traer los gastos de la semana");
  const hasta = gastos.datos ? new Date(new Date(`${gastos.datos.desde}T00:00:00`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10) : null;
  const periodo = gastos.datos ? `del ${fecha(gastos.datos.desde).slice(0, 5)} al ${fecha(hasta).slice(0, 5)}` : "";
  return (
    <>
      <div className="indicadores">
        <Indicador rotulo="Gastos de la semana" icono="compras" testId="indicador-gastos"
          valor={<Numero carga={gastos}>{gastos.datos && <Explicado valor={pesosCortos(gastos.datos.total)} etiqueta="Gastos de la semana" titulo="De dónde salen los gastos de la semana" pasos={pasosDeGastos(gastos.datos, periodo)} />}</Numero>}
          detalle={gastos.datos ? `En compras, ${periodo}` : textoDeEspera(gastos, enLinea)} />
      </div>
      <GastosDeLaSemana gastos={gastos} periodo={periodo} />
    </>
  );
}

// Inventario: el dinero invertido, en total y por proveedor.
export function ResumenInventario({ invertido }: { invertido: (vuelta: number) => ReactNode }) {
  const [vuelta, setVuelta] = useState(0);
  return (
    <SeccionDelNegocio testId="resumen-inventario" bajada={TEXTOS.negocio.seccionInventario.largo} alActualizar={() => setVuelta((v) => v + 1)}>
      {invertido(vuelta)}
    </SeccionDelNegocio>
  );
}

// Lo común a las tres secciones: el título (que con las pestañas a la vista queda solo para
// los lectores de pantalla), «Actualizar», el aviso sin conexión y, al pie, quién entró y
// cómo está el servidor.
function SeccionDelNegocio({ testId, bajada, cargando, alActualizar, children }: { testId: string; bajada: string; cargando?: boolean; alActualizar: () => void; children: ReactNode }) {
  const { sesion } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const enLinea = useEnLinea();
  return (
    <Pagina titulo={NOMBRES.comoVaElNegocio} testId={testId} bajada={bajada} className="negocio-seccion"
      acciones={<Boton icono="repetir" onClick={alActualizar} disabled={!enLinea || cargando} data-testid="actualizar-negocio">Actualizar</Boton>}>
      {!enLinea && <Aviso tipo="alerta" testId="resumen-sin-conexion">Sin conexión: los números se ven cuando vuelva internet. Se actualizan solos.</Aviso>}
      {children}
      <footer className="resumen-pie">
        {usuario && <span>Entraste como <strong data-testid="usuario-negocio">{usuario.nombre}</strong> <span className="detalle">({usuario.email})</span></span>}
        <EstadoDeConexion testId="conexion-negocio" />
        <EstadoDelServidor />
      </footer>
    </Pagina>
  );
}

function pasosDeVentas(d: DatosHoy, anuladas: number): string[] {
  const pasos = MEDIOS.filter((m) => (d.totales[m] ?? 0) > 0).map((m) => `${NOMBRE_MEDIO[m]}: ${pesos(d.totales[m])}`);
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
