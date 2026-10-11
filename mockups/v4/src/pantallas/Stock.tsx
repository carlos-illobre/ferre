import { useEffect, useState, type FormEvent } from "react";
import { cambiarAlmacen, moverStock, useAlmacen } from "../almacen";
import { buscarProductos, cantidad, numero, pesos, vaConDecimal, type Producto } from "../datos";
import { useConexion } from "../estructura/conexion";
import {
  avisar, Boton, Buscador, Campo, Cantidad, Cargando, clases, ErrorDeCarga, Hoja, Lista, Pagina, Pastilla, Renglon, Segmentos, Tarjeta, TituloDeSeccion, Vacio,
  useEstadoDeMaqueta, type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro, ir } from "../ruta";
import "../estilos/stock.css";

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "vacio", nombre: "Sin stock cargado" },
  { clave: "cargando", nombre: "Cargando" },
  { clave: "error", nombre: "No se pudo cargar" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
];

type Filtro = "todos" | "sin-stock";

const MOTIVOS = ["Conté la estantería", "Rotura", "Se perdió", "Error de carga"];

/** La cantidad con su unidad; cero y negativo van marcados (con palabra y signo, no solo con color). */
function CuantoHay({ producto }: { producto: Producto }) {
  const texto = cantidad(producto.stock, producto.unidad);
  if (producto.stock < 0) return <Pastilla tipo="error">{texto}</Pastilla>;
  if (producto.stock === 0) return <Pastilla tipo="alerta">En cero</Pastilla>;
  return <span className="stock__cuanto">{texto}</span>;
}

export default function Stock() {
  const estado = useEstadoDeMaqueta();
  const productos = useAlmacen((a) => a.productos);
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [corrigiendo, setCorrigiendo] = useState(false);

  if (estado === "cargando" || estado === "error" || estado === "vacio") {
    return (
      <Pagina titulo="Stock" estados={ESTADOS}>
        {estado === "cargando" && <Cargando texto="Cargando el stock…" />}
        {estado === "error" && <ErrorDeCarga titulo="No se pudo cargar el stock" alReintentar={() => cambiarParametro("estado", null)}>Revisá la conexión y probá de nuevo.</ErrorDeCarga>}
        {estado === "vacio" && (
          <Vacio icono="stock" titulo="Todavía no hay stock cargado" accion={{ texto: "Recibir mercadería", icono: "recibir", alTocar: () => ir("recibir") }}>
            El stock arranca en cero. Se carga cuando recibís mercadería o cuando contás una estantería.
          </Vacio>
        )}
      </Pagina>
    );
  }

  const invertido = productos.reduce((suma, p) => suma + Math.max(0, p.stock) * (p.costo ?? 0), 0);
  const enCero = productos.filter((p) => p.stock === 0).length;
  const enNegativo = productos.filter((p) => p.stock < 0).length;
  const buscados = consulta.trim() ? buscarProductos(productos, consulta) : productos;
  const lista = filtro === "sin-stock" ? buscados.filter((p) => p.stock <= 0) : buscados;
  const elegido = productos.find((p) => p.id === elegidoId);

  function cerrar() { setElegidoId(null); setCorrigiendo(false); }

  return (
    <Pagina titulo="Stock" estados={ESTADOS}>
      <div className="stock__cifras">
        <Tarjeta><p className="detalle">Plata invertida</p><strong className="cifra">{pesos(invertido)}</strong><span className="detalle">Al costo, sin IVA</span></Tarjeta>
        <Tarjeta><p className="detalle">En cero</p><strong className="cifra">{enCero}</strong><span className="detalle">{enCero === 1 ? "producto" : "productos"}</span></Tarjeta>
        <Tarjeta><p className="detalle">En negativo</p><strong className={clases("cifra", enNegativo > 0 && "stock__negativo")}>{enNegativo}</strong><span className="detalle">{enNegativo === 1 ? "producto" : "productos"}</span></Tarjeta>
      </div>

      <div className="stock__buscar">
        <Buscador valor={consulta} alCambiar={setConsulta} etiqueta="Buscar un producto" placeholder="Buscá un producto" />
        <Segmentos
          etiqueta="Qué productos mostrar"
          opciones={[{ clave: "todos", nombre: "Todos" }, { clave: "sin-stock", nombre: "En cero o negativo" }]}
          elegido={filtro}
          alElegir={setFiltro}
        />
      </div>

      <TituloDeSeccion titulo={filtro === "todos" ? "Todos los productos" : "En cero o en negativo"}>{lista.length === 1 ? "1 producto" : `${lista.length} productos`}</TituloDeSeccion>

      {lista.length === 0 ? (
        <Vacio icono="buscar" titulo={consulta.trim() ? `No hay productos con «${consulta.trim()}»` : "No hay productos en cero ni en negativo"} accion={{ texto: "Ver todos", alTocar: () => { setConsulta(""); setFiltro("todos"); } }} />
      ) : (
        <Lista>
          {lista.map((p) => (
            <Renglon key={p.id} titulo={p.nombre} detalle={p.marca} fin={<CuantoHay producto={p} />} alTocar={() => { setCorrigiendo(false); setElegidoId(p.id); }} />
          ))}
        </Lista>
      )}

      <Hoja
        abierta={elegido !== undefined && !corrigiendo}
        alCerrar={cerrar}
        titulo={elegido?.nombre ?? ""}
        pie={<Boton icono="editar" onClick={() => setCorrigiendo(true)}>Corregir cantidad</Boton>}
      >
        {elegido && <Detalle producto={elegido} />}
      </Hoja>

      {elegido && <Corregir abierta={corrigiendo} producto={elegido} alVolver={() => setCorrigiendo(false)} alGuardar={cerrar} />}
    </Pagina>
  );
}

