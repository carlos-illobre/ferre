import { useEffect, useId, useState, type ReactNode } from "react";
import { useAlmacen } from "../almacen";
import { cantidad, clienteDe, dia, hora, hoyA, MEDIOS_DE_PAGO, pesos, pesosConCentavos, PRODUCTOS, proveedorDe, totalDeCompra, USUARIOS, type Compra, type Tono, type Venta } from "../datos";
import { useConexion } from "../estructura/conexion";
import {
  Boton, Campo, Cargando, ErrorDeCarga, Hoja, Icono, Iniciales, Lista, Pagina, Pastilla, Renglon, Vacio, useEstadoDeMaqueta,
  type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro, useEsCelular, useParametro } from "../ruta";
import "../estilos/actividad.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "sin-resultados", nombre: "Nada con esos filtros" },
  { clave: "cargando", nombre: "Cargando" },
  { clave: "error", nombre: "No se pudo cargar" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
];

// ---------------------------------------------------------------- Datos propios de la pantalla
// El almacén común trae seis hechos de «Hoy» y «Ayer», sin tipo ni fecha: no alcanzan para
// paginar ni para filtrar. El registro de ejemplo vive acá; las ventas cobradas en la sesión
// se le suman arriba de todo.

const TIPOS = [
  { clave: "ventas", nombre: "Ventas" },
  { clave: "anulaciones", nombre: "Anulaciones" },
  { clave: "listas", nombre: "Listas de precios" },
  { clave: "mercaderia", nombre: "Mercadería recibida" },
  { clave: "stock", nombre: "Stock y conteos" },
  { clave: "productos", nombre: "Márgenes y productos" },
  { clave: "usuarios", nombre: "Usuarios y sesiones" },
] as const;

type Tipo = (typeof TIPOS)[number]["clave"];

/** Las personas salen de los datos comunes; la desactivada sigue figurando por lo que hizo. */
const PERSONAS: { id: string; nombre: string; tono: Tono; nota?: string }[] = USUARIOS.map((u) => ({ id: u.id, nombre: u.nombre, tono: u.tono, nota: u.activo ? undefined : "desactivado" }));

type Dato = { que: string; valor: string | string[] };

type Accion = {
  id: string;
  cuando: Date;
  quien: string;
  tipo: Tipo;
  /** Cómo se llama la acción en el detalle: «Venta», «Venta anulada». */
  titulo: string;
  /** En minúscula, para leer después del nombre: «vendió $8.000 en efectivo». */
  frase: string;
  datos: Dato[];
};

function a(id: number, diasAtras: number, horaTexto: string, quien: string, tipo: Tipo, titulo: string, frase: string, datos: Dato[]): Accion {
  return { id: `a${id}`, cuando: hoyA(horaTexto, diasAtras), quien, tipo, titulo, frase, datos };
}

