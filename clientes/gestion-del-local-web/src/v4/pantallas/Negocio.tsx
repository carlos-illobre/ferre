import { useEffect, useState, type ReactNode } from "react";
import { urlApi } from "../../api";
import { useConexion } from "../conexion";
import { dia, hora, MEDIOS_DE_PAGO, pesos } from "../formato";
import { Aviso, Boton, clases, Icono, Iniciales, Pagina, Tarjeta, tonoDe } from "../piezas";
import { ir } from "../rutas";
import { cuantos, deClave, diaConSemana, useCarga, type Carga } from "./negocio-comun";
import "../estilos/negocio.css";

// Cómo va el negocio: lo vendido hoy y por qué medio, lo comprado en la semana y lo que
// preguntaron y no llevaron. Cada bloque carga, falla y se reintenta por su cuenta.

type VentasDeHoy = { ventas: { id: string; estado: string }[]; totales: Record<string, number>; total: number };
type ComprasDeLaSemana = { desde: string; por_proveedor: { proveedor: string; compras: string; total: string }[]; total: number };
type Consulta = { id: string; fecha: string; descripcion: string; precio_ofrecido: string | null };
type Preguntado = { que: string; veces: number; precio: string | null };

const CUANTAS_CONSULTAS = 5;

/** Junta lo mismo preguntado varias veces y ordena de lo más preguntado a lo menos. */
function juntarConsultas(consultas: Consulta[]): Preguntado[] {
  // Las más nuevas vienen primero: de lo repetido queda el último precio ofrecido.
  const juntas = new Map<string, Preguntado>();
  for (const c of consultas) {
    const clave = c.descripcion.trim().toLowerCase();
    const antes = juntas.get(clave);
    juntas.set(clave, antes ? { ...antes, veces: antes.veces + 1, precio: antes.precio ?? c.precio_ofrecido } : { que: c.descripcion.trim(), veces: 1, precio: c.precio_ofrecido });
  }
  return [...juntas.values()].sort((a, b) => b.veces - a.veces);
}