// ---------------------------------------------------------------- Hoja: el producto

function Detalle({ producto }: { producto: Producto }) {
  const movimientos = useAlmacen((a) => a.movimientos);
  const suyos = movimientos.filter((m) => m.productoId === producto.id).slice(0, 6);
  return (
    <>
      <div className="stock__hay">
        <p className="detalle">Hay ahora</p>
        <strong className={clases("cifra", producto.stock < 0 && "stock__negativo")}>{cantidad(producto.stock, producto.unidad)}</strong>
        {producto.stock < 0 && <span className="detalle">Se vendió más de lo que figuraba. Contalo y corregí la cantidad.</span>}
      </div>
      <div>
        <h3 className="stock__subtitulo">Últimos movimientos</h3>
        {suyos.length === 0 ? (
          <p className="detalle">Todavía no tiene movimientos.</p>
        ) : (
          <ul className="stock__movimientos">
            {suyos.map((m) => (
              <li key={m.id}>
                <span><strong>{m.que}</strong><span>{m.cuando}</span></span>
                <strong className={clases("cifra", m.cambio > 0 ? "stock__positivo" : "stock__resta")}>{m.cambio > 0 ? "+" : "−"}{numero(Math.abs(m.cambio))}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Hoja: corregir la cantidad

function Corregir({ abierta, producto, alVolver, alGuardar }: { abierta: boolean; producto: Producto; alVolver: () => void; alGuardar: () => void }) {
  const { enLinea } = useConexion();
  const [cuantas, setCuantas] = useState(0);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [otro, setOtro] = useState("");
  const [revisado, setRevisado] = useState(false);
  useEffect(() => { if (abierta) { setCuantas(Math.max(0, producto.stock)); setMotivo(null); setOtro(""); setRevisado(false); } }, [abierta, producto.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const porQue = otro.trim() || motivo;
  const sinCambio = cuantas === producto.stock;

  function guardar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (!porQue || sinCambio) return;
    const antes = numero(producto.stock);
    moverStock(producto.id, cuantas - producto.stock, `Corrección: había ${antes}, hay ${numero(cuantas)}. ${porQue}`);
    if (!enLinea) cambiarAlmacen((a) => ({ ...a, porEnviar: a.porEnviar + 1 }));
    avisar(`${producto.nombre}: había ${antes}, hay ${numero(cuantas)}`, { detalle: enLinea ? `Cantidad corregida. Motivo: ${porQue.toLowerCase()}.` : "Guardado en este dispositivo. Se envía cuando vuelva internet." });
    alGuardar();
  }

  return (
    <Hoja abierta={abierta} alCerrar={alVolver} titulo="Corregir cantidad">
      <form className="stock__corregir" onSubmit={guardar} noValidate>
        <p className="stock__de-que"><strong>{producto.nombre}</strong><span>Figuran {cantidad(producto.stock, producto.unidad)}</span></p>

        <div className="stock__cuantas">
          <p className="stock__pregunta">¿Cuántas hay?</p>
          <Cantidad tam="grande" valor={cuantas} minimo={0} decimal={vaConDecimal(producto.unidad)} alCambiar={setCuantas} etiqueta={`Cuántas hay de ${producto.nombre}`} />
          {revisado && sinCambio && <p className="stock__error" role="alert">Es la misma cantidad que ya figura. Cambiala o cerrá sin guardar.</p>}
        </div>

        <div>
          <p className="stock__pregunta">¿Por qué?</p>
          <Segmentos forma="grilla" etiqueta="Motivo de la corrección" opciones={MOTIVOS.map((m) => ({ clave: m, nombre: m }))} elegido={otro.trim() ? null : motivo} alElegir={(m) => { setMotivo(m); setOtro(""); }} />
          <Campo className="stock__otro" etiqueta="U otro motivo" value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Escribilo acá" error={revisado && !porQue ? "Elegí un motivo o escribilo: sin motivo no se guarda." : null} />
        </div>

        <Boton type="submit" variante="principal" tam="grande" ancho>Guardar</Boton>
      </form>
    </Hoja>
  );
}
