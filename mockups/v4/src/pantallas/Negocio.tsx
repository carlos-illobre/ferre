import { useEffect, useState, type ReactNode } from "react";
import { totalesDe, useAlmacen } from "../almacen";
import { dia, hora, MEDIOS_DE_PAGO, pesos, totalDeCompra, type Consulta } from "../datos";
import { useConexion } from "../estructura/conexion";
import { Aviso, Boton, clases, Icono, Iniciales, Pagina, Tarjeta, useEstadoDeMaqueta, type EstadoDeMaqueta } from "../piezas";
import { ir } from "../ruta";
import "../estilos/negocio.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "vacio", nombre: "Día sin movimiento" },
  { clave: "cargando", nombre: "Cargando" },
  { clave: "error", nombre: "No se pudo cargar nada" },
  { clave: "error-compras", nombre: "Falla un solo bloque (las compras)" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
];

type Bloque = "ventas" | "compras" | "consultas";
type Situacion = "listo" | "cargando" | "error";

const CUANTAS_CONSULTAS = 5;

/** Junta lo mismo preguntado varias veces y ordena de lo más preguntado a lo menos. */
function juntarConsultas(consultas: Consulta[]): Consulta[] {
  // Las más nuevas vienen primero: de lo repetido queda el último precio ofrecido.
  const juntas = new Map<string, Consulta>();
  for (const c of consultas) {
    const antes = juntas.get(c.que);
    juntas.set(c.que, antes ? { ...antes, veces: antes.veces + c.veces, precio: antes.precio ?? c.precio } : c);
  }
  return [...juntas.values()].sort((a, b) => b.veces - a.veces);
}