const ACCIONES: Accion[] = [
  a(1, 0, "10:32", "carlos", "ventas", "Venta", "vendió $8.000 en efectivo", [
    { que: "Se llevó", valor: ["2 unidades de Cinta aisladora negra 20 m", "1 unidad de Mecha 6 mm madera"] }, { que: "Pagó", valor: "En efectivo" }, { que: "Total", valor: "$8.000" }]),
  a(2, 0, "10:18", "marta", "ventas", "Venta", "vendió $223.000 con Mercado Pago", [
    { que: "Se llevó", valor: "1 unidad de Taladro inalámbrico 18 V con dos baterías" }, { que: "Pagó", valor: "Con Mercado Pago" }, { que: "Total", valor: "$223.000" }]),
  a(4, 0, "09:54", "carlos", "ventas", "Venta", "vendió $25.000 en cuenta corriente a Constructora Martínez", [
    { que: "Se llevó", valor: "2,5 kilos de Clavo punta París 2 pulgadas" }, { que: "Pagó", valor: "A la cuenta corriente de Constructora Martínez" }, { que: "Total", valor: "$25.000" }]),
  a(5, 0, "09:44", "marta", "listas", "Lista de precios actualizada", "actualizó la lista de precios de Comodo: cambiaron 42 precios", [
    { que: "Proveedor", valor: "Comodo" }, { que: "Planilla", valor: "comodo-octubre.xlsx" }, { que: "Precios que cambiaron", valor: "42" }, { que: "Productos nuevos", valor: "3" }]),
  a(6, 0, "09:31", "nicolas", "ventas", "Venta", "vendió $53.000 con tarjeta", [
    { que: "Se llevó", valor: ["1 unidad de Llave francesa 10 pulgadas", "1 unidad de Mecha 8 mm widia"] }, { que: "Pagó", valor: "Con tarjeta" }, { que: "Total", valor: "$53.000" }]),
  a(7, 0, "09:12", "marta", "anulaciones", "Venta anulada", "anuló una venta de $12.000", [
    { que: "Venta", valor: "La de las 09:05, en efectivo, de Marta" }, { que: "Tenía", valor: "1 unidad de Mecha 8 mm widia" }, { que: "Motivo", valor: "Se equivocó de mecha" }, { que: "Stock", valor: "La mecha volvió al stock" }]),
  a(8, 0, "09:05", "marta", "ventas", "Venta", "vendió $12.000 en efectivo", [
    { que: "Se llevó", valor: "1 unidad de Mecha 8 mm widia" }, { que: "Pagó", valor: "En efectivo" }, { que: "Total", valor: "$12.000" }, { que: "Después", valor: "Marta la anuló a las 09:12" }]),
  a(9, 0, "08:47", "carlos", "ventas", "Venta", "vendió $6.000 en efectivo", [
    { que: "Se llevó", valor: "6 metros de Cable unipolar 2,5 mm" }, { que: "Pagó", valor: "En efectivo" }, { que: "Total", valor: "$6.000" }]),
  a(10, 0, "08:31", "carlos", "usuarios", "Entrada a la app", "entró desde la computadora del mostrador", [
    { que: "Dispositivo", valor: "Computadora del mostrador" }, { que: "Cómo entró", valor: "Con su cuenta de Google" }]),

  a(11, 1, "18:06", "carlos", "stock", "Corrección de stock", "corrigió el stock de Llave francesa 10 pulgadas: de 8 a 7", [
    { que: "Producto", valor: "Llave francesa 10 pulgadas" }, { que: "Había anotado", valor: "8 unidades" }, { que: "Quedó en", valor: "7 unidades" }, { que: "Motivo", valor: "Una vino fallada y se devolvió" }]),
  a(12, 1, "17:40", "nicolas", "stock", "Conteo cerrado", "cerró el conteo de Mostrador: 18 productos, 2 con diferencia", [
    { que: "Sector", valor: "Mostrador" }, { que: "Productos contados", valor: "18" }, { que: "Con diferencia", valor: ["Cinta aisladora negra 20 m: de 44 a 42", "Clavo punta París 2 pulgadas: de 14 a 14,5 kilos"] }]),
  a(14, 1, "15:22", "nicolas", "ventas", "Venta", "vendió $58.000 en cuenta corriente a Constructora Martínez", [
    { que: "Se llevó", valor: ["1 unidad de Llave francesa 10 pulgadas", "1 unidad de Mecha 8 mm widia", "0,5 kilos de Clavo punta París 2 pulgadas"] }, { que: "Pagó", valor: "A la cuenta corriente de Constructora Martínez" }, { que: "Total", valor: "$58.000" }]),
  a(15, 1, "12:10", "carlos", "productos", "Cambio de margen", "cambió el margen de Taladro inalámbrico 18 V con dos baterías: de 100 % a 50 %", [
    { que: "Producto", valor: "Taladro inalámbrico 18 V con dos baterías" }, { que: "Margen", valor: "De 100 % a 50 %" }, { que: "Precio", valor: "De $297.000 a $223.000" }]),
  a(16, 1, "11:48", "marta", "productos", "Productos unidos", "unió dos productos que estaban cargados dos veces: Cinta aisladora negra 20 m", [
    { que: "Quedó", valor: "Cinta aisladora negra 20 m (Tacsa)" }, { que: "Se unió con", valor: "Cinta aisl. negra 20 mts, de la lista de Comodo" }]),
  a(17, 1, "10:05", "carlos", "usuarios", "Sesión cerrada", "le cerró la sesión a Ramiro en su celular", [
    { que: "De quién", valor: "Ramiro" }, { que: "Dispositivo", valor: "Celular de Ramiro" }]),
  a(18, 1, "09:15", "nicolas", "anulaciones", "Compra anulada", "anuló una compra a Ixnova de $31.200", [
    { que: "Compra", valor: "La del martes a las 16:10, de Nicolás" }, { que: "Tenía", valor: "60 metros de Cable unipolar 2,5 mm, a $520,00" }, { que: "Stock", valor: "Los 60 metros salieron del stock" }]),
  a(19, 1, "08:40", "marta", "ventas", "Venta", "vendió $41.000 con Mercado Pago", [
    { que: "Se llevó", valor: "1 unidad de Llave francesa 10 pulgadas" }, { que: "Pagó", valor: "Con Mercado Pago" }, { que: "Total", valor: "$41.000" }]),

  a(20, 2, "17:55", "nicolas", "stock", "Conteo empezado", "empezó a contar el Mostrador", [
    { que: "Sector", valor: "Mostrador" }, { que: "Productos para contar", valor: "18" }]),
  a(21, 2, "16:30", "carlos", "listas", "Lista de precios actualizada", "actualizó la lista de precios de Tresge: cambiaron 17 precios", [
    { que: "Proveedor", valor: "Tresge" }, { que: "Planilla", valor: "tresge-lista-10.xlsx" }, { que: "Precios que cambiaron", valor: "17" }, { que: "Productos nuevos", valor: "Ninguno" }]),
  a(22, 2, "15:02", "marta", "ventas", "Venta", "vendió $16.000 en efectivo", [
    { que: "Se llevó", valor: ["1 unidad de Mecha 8 mm widia", "2 unidades de Cinta aisladora negra 20 m"] }, { que: "Pagó", valor: "En efectivo" }, { que: "Total", valor: "$16.000" }]),
  a(23, 2, "11:20", "carlos", "usuarios", "Usuario desactivado", "desactivó a Ramiro", [
    { que: "Persona", valor: "Ramiro (ramiro@gmail.com)" }, { que: "Qué pasa ahora", valor: "No puede entrar y se le cerraron las sesiones abiertas" }]),
  a(24, 2, "10:12", "ramiro", "ventas", "Venta", "vendió $9.000 en efectivo", [
    { que: "Se llevó", valor: ["1 unidad de Mecha 6 mm madera", "5 metros de Cable unipolar 2,5 mm"] }, { que: "Pagó", valor: "En efectivo" }, { que: "Total", valor: "$9.000" }]),

  a(26, 3, "10:30", "ramiro", "stock", "Corrección de stock", "corrigió el stock de Thinner sello de oro: de 3 a 0", [
    { que: "Producto", valor: "Thinner sello de oro" }, { que: "Había anotado", valor: "3 litros" }, { que: "Quedó en", valor: "0 litros" }, { que: "Motivo", valor: "No anotó ninguno" }]),
  a(27, 3, "09:02", "marta", "productos", "Cambio de margen", "le puso margen a Cable unipolar 2,5 mm: 50 %", [
    { que: "Producto", valor: "Cable unipolar 2,5 mm" }, { que: "Margen", valor: "No tenía; ahora 50 %" }, { que: "Precio", valor: "$1.000 el metro" }]),
  a(28, 3, "08:35", "nicolas", "usuarios", "Entrada a la app", "entró con la huella desde su celular", [
    { que: "Dispositivo", valor: "Celular de Nicolás" }, { que: "Cómo entró", valor: "Con la huella" }]),
];