export function Negocio() {
  const { enLinea } = useConexion();
  const ventas = useCarga<VentasDeHoy>("/ventas");
  const compras = useCarga<ComprasDeLaSemana>("/compras/semana");
  const consultas = useCarga<Consulta[]>("/consultas");

  const hoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const confirmadas = ventas.datos?.ventas.filter((v) => v.estado === "confirmada").length ?? 0;
  const anuladas = ventas.datos ? ventas.datos.ventas.length - confirmadas : 0;
  const preguntado = juntarConsultas(consultas.datos ?? []);
  const elResto = preguntado.slice(CUANTAS_CONSULTAS);
  const llegaron = [ventas.cuando, compras.cuando, consultas.cuando].filter((c): c is Date => c !== null).sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <Pagina titulo="Cómo va el negocio" testId="resumen">
      {!enLinea && (
        <div className="negocio__aviso">
          {llegaron ? (
            <Aviso tipo="alerta" titulo="Sin conexión: estos números pueden estar viejos" testId="resumen-sin-conexion">
              Son los que llegaron hasta las {hora(llegaron)}. Se actualizan solos cuando vuelva internet.
            </Aviso>
          ) : (
            <Aviso tipo="alerta" titulo="Sin conexión" testId="resumen-sin-conexion">Los números se ven solos cuando vuelva internet.</Aviso>
          )}
        </div>
      )}

      <div className="negocio">
        {/* ---- 1. Lo vendido hoy ---- */}
        <Tarjeta variante="verde" className="negocio__hoy" aria-labelledby="negocio-hoy" data-testid="resumen-hoy">
          <Cabeza id="negocio-hoy" titulo="Vendido hoy" detalle={hoy} />
          <Cuerpo carga={ventas} queEs="las ventas de hoy" sobreVerde>
            {ventas.datos && (
              <>
                <p className="negocio__total cifra" data-testid="vendido-hoy">{pesos(ventas.datos.total)}</p>
                {ventas.datos.ventas.length === 0 ? (
                  <p className="negocio__nada">Todavía no se registraron ventas en el día.</p>
                ) : (
                  <>
                    <p className="negocio__cuantas" data-testid="cuantas-ventas">
                      {cuantos(confirmadas, "venta", "ventas")}
                      {anuladas > 0 && ` · ${cuantos(anuladas, "anulada", "anuladas")}, que no ${anuladas === 1 ? "suma" : "suman"}`}
                    </p>
                    <dl className="negocio__medios">
                      {MEDIOS_DE_PAGO.map((m) => {
                        const importe = ventas.datos?.totales[m.clave] ?? 0;
                        return (
                          <div key={m.clave} className={clases(importe === 0 && "negocio__medio--en-cero")} data-testid={`medio-${m.clave}`}>
                            <dt>{m.nombre}</dt>
                            <dd className="cifra">{pesos(importe)}</dd>
                          </div>
                        );
                      })}
                    </dl>
                    <Boton iconoFinal="flecha" className="negocio__ver" onClick={() => ir("ventas")} data-testid="ver-ventas">Ver las ventas del día</Boton>
                  </>
                )}
              </>
            )}
          </Cuerpo>
        </Tarjeta>

        {/* ---- 2. Lo gastado en compras esta semana ---- */}
        <Tarjeta className="negocio__bloque" aria-labelledby="negocio-compras" data-testid="gastos-semana">
          <Cabeza id="negocio-compras" titulo="Compras de esta semana" detalle={compras.datos ? `Desde el ${diaConSemana(deClave(compras.datos.desde)).split(" ")[0]} ${dia(compras.datos.desde)}` : "Los últimos siete días"}>
            {compras.datos && <strong className="negocio__total negocio__total--chico cifra" data-testid="comprado">{pesos(compras.datos.total)}</strong>}
          </Cabeza>
          <Cuerpo carga={compras} queEs="las compras">
            {compras.datos && (compras.datos.por_proveedor.length === 0 ? (
              <p className="negocio__nada">En la semana no se registraron compras.</p>
            ) : (
              <ul className="negocio__lista">
                {compras.datos.por_proveedor.map((p) => (
                  <li key={p.proveedor} data-testid="proveedor">
                    <Iniciales nombre={p.proveedor} tono={tonoDe(p.proveedor)} forma="cuadrada" />
                    <span className="negocio__renglon-texto">
                      <strong>{p.proveedor}</strong>
                      <span>{cuantos(Number(p.compras), "compra", "compras")}</span>
                    </span>
                    <strong className="cifra negocio__importe">{pesos(p.total)}</strong>
                  </li>
                ))}
              </ul>
            ))}
          </Cuerpo>
        </Tarjeta>

        {/* ---- 3. Lo que preguntaron y no llevaron ---- */}
        <Tarjeta className="negocio__bloque" aria-labelledby="negocio-consultas" data-testid="consultas">
          <Cabeza id="negocio-consultas" titulo="Preguntaron y no llevaron" detalle="Lo que se anotó con «No llevó» al vender" />
          <Cuerpo carga={consultas} queEs="lo que no llevaron">
            {preguntado.length === 0 ? (
              <p className="negocio__nada">Nadie preguntó por algo que después no llevó.</p>
            ) : (
              <ul className="negocio__lista">
                {preguntado.slice(0, CUANTAS_CONSULTAS).map((c) => (
                  <li key={c.que} data-testid="consulta">
                    <span className="negocio__renglon-texto">
                      <strong>{c.que}</strong>
                      <span>{c.precio === null ? "No tenía precio" : `Se le ofreció a ${pesos(c.precio)}`}</span>
                    </span>
                    <span className="negocio__veces">{cuantos(c.veces, "vez", "veces")}</span>
                  </li>
                ))}
              </ul>
            )}
            {elResto.length > 0 && (
              <p className="negocio__mas">
                Y {cuantos(elResto.length, "producto", "productos")} más{!elResto.every((c) => c.veces === 1) ? "" : elResto.length === 1 ? ", de una vez" : ", de una vez cada uno"}.
              </p>
            )}
          </Cuerpo>
        </Tarjeta>
      </div>

      <EstadoDelServidor />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Partes de un bloque

function Cabeza({ id, titulo, detalle, children }: { id: string; titulo: string; detalle: string; /** La cifra del bloque, a la derecha del título. */ children?: ReactNode }) {
  return (
    <header className="negocio__cabeza">
      <div>
        <h2 id={id}>{titulo}</h2>
        <p>{detalle}</p>
      </div>
      {children}
    </header>
  );
}

type PropsDeCuerpo = {
  carga: Carga<unknown>;
  /** Para el mensaje de error: «las compras». */
  queEs: string;
  sobreVerde?: boolean;
  children: ReactNode;
};

/** El contenido de un bloque, o su «cargando», o su error con «Reintentar»: cada bloque por separado. */
function Cuerpo({ carga, queEs, sobreVerde, children }: PropsDeCuerpo) {
  if (carga.datos === null && carga.error === null) {
    return (
      <div className={clases("negocio__cargando", sobreVerde && "negocio__cargando--verde")} role="status">
        <span className="solo-lectores">Cargando {queEs}…</span>
        <span className="negocio__hueso negocio__hueso--cifra" />
        <span className="negocio__hueso" />
        <span className="negocio__hueso negocio__hueso--corto" />
      </div>
    );
  }
  if (carga.error !== null) {
    return (
      <div className={clases("negocio__falla", sobreVerde && "negocio__falla--verde")} role="alert" data-testid="error-de-bloque">
        <span className="negocio__falla-icono"><Icono nombre="alerta" tam={22} /></span>
        <p><strong>No se pudieron cargar {queEs}</strong><span>{carga.error}</span></p>
        <Boton tam="chico" icono="deshacer" disabled={carga.cargando} onClick={carga.recargar} data-testid="reintentar">Reintentar</Boton>
      </div>
    );
  }
  return <>{children}</>;
}

// Si el servidor responde: se pregunta sin sesión, así que sirve también cuando algo anda mal.
function EstadoDelServidor() {
  const { enLinea } = useConexion();
  const [estado, setEstado] = useState<{ texto: string; bien: boolean | null }>({ texto: "Consultando el servidor…", bien: null });
  useEffect(() => {
    let vigente = true;
    fetch(urlApi("/health"))
      .then((r) => r.json() as Promise<{ ok: boolean; db: string }>)
      .then((s) => { if (vigente) setEstado({ texto: `Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`, bien: s.ok && s.db === "ok" }); })
      .catch(() => { if (vigente) setEstado({ texto: "Sin conexión con el servidor.", bien: false }); });
    return () => { vigente = false; };
  }, [enLinea]);
  return (
    <p className={clases("negocio__servidor", estado.bien === false && "negocio__servidor--mal")}>
      <Icono nombre={estado.bien === false ? "alerta" : "conexion"} tam={16} />
      <span data-testid="estado">{estado.texto}</span>
    </p>
  );
}