function lunesDeEstaSemana(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function cuantos(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

// ---------------------------------------------------------------- Pantalla

export default function Negocio() {
  const estado = useEstadoDeMaqueta();
  const { enLinea } = useConexion();
  const ventasDelAlmacen = useAlmacen((a) => a.ventas);
  const comprasDelAlmacen = useAlmacen((a) => a.compras);
  const consultasDelAlmacen = useAlmacen((a) => a.noLlevaron);
  const proveedores = useAlmacen((a) => a.proveedores);

  // Cada bloque se reintenta por separado: los que ya se reintentaron dejan de fallar.
  const [reintentados, setReintentados] = useState<Bloque[]>([]);
  useEffect(() => setReintentados([]), [estado]);

  function situacionDe(bloque: Bloque): Situacion {
    if (estado === "cargando") return "cargando";
    const falla = estado === "error" || (estado === "error-compras" && bloque === "compras");
    return falla && !reintentados.includes(bloque) ? "error" : "listo";
  }
  const reintentar = (bloque: Bloque) => () => setReintentados((antes) => [...antes, bloque]);

  const sinMovimiento = estado === "vacio";
  const ventas = sinMovimiento ? [] : ventasDelAlmacen;
  const compras = sinMovimiento ? [] : comprasDelAlmacen.filter((c) => !c.anulada);
  const consultas = sinMovimiento ? [] : juntarConsultas(consultasDelAlmacen);

  const totales = totalesDe(ventas);
  const ultimaVenta = ventasDelAlmacen[0]?.cuando;

  const porProveedor = proveedores
    .map((p) => {
      const suyas = compras.filter((c) => c.proveedorId === p.id);
      return { proveedor: p, compras: suyas.length, total: suyas.reduce((suma, c) => suma + totalDeCompra(c), 0) };
    })
    .filter((x) => x.compras > 0)
    .sort((a, b) => b.total - a.total);
  const totalComprado = porProveedor.reduce((suma, x) => suma + x.total, 0);

  const hoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Pagina titulo="Cómo va el negocio" estados={ESTADOS}>
      {!enLinea && (
        <div className="negocio__aviso">
          <Aviso tipo="alerta" titulo="Sin conexión: estos números pueden estar viejos">
            {ultimaVenta ? `Son los que llegaron hasta las ${hora(ultimaVenta)}. ` : ""}Se actualizan solos cuando vuelva internet.
          </Aviso>
        </div>
      )}

      <div className="negocio">
        {/* ---- 1. Lo vendido hoy ---- */}
        <Tarjeta variante="verde" className="negocio__hoy" aria-labelledby="negocio-hoy">
          <Cabeza id="negocio-hoy" titulo="Vendido hoy" detalle={hoy} />
          <Cuerpo situacion={situacionDe("ventas")} queEs="las ventas de hoy" alReintentar={reintentar("ventas")} sobreVerde>
            <p className="negocio__total cifra">{pesos(totales.total)}</p>
            {totales.ventas === 0 ? (
              <p className="negocio__nada">Todavía no se registraron ventas en el día.</p>
            ) : (
              <>
                <p className="negocio__cuantas">
                  {cuantos(totales.ventas, "venta", "ventas")}
                  {totales.anuladas > 0 && ` · ${cuantos(totales.anuladas, "anulada", "anuladas")}, que no ${totales.anuladas === 1 ? "suma" : "suman"}`}
                </p>
                <dl className="negocio__medios">
                  {MEDIOS_DE_PAGO.map((m) => (
                    <div key={m.clave} className={clases(totales.porMedio[m.clave] === 0 && "negocio__medio--en-cero")}>
                      <dt>{m.nombre}</dt>
                      <dd className="cifra">{pesos(totales.porMedio[m.clave])}</dd>
                    </div>
                  ))}
                </dl>
                <Boton iconoFinal="flecha" className="negocio__ver" onClick={() => ir("ventas")}>Ver las ventas del día</Boton>
              </>
            )}
          </Cuerpo>
        </Tarjeta>

        {/* ---- 2. Lo gastado en compras esta semana ---- */}
        <Tarjeta className="negocio__bloque" aria-labelledby="negocio-compras">
          <Cabeza id="negocio-compras" titulo="Compras de esta semana" detalle={`Desde el lunes ${dia(lunesDeEstaSemana())}`}>
            {situacionDe("compras") === "listo" && <strong className="negocio__total negocio__total--chico cifra">{pesos(totalComprado)}</strong>}
          </Cabeza>
          <Cuerpo situacion={situacionDe("compras")} queEs="las compras" alReintentar={reintentar("compras")}>
            {porProveedor.length === 0 ? (
              <p className="negocio__nada">En la semana no se registraron compras.</p>
            ) : (
              <ul className="negocio__lista">
                {porProveedor.map(({ proveedor, compras: cuantas, total }) => (
                  <li key={proveedor.id}>
                    <Iniciales nombre={proveedor.nombre} tono={proveedor.tono} forma="cuadrada" />
                    <span className="negocio__renglon-texto">
                      <strong>{proveedor.nombre}</strong>
                      <span>{cuantos(cuantas, "compra", "compras")}</span>
                    </span>
                    <strong className="cifra negocio__importe">{pesos(total)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Cuerpo>
        </Tarjeta>

        {/* ---- 3. Lo que preguntaron y no llevaron ---- */}
        <Tarjeta className="negocio__bloque" aria-labelledby="negocio-consultas">
          <Cabeza id="negocio-consultas" titulo="Preguntaron y no llevaron" detalle="Lo que se anotó con «No llevó» al vender" />
          <Cuerpo situacion={situacionDe("consultas")} queEs="lo que no llevaron" alReintentar={reintentar("consultas")}>
            {consultas.length === 0 ? (
              <p className="negocio__nada">Nadie preguntó por algo que después no llevó.</p>
            ) : (
              <ul className="negocio__lista">
                {consultas.slice(0, CUANTAS_CONSULTAS).map((c) => {
                  const precio = c.precio;
                  return (
                    <li key={c.que}>
                      <span className="negocio__renglon-texto">
                        <strong>{c.que}</strong>
                        <span>{precio === null ? "No tenía precio" : `Se le ofreció a ${pesos(precio)}`}</span>
                      </span>
                      <span className="negocio__veces">{cuantos(c.veces, "vez", "veces")}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {consultas.length > CUANTAS_CONSULTAS && <p className="negocio__mas">Y {cuantos(consultas.length - CUANTAS_CONSULTAS, "producto", "productos")} más, de una vez cada uno.</p>}
          </Cuerpo>
        </Tarjeta>
      </div>
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
  situacion: Situacion;
  /** Para el mensaje de error: «las compras». */
  queEs: string;
  alReintentar: () => void;
  sobreVerde?: boolean;
  children: ReactNode;
};

/** El contenido de un bloque, o su «cargando», o su error con «Reintentar»: cada bloque por separado. */
function Cuerpo({ situacion, queEs, alReintentar, sobreVerde, children }: PropsDeCuerpo) {
  if (situacion === "cargando") {
    return (
      <div className={clases("negocio__cargando", sobreVerde && "negocio__cargando--verde")} role="status">
        <span className="solo-lectores">Cargando {queEs}…</span>
        <span className="negocio__hueso negocio__hueso--cifra" />
        <span className="negocio__hueso" />
        <span className="negocio__hueso negocio__hueso--corto" />
      </div>
    );
  }
  if (situacion === "error") {
    return (
      <div className={clases("negocio__falla", sobreVerde && "negocio__falla--verde")} role="alert">
        <span className="negocio__falla-icono"><Icono nombre="alerta" tam={22} /></span>
        <p><strong>No se pudieron cargar {queEs}</strong><span>Revisá la conexión y probá de nuevo.</span></p>
        <Boton tam="chico" icono="deshacer" onClick={alReintentar}>Reintentar</Boton>
      </div>
    );
  }
  return <>{children}</>;
}