const POR_PAGINA = 10;

/** Una venta cobrada mientras se recorre la maqueta, dicha como las demás acciones. */
function accionDeVenta(v: Venta): Accion {
  const medio = MEDIOS_DE_PAGO.find((m) => m.clave === v.medio);
  const cliente = clienteDe(v.clienteId);
  const como = v.medio === "efectivo" ? "en efectivo" : v.medio === "cuenta-corriente" ? `en cuenta corriente${cliente ? ` a ${cliente.nombre}` : ""}` : `con ${medio?.nombre === "Tarjeta" ? "tarjeta" : medio?.nombre}`;
  return {
    id: v.id, cuando: v.cuando, quien: v.usuarioId, tipo: "ventas", titulo: "Venta", frase: `vendió ${pesos(v.total)} ${como}`,
    datos: [
      { que: "Se llevó", valor: v.renglones.map((r) => `${cantidad(r.cantidad, r.unidad)} de ${r.nombre}`) },
      { que: "Pagó", valor: `${como.charAt(0).toUpperCase()}${como.slice(1)}` },
      { que: "Total", valor: pesos(v.total) },
      ...(v.anulada ? [{ que: "Después", valor: `Se anuló${v.motivo ? `: ${v.motivo}` : ""}` }] : []),
    ],
  };
}

/** Una compra del almacén (las de ejemplo y las que se registren en Recibir), con el mismo total que muestra Recibir. */
function accionDeCompra(c: Compra): Accion {
  const proveedor = proveedorDe(c.proveedorId)?.nombre ?? "un proveedor";
  const total = pesos(totalDeCompra(c));
  return {
    id: c.id, cuando: c.momento, quien: c.usuarioId, tipo: "mercaderia", titulo: "Mercadería recibida", frase: `recibió mercadería de ${proveedor} por ${total}`,
    datos: [
      { que: "Proveedor", valor: proveedor },
      { que: "Entró", valor: c.renglones.map((r) => { const p = PRODUCTOS.find((x) => x.id === r.productoId); return `${cantidad(r.cantidad, p?.unidad)} de ${p?.nombre ?? "un producto nuevo"}, a ${pesosConCentavos(r.costo)}`; }) },
      { que: "Total", valor: total },
      ...(c.anulada ? [{ que: "Después", valor: "Se anuló: lo que había sumado salió del stock" }] : []),
    ],
  };
}

// ---------------------------------------------------------------- Fechas

/** "2026-10-10": lo que usa `<input type="date">`, en hora local. */
function claveDeDia(momento: Date): string {
  return `${momento.getFullYear()}-${String(momento.getMonth() + 1).padStart(2, "0")}-${String(momento.getDate()).padStart(2, "0")}`;
}

function deClave(clave: string): Date {
  const [anio = 0, mes = 1, d = 1] = clave.split("-").map(Number);
  return new Date(anio, mes - 1, d);
}

/** «Hoy, sábado 10 de octubre», «Ayer, viernes 9 de octubre», «Jueves 8 de octubre». */
function nombreDelDia(clave: string): string {
  const texto = deClave(clave).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
  if (clave === claveDeDia(hoyA("12:00"))) return `Hoy, ${texto}`;
  if (clave === claveDeDia(hoyA("12:00", 1))) return `Ayer, ${texto}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---------------------------------------------------------------- Pantalla

type Filtros = { persona: string; tipo: string; desde: string; hasta: string };
const CLAVES: (keyof Filtros)[] = ["persona", "tipo", "desde", "hasta"];

export default function Actividad() {
  const estado = useEstadoDeMaqueta();
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const ventas = useAlmacen((al) => al.ventas);
  const compras = useAlmacen((al) => al.compras);

  // Los filtros y la página viajan en la dirección: se conservan al avanzar y al volver atrás.
  const filtros: Filtros = {
    persona: useParametro("persona") ?? "",
    tipo: useParametro("tipo") ?? "",
    desde: useParametro("desde") ?? "",
    hasta: useParametro("hasta") ?? "",
  };
  const paginaPedida = Number(useParametro("pagina") ?? "1") || 1;

  const [filtrando, setFiltrando] = useState(false);
  const [abierta, setAbierta] = useState<Accion | null>(null);

  // «Nada con esos filtros»: Nicolás nunca actualizó una lista de precios.
  useEffect(() => {
    if (estado === "sin-resultados") { cambiarParametro("persona", "nicolas"); cambiarParametro("tipo", "listas"); cambiarParametro("pagina", null); }
  }, [estado]);

  function filtrar(clave: keyof Filtros, valor: string) {
    cambiarParametro(clave, valor || null);
    cambiarParametro("pagina", null);
    if (estado === "sin-resultados") cambiarParametro("estado", null);
  }

  function quitarFiltros() {
    for (const clave of CLAVES) cambiarParametro(clave, null);
    cambiarParametro("pagina", null);
    if (estado === "sin-resultados") cambiarParametro("estado", null);
  }

  function irAPagina(n: number) {
    cambiarParametro("pagina", n === 1 ? null : String(n));
    window.scrollTo(0, 0);
  }

  const todas = [...ventas.filter((v) => v.id.startsWith("v-n")).map(accionDeVenta), ...compras.map(accionDeCompra), ...ACCIONES]
    .sort((x, y) => y.cuando.getTime() - x.cuando.getTime());
  const encontradas = todas.filter((x) => {
    const suDia = claveDeDia(x.cuando);
    return (!filtros.persona || x.quien === filtros.persona) && (!filtros.tipo || x.tipo === filtros.tipo) && (!filtros.desde || suDia >= filtros.desde) && (!filtros.hasta || suDia <= filtros.hasta);
  });
  const paginas = Math.max(1, Math.ceil(encontradas.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, paginaPedida), paginas);
  const deLaPagina = encontradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const dias = [...new Set(deLaPagina.map((x) => claveDeDia(x.cuando)))];

  const puestos: { clave: keyof Filtros; texto: string }[] = [
    filtros.persona && { clave: "persona" as const, texto: PERSONAS.find((p) => p.id === filtros.persona)?.nombre ?? filtros.persona },
    filtros.tipo && { clave: "tipo" as const, texto: TIPOS.find((t) => t.clave === filtros.tipo)?.nombre ?? filtros.tipo },
    filtros.desde && { clave: "desde" as const, texto: `Desde el ${dia(deClave(filtros.desde))}` },
    filtros.hasta && { clave: "hasta" as const, texto: `Hasta el ${dia(deClave(filtros.hasta))}` },
  ].filter((x): x is { clave: keyof Filtros; texto: string } => Boolean(x));

  const cuantas = encontradas.length === 1 ? "1 acción" : `${encontradas.length} acciones`;
  const seVeLaLista = enLinea && estado !== "cargando" && estado !== "error";

  if (!enLinea) {
    return (
      <Pagina titulo="Quién hizo qué" estados={ESTADOS}>
        <Vacio icono="sin-conexion" titulo="Sin conexión">«Quién hizo qué» necesita internet. Se ve solo cuando vuelva.</Vacio>
      </Pagina>
    );
  }

  return (
    <Pagina titulo="Quién hizo qué" estados={ESTADOS}>
      <div className="actividad">
        {/* ---- Filtros: a la vista en la computadora; en el celular, detrás de «Filtrar» ---- */}
        {esCelular ? (
          <div className="actividad__barra">
            <Boton icono="filtro" onClick={() => setFiltrando(true)}>{puestos.length === 0 ? "Filtrar" : "Cambiar filtros"}</Boton>
            {seVeLaLista && encontradas.length > 0 && <p className="actividad__cuenta">{cuantas}</p>}
          </div>
        ) : (
          <div className="actividad__filtros" role="group" aria-label="Filtros">
            <CamposDeFiltro filtros={filtros} alFiltrar={filtrar} />
            {puestos.length > 0 && <Boton variante="texto" icono="cerrar" className="actividad__quitar-todos" onClick={quitarFiltros}>Quitar filtros</Boton>}
          </div>
        )}

        {esCelular && puestos.length > 0 && (
          <ul className="actividad__puestos" aria-label="Filtros puestos">
            {puestos.map((f) => (
              <li key={f.clave}>
                <button type="button" className="actividad__puesto" onClick={() => filtrar(f.clave, "")} aria-label={`Quitar el filtro: ${f.texto}`}>
                  <span>{f.texto}</span><Icono nombre="cerrar" tam={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {estado === "cargando" && <Cargando texto="Trayendo lo que pasó…" />}
        {estado === "error" && <ErrorDeCarga titulo="No se pudo traer quién hizo qué" alReintentar={() => cambiarParametro("estado", null)}>Revisá la conexión y probá de nuevo.</ErrorDeCarga>}

        {seVeLaLista && encontradas.length === 0 && (
          <Vacio icono="filtro" titulo="Nada con esos filtros" accion={{ texto: "Quitar filtros", alTocar: quitarFiltros }}>
            Probá con otra persona, otro tipo de acción u otras fechas.
          </Vacio>
        )}

        {seVeLaLista && encontradas.length > 0 && (
          <>
            {!esCelular && <p className="actividad__cuenta">{cuantas}{paginas > 1 && ` · página ${pagina} de ${paginas}`}</p>}

            {dias.map((d) => (
              <section key={d} className="actividad__dia" aria-label={nombreDelDia(d)}>
                <h2>{nombreDelDia(d)}</h2>
                <Lista className="actividad__lista">
                  {deLaPagina.filter((x) => claveDeDia(x.cuando) === d).map((x) => {
                    const quien = personaDe(x.quien);
                    return (
                      <Renglon
                        key={x.id}
                        className={x.tipo === "anulaciones" ? "actividad__accion actividad__accion--anulacion" : "actividad__accion"}
                        inicio={<Iniciales nombre={quien.nombre} tono={quien.tono} />}
                        titulo={<><strong>{quien.nombre}</strong> {x.frase}</>}
                        detalle={<span className="actividad__pie">{hora(x.cuando)}{x.tipo === "anulaciones" && <Pastilla tipo="error" icono="deshacer">Anulación</Pastilla>}</span>}
                        alTocar={() => setAbierta(x)}
                      />
                    );
                  })}
                </Lista>
              </section>
            ))}

            {paginas > 1 && (
              <nav className="actividad__paginas" aria-label="Páginas">
                <Boton icono="flecha-izquierda" disabled={pagina === 1} onClick={() => irAPagina(pagina - 1)}>Anteriores</Boton>
                <p><span className="actividad__palabra-pagina">Página </span>{pagina} de {paginas}</p>
                <Boton iconoFinal="flecha" disabled={pagina === paginas} onClick={() => irAPagina(pagina + 1)}>Siguientes</Boton>
              </nav>
            )}
          </>
        )}
      </div>

      <Hoja
        abierta={filtrando}
        alCerrar={() => setFiltrando(false)}
        titulo="Filtrar"
        pie={<>
          {puestos.length > 0 && <Boton onClick={quitarFiltros}>Quitar filtros</Boton>}
          <Boton variante="principal" onClick={() => setFiltrando(false)}>{encontradas.length === 0 ? "No hay ninguna" : `Ver ${cuantas}`}</Boton>
        </>}
      >
        <div className="actividad__filtros actividad__filtros--hoja">
          <CamposDeFiltro filtros={filtros} alFiltrar={filtrar} />
        </div>
      </Hoja>

      <Hoja abierta={abierta !== null} alCerrar={() => setAbierta(null)} titulo={abierta?.titulo ?? ""}>
        {abierta && <Detalle accion={abierta} />}
      </Hoja>
    </Pagina>
  );
}

function personaDe(id: string): { nombre: string; tono: Tono } {
  return PERSONAS.find((p) => p.id === id) ?? { nombre: "Alguien", tono: "negro" };
}

// ---------------------------------------------------------------- Filtros

function CamposDeFiltro({ filtros, alFiltrar }: { filtros: Filtros; alFiltrar: (clave: keyof Filtros, valor: string) => void }) {
  const hoy = claveDeDia(new Date());
  return (
    <>
      <Elegir etiqueta="Persona" valor={filtros.persona} alElegir={(v) => alFiltrar("persona", v)} todas="Todas las personas">
        {PERSONAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.nota ? ` (${p.nota})` : ""}</option>)}
      </Elegir>
      <Elegir etiqueta="Tipo de acción" valor={filtros.tipo} alElegir={(v) => alFiltrar("tipo", v)} todas="Todas las acciones">
        {TIPOS.map((t) => <option key={t.clave} value={t.clave}>{t.nombre}</option>)}
      </Elegir>
      <Campo className="actividad__fecha" etiqueta="Desde" type="date" value={filtros.desde} max={filtros.hasta || hoy} onChange={(e) => alFiltrar("desde", e.target.value)} />
      <Campo className="actividad__fecha" etiqueta="Hasta" type="date" value={filtros.hasta} min={filtros.desde || undefined} max={hoy} onChange={(e) => alFiltrar("hasta", e.target.value)} />
    </>
  );
}

type PropsDeElegir = { etiqueta: string; valor: string; alElegir: (valor: string) => void; /** El texto de «sin filtro». */ todas: string; children: ReactNode };

/** Una lista desplegable con el aspecto de `Campo` (no hay una pieza común para `<select>`). */
function Elegir({ etiqueta, valor, alElegir, todas, children }: PropsDeElegir) {
  const id = useId();
  return (
    <div className="campo actividad__elegir">
      <label className="campo__etiqueta" htmlFor={id}>{etiqueta}</label>
      <div className="campo__caja">
        <select id={id} className="actividad__select" value={valor} onChange={(e) => alElegir(e.target.value)}>
          <option value="">{todas}</option>
          {children}
        </select>
        <Icono nombre="flecha-abajo" tam={20} className="actividad__select-flecha" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Detalle de una acción

function Detalle({ accion }: { accion: Accion }) {
  const quien = personaDe(accion.quien);
  return (
    <div className="actividad__detalle">
      <div className="actividad__detalle-cabeza">
        <Iniciales nombre={quien.nombre} tono={quien.tono} tam="grande" />
        <div>
          <p className="actividad__detalle-frase"><strong>{quien.nombre}</strong> {accion.frase}</p>
          <p className="detalle">{nombreDelDia(claveDeDia(accion.cuando))} · {hora(accion.cuando)}</p>
        </div>
      </div>
      <dl className="actividad__datos">
        {accion.datos.map((d) => (
          <div key={d.que}>
            <dt>{d.que}</dt>
            <dd>{Array.isArray(d.valor) ? d.valor.map((linea) => <span key={linea}>{linea}</span>) : d.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
