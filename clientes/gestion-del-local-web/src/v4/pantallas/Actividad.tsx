import { useEffect, useId, useState, type ReactNode } from "react";
import { leerTodo } from "../../almacen";
import { useConexion } from "../conexion";
import { cantidad, dia, fecha, hora, nombreDeUnidad, numero, pesos } from "../formato";
import { Boton, Campo, Cargando, ErrorDeCarga, Hoja, Icono, Iniciales, Lista, Pagina, Pastilla, Renglon, Vacio } from "../piezas";
import { cambiarParametro, useEsCelular, useParametro } from "../rutas";
import { claveDeDia, cuantos, deClave, esUnCelular, nombreDelDia, tonoDePersona, useCarga } from "./negocio-comun";
import "../estilos/actividad.css";

// «Quién hizo qué»: el registro de acciones, de a 10, de la más reciente a la más vieja. Es de
// solo lectura. Cada acción se escribe en palabras del mostrador a partir de lo que anotó el
// servidor (el tipo de evento y su contenido).

type Contenido = Record<string, unknown>;
type Evento = { id: string; tipo: string; fecha: string; email: string | null; nombre: string | null; contenido: Contenido };
type PaginaDeEventos = { eventos: Evento[]; total: number; pagina: number; por_pagina: number };
type Persona = { id: string; nombre: string; email: string; activo: boolean };
/** Los nombres que el registro no trae (guarda solo el id): salen de lo que ya hay en la app. */
type Nombres = { personas: Persona[]; productos: Map<string, { descripcion: string; unidad: string | null }>; clientes: Map<string, string> };

// La API filtra por cómo empieza el tipo de evento, de a uno: por eso «anulaciones» son dos
// opciones (de ventas y de compras) y no una sola.
const TIPOS = [
  { clave: "venta.registrada", nombre: "Ventas" },
  { clave: "venta.anulada", nombre: "Ventas anuladas" },
  { clave: "compra.registrada", nombre: "Mercadería recibida" },
  { clave: "compra.anulada", nombre: "Compras anuladas" },
  { clave: "lista.", nombre: "Listas de precios" },
  { clave: "stock.", nombre: "Correcciones de stock" },
  { clave: "conteo.", nombre: "Conteos" },
  { clave: "producto.", nombre: "Márgenes y productos" },
  { clave: "usuario.", nombre: "Usuarios" },
  { clave: "sesion.", nombre: "Entradas y sesiones" },
  { clave: "credencial.", nombre: "Celulares con huella" },
] as const;

// ---------------------------------------------------------------- Cada acción, en palabras

type Dato = { que: string; valor: string | string[] };
type Accion = {
  /** Cómo se llama en el detalle: «Venta», «Venta anulada». */
  titulo: string;
  /** En minúscula, para leer después del nombre: «vendió $8.000 en efectivo». */
  frase: string;
  datos: Dato[];
};

const texto = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? numero(v) : "");
const entero = (v: unknown): number | null => (typeof v === "number" ? v : typeof v === "string" && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);
const dato = (que: string, valor: string | string[] | false | null | undefined): Dato[] => (valor && valor.length > 0 ? [{ que, valor }] : []);
const enMayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function comoPago(c: Contenido, nombres: Nombres): string {
  const cliente = typeof c.cliente_id === "string" ? nombres.clientes.get(c.cliente_id) : undefined;
  switch (c.medio_pago) {
    case "efectivo": return "en efectivo";
    case "mercado_pago": return "con Mercado Pago";
    case "tarjeta": return "con tarjeta";
    case "cuenta_corriente": return `en cuenta corriente${cliente ? ` a ${cliente}` : ""}`;
    default: return "";
  }
}

function desdeDonde(dispositivo: unknown): string {
  if (typeof dispositivo !== "string" || dispositivo === "") return "";
  if (/^celular/i.test(dispositivo)) return " desde un celular";
  if (/^computadora/i.test(dispositivo)) return " desde una computadora";
  return ` desde ${dispositivo}`;
}

function enPalabras(e: Evento, nombres: Nombres): Accion {
  const c = e.contenido;
  const producto = (id: unknown) => (typeof id === "string" ? nombres.productos.get(id) : undefined);
  const persona = (id: unknown) => nombres.personas.find((p) => p.id === id)?.nombre ?? (typeof c.email === "string" ? c.email : "una persona");
  const motivo = dato("Motivo", texto(c.motivo) || "No se anotó");

  switch (e.tipo) {
    case "venta.registrada": {
      const como = comoPago(c, nombres);
      const items = entero(c.items);
      return {
        titulo: "Venta", frase: `vendió ${pesos(entero(c.total))}${como ? ` ${como}` : ""}`,
        datos: [...dato("Se llevó", items !== null && cuantos(items, "producto", "productos")), ...dato("Pagó", enMayuscula(como)), ...dato("Total", pesos(entero(c.total)))],
      };
    }
    case "venta.anulada": return { titulo: "Venta anulada", frase: `anuló una venta${c.motivo ? `: ${texto(c.motivo)}` : ""}`, datos: [...motivo, { que: "Stock", valor: "La mercadería volvió al stock" }] };
    case "venta.pagada": return { titulo: "Cobro de cuenta corriente", frase: "cobró una venta que estaba en cuenta corriente", datos: [] };
    case "compra.registrada": {
      const items = entero(c.items);
      const nuevos = entero(c.productos_nuevos);
      const costos = entero(c.costos_actualizados);
      return {
        titulo: "Mercadería recibida", frase: `recibió mercadería${c.proveedor ? ` de ${texto(c.proveedor)}` : ""} por ${pesos(entero(c.total))}`,
        datos: [
          ...dato("Proveedor", texto(c.proveedor)), ...dato("Comprobante", texto(c.comprobante)), ...dato("Fecha", typeof c.fecha === "string" && fecha(c.fecha.slice(0, 10))),
          ...dato("Entró", items !== null && cuantos(items, "producto", "productos")), ...dato("Total", pesos(entero(c.total))),
          ...dato("Productos nuevos", nuevos !== null && nuevos > 0 && numero(nuevos)), ...dato("Costos que cambiaron", costos !== null && costos > 0 && numero(costos)),
        ],
      };
    }
    case "compra.anulada": return { titulo: "Compra anulada", frase: `anuló una compra${c.motivo ? `: ${texto(c.motivo)}` : ""}`, datos: [...motivo, { que: "Stock", valor: "Lo que había sumado salió del stock" }] };
    case "producto.precio_elegido": {
      const p = producto(c.id);
      const cual = p?.descripcion ?? "un producto";
      const datos = dato("Producto", p?.descripcion);
      if ("margen_elegido" in c) {
        const sinMargen = c.margen_elegido === null;
        return { titulo: "Cambio de margen", frase: sinMargen ? `le sacó el margen a ${cual}` : `cambió el margen de ${cual}: ${texto(c.margen_elegido)} %`, datos: [...datos, { que: "Margen", valor: sinMargen ? "Quedó sin margen elegido" : `${texto(c.margen_elegido)} %` }] };
      }
      if ("unidad" in c) return { titulo: "Cambio en un producto", frase: `cambió cómo se vende ${cual}: por ${nombreDeUnidad(texto(c.unidad))}`, datos: [...datos, { que: "Se vende por", valor: nombreDeUnidad(texto(c.unidad)) }] };
      if ("codigo_barras" in c) return { titulo: "Cambio en un producto", frase: c.codigo_barras ? `le asoció un código de barras a ${cual}` : `le sacó el código de barras a ${cual}`, datos: [...datos, ...dato("Código de barras", texto(c.codigo_barras))] };
      if ("foto_url" in c) return { titulo: "Cambio en un producto", frase: `cambió la foto de ${cual}`, datos };
      if ("proveedor_preferido_id" in c) return { titulo: "Cambio en un producto", frase: `cambió a qué proveedor se le compra ${cual}`, datos };
      return { titulo: "Cambio en un producto", frase: `cambió ${cual}`, datos };
    }
    case "producto.foto": return { titulo: "Foto de un producto", frase: `le puso foto a ${producto(c.id)?.descripcion ?? "un producto"}`, datos: dato("Producto", producto(c.id)?.descripcion) };
    case "producto.unido": {
      const quedo = producto(c.conservar)?.descripcion;
      return { titulo: "Productos unidos", frase: `unió dos productos que estaban cargados dos veces${quedo ? `: ${quedo}` : ""}`, datos: [...dato("Quedó", quedo), { que: "Cómo", valor: c.manual ? "Los eligió a mano" : "Aceptó un duplicado sugerido" }] };
    }
    case "producto.separado": {
      const quedo = producto(c.conservar)?.descripcion;
      return { titulo: "Productos separados", frase: `separó dos productos que estaban unidos${quedo ? `: ${quedo}` : ""}`, datos: dato("Producto", quedo) };
    }
    case "equivalencia.rechazada": return { titulo: "Duplicado descartado", frase: "descartó un posible duplicado: eran productos distintos", datos: [] };
    case "lista.cargada": {
      const filas = entero(c.filas);
      const conError = entero(c.con_error);
      return {
        titulo: "Lista de precios cargada", frase: `cargó una lista de precios${c.proveedor ? ` de ${texto(c.proveedor)}` : ""}`,
        datos: [...dato("Proveedor", texto(c.proveedor)), ...dato("Planilla", texto(c.archivo)), ...dato("Fecha de la lista", typeof c.fechaLista === "string" && fecha(c.fechaLista.slice(0, 10))), ...dato("Renglones", filas !== null && numero(filas)), ...dato("Renglones con error", conError !== null && conError > 0 && numero(conError))],
      };
    }
    case "lista.aplicada": {
      const cambiaron = entero(c.modificados);
      const nuevos = entero(c.nuevos);
      const deBaja = entero(c.dados_de_baja);
      return {
        titulo: "Lista de precios actualizada", frase: `actualizó una lista de precios${cambiaron !== null ? (cambiaron === 1 ? ": cambió 1 precio" : `: cambiaron ${numero(cambiaron)} precios`) : ""}`,
        datos: [
          ...dato("Fecha de la lista", typeof c.fechaLista === "string" && fecha(c.fechaLista.slice(0, 10))), ...dato("Precios que cambiaron", cambiaron !== null && numero(cambiaron)),
          ...dato("Productos nuevos", nuevos !== null && (nuevos === 0 ? "Ninguno" : numero(nuevos))), ...dato("Dados de baja", deBaja !== null && deBaja > 0 && numero(deBaja)),
        ],
      };
    }
    case "lista.descartada": return { titulo: "Lista de precios descartada", frase: "descartó una lista de precios sin aplicarla", datos: [] };
    case "stock.ajustado": {
      const p = producto(c.productoId);
      const con = (v: unknown) => { const n = entero(v); return n === null ? "" : p ? cantidad(n, p.unidad) : numero(n); };
      return {
        titulo: "Corrección de stock", frase: `corrigió el stock de ${p?.descripcion ?? "un producto"}: de ${texto(c.antes)} a ${texto(c.despues)}`,
        datos: [...dato("Producto", p?.descripcion), ...dato("Había anotado", con(c.antes)), ...dato("Quedó en", con(c.despues)), ...motivo],
      };
    }
    case "sector.creado": return { titulo: "Sector nuevo", frase: `creó el sector ${texto(c.nombre)}`, datos: [] };
    case "conteo.abierto": return { titulo: "Conteo empezado", frase: "empezó a contar un sector", datos: [] };
    case "conteo.cerrado": {
      const contados = entero(c.contados);
      const ajustados = entero(c.ajustados);
      const sinContar = entero(c.sin_contar);
      return {
        titulo: "Conteo cerrado",
        frase: `cerró el conteo${c.sector ? ` de ${texto(c.sector)}` : ""}${contados !== null ? `: ${cuantos(contados, "producto", "productos")}${ajustados !== null ? `, ${ajustados} con diferencia` : ""}` : ""}`,
        datos: [...dato("Sector", texto(c.sector)), ...dato("Productos contados", contados !== null && numero(contados)), ...dato("Con diferencia", ajustados !== null && numero(ajustados)), ...dato("Sin contar", sinContar !== null && sinContar > 0 && numero(sinContar))],
      };
    }
    case "usuario.creado": {
      const quien = nombres.personas.find((p) => p.id === c.id);
      return { titulo: "Persona autorizada", frase: `autorizó a ${quien?.nombre ?? texto(c.email)}`, datos: [...dato("Persona", quien ? `${quien.nombre} (${quien.email})` : texto(c.email)), { que: "Qué pasa ahora", valor: "Puede entrar con su cuenta de Google" }] };
    }
    case "usuario.modificado": {
      const cambios = (c.cambios ?? {}) as Contenido;
      const quien = persona(c.id);
      if (cambios.activo === false) return { titulo: "Persona desactivada", frase: `desactivó a ${quien}`, datos: [{ que: "Persona", valor: quien }, { que: "Qué pasa ahora", valor: "No puede entrar y se le cerraron las sesiones abiertas" }] };
      if (cambios.activo === true) return { titulo: "Persona reactivada", frase: `reactivó a ${quien}`, datos: [{ que: "Persona", valor: quien }, { que: "Qué pasa ahora", valor: "Puede entrar de nuevo" }] };
      if (typeof cambios.nombre === "string") return { titulo: "Cambio en una persona", frase: `le cambió el nombre a ${quien}`, datos: [{ que: "Ahora se llama", valor: cambios.nombre }] };
      return { titulo: "Cambio en una persona", frase: `cambió los permisos de ${quien}`, datos: [{ que: "Persona", valor: quien }] };
    }
    case "sesion.iniciada": {
      const conHuella = c.medio === "huella";
      return { titulo: "Entrada a la app", frase: `entró ${conHuella ? "con la huella" : "con su cuenta de Google"}${desdeDonde(c.dispositivo)}`, datos: [...dato("Dispositivo", typeof c.dispositivo === "string" && (esUnCelular(c.dispositivo) ? "Celular" : "Computadora")), { que: "Cómo entró", valor: conHuella ? "Con la huella" : "Con su cuenta de Google" }] };
    }
    case "sesion.cerrada": return { titulo: "Salida de la app", frase: "salió de la app", datos: [] };
    case "sesion.revocada": return { titulo: "Sesión cerrada", frase: "cerró una sesión que estaba abierta en otro dispositivo", datos: [] };
    case "credencial.vinculada": return { titulo: "Celular vinculado con huella", frase: `vinculó un celular para entrar con la huella${c.dispositivo ? `: ${texto(c.dispositivo)}` : ""}`, datos: dato("Celular", texto(c.dispositivo)) };
    case "credencial.quitada": return { titulo: "Celular con huella quitado", frase: "quitó un celular que entraba con la huella", datos: [] };
    case "puesto.vinculado": return { titulo: "Celular vinculado a la computadora", frase: "vinculó su celular a la computadora para escanear", datos: [] };
    case "cliente.creado": return { titulo: "Cliente nuevo", frase: `agregó al cliente ${texto(c.nombre)}`, datos: [] };
    case "proveedor.creado": return { titulo: "Proveedor nuevo", frase: `agregó al proveedor ${texto(c.nombre)}`, datos: [] };
    case "proveedor.modificado": return { titulo: "Cambio en un proveedor", frase: "cambió los datos de un proveedor", datos: [] };
    default: {
      // Un tipo que esta pantalla todavía no conoce: se muestra tal cual, sin inventarle palabras.
      const queEs = e.tipo.replace(/[._]/g, " ");
      return { titulo: enMayuscula(queEs), frase: `registró: ${queEs}`, datos: [] };
    }
  }
}

const esAnulacion = (e: Evento) => e.tipo.endsWith(".anulada");

// ---------------------------------------------------------------- Pantalla

type Filtros = { persona: string; tipo: string; desde: string; hasta: string };
const CLAVES: (keyof Filtros)[] = ["persona", "tipo", "desde", "hasta"];

/** El comienzo de un día (o del siguiente), como lo pide la API. */
function inicioDelDia(clave: string, corrimiento = 0): string {
  const d = deClave(clave);
  d.setDate(d.getDate() + corrimiento);
  return d.toISOString();
}

function rutaDe(filtros: Filtros, pagina: number): string {
  const consulta = new URLSearchParams({ pagina: String(pagina) });
  if (filtros.persona) consulta.set("usuario", filtros.persona);
  if (filtros.tipo) consulta.set("tipo", filtros.tipo);
  if (filtros.desde) consulta.set("desde", inicioDelDia(filtros.desde));
  if (filtros.hasta) consulta.set("hasta", inicioDelDia(filtros.hasta, 1)); // el «hasta» de la pantalla incluye ese día
  return `/auditoria?${consulta}`;
}

/** Los nombres de productos y clientes que ya están guardados en este dispositivo (no se baja nada). */
function useNombresDelDispositivo(): Pick<Nombres, "productos" | "clientes"> {
  const [nombres, setNombres] = useState<Pick<Nombres, "productos" | "clientes">>({ productos: new Map(), clientes: new Map() });
  useEffect(() => {
    let vigente = true;
    Promise.all([leerTodo<{ id: string; descripcion: string; unidad: string | null }>("catalogo"), leerTodo<{ id: string; nombre: string }>("clientes")])
      .then(([productos, clientes]) => { if (vigente) setNombres({ productos: new Map(productos.map((p) => [p.id, p])), clientes: new Map(clientes.map((c) => [c.id, c.nombre])) }); })
      .catch(() => undefined);
    return () => { vigente = false; };
  }, []);
  return nombres;
}

export function Actividad() {
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();

  // Los filtros y la página viajan en la dirección: se conservan al avanzar y al volver atrás.
  const filtros: Filtros = {
    persona: useParametro("persona") ?? "",
    tipo: useParametro("tipo") ?? "",
    desde: useParametro("desde") ?? "",
    hasta: useParametro("hasta") ?? "",
  };
  const paginaPedida = Math.max(1, Math.floor(Number(useParametro("pagina") ?? "1")) || 1);

  const registro = useCarga<PaginaDeEventos>(enLinea ? rutaDe(filtros, paginaPedida) : null);
  const personas = useCarga<Persona[]>(enLinea ? "/usuarios" : null);
  const nombres: Nombres = { ...useNombresDelDispositivo(), personas: personas.datos ?? [] };

  const [filtrando, setFiltrando] = useState(false);
  const [abierta, setAbierta] = useState<Evento | null>(null);

  // Cambiar un filtro lleva a la página 1; avanzar y retroceder los conserva.
  function filtrar(clave: keyof Filtros, valor: string) {
    cambiarParametro(clave, valor || null);
    cambiarParametro("pagina", null);
  }
  function quitarFiltros() {
    for (const clave of CLAVES) cambiarParametro(clave, null);
    cambiarParametro("pagina", null);
  }
  function irAPagina(n: number) {
    cambiarParametro("pagina", n === 1 ? null : String(n));
    window.scrollTo(0, 0);
  }

  if (!enLinea) {
    return (
      <Pagina titulo="Quién hizo qué" testId="actividad">
        <Vacio icono="sin-conexion" titulo="Sin conexión" testId="actividad-sin-conexion">«Quién hizo qué» necesita internet. Se ve solo cuando vuelva.</Vacio>
      </Pagina>
    );
  }

  // Mientras llega otra página no queda a la vista la anterior: parecería la pedida.
  const datos = registro.cargando ? null : registro.datos;
  const total = datos?.total ?? 0;
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1;
  const pagina = datos?.pagina ?? paginaPedida;
  const eventos = datos?.eventos ?? [];
  const dias = [...new Set(eventos.map((e) => claveDeDia(new Date(e.fecha))))];

  const puestos: { clave: keyof Filtros; texto: string }[] = [
    filtros.persona && { clave: "persona" as const, texto: nombres.personas.find((p) => p.id === filtros.persona)?.nombre ?? "Una persona" },
    filtros.tipo && { clave: "tipo" as const, texto: TIPOS.find((t) => t.clave === filtros.tipo)?.nombre ?? filtros.tipo },
    filtros.desde && { clave: "desde" as const, texto: `Desde el ${dia(filtros.desde)}` },
    filtros.hasta && { clave: "hasta" as const, texto: `Hasta el ${dia(filtros.hasta)}` },
  ].filter((x): x is { clave: keyof Filtros; texto: string } => Boolean(x));

  const cuantas = cuantos(total, "acción", "acciones");
  const campos = <CamposDeFiltro filtros={filtros} personas={nombres.personas} alFiltrar={filtrar} />;

  return (
    <Pagina titulo="Quién hizo qué" testId="actividad">
      <div className="actividad">
        {/* ---- Filtros: a la vista en la computadora; en el celular, detrás de «Filtrar» ---- */}
        {esCelular ? (
          <div className="actividad__barra">
            <Boton icono="filtro" onClick={() => setFiltrando(true)} data-testid="filtrar">{puestos.length === 0 ? "Filtrar" : "Cambiar filtros"}</Boton>
            {datos && total > 0 && <p className="actividad__cuenta" data-testid="cuenta">{cuantas}</p>}
          </div>
        ) : (
          <div className="actividad__filtros" role="group" aria-label="Filtros" data-testid="filtros">
            {campos}
            {puestos.length > 0 && <Boton variante="texto" icono="cerrar" className="actividad__quitar-todos" onClick={quitarFiltros} data-testid="quitar-filtros">Quitar filtros</Boton>}
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

        {!datos && registro.error === null && <Cargando texto="Trayendo lo que pasó…" />}
        {!datos && registro.error !== null && <ErrorDeCarga titulo="No se pudo traer quién hizo qué" alReintentar={registro.recargar}>{registro.error}</ErrorDeCarga>}

        {datos && total === 0 && (puestos.length > 0 ? (
          <Vacio icono="filtro" titulo="Nada con esos filtros" accion={{ texto: "Quitar filtros", alTocar: quitarFiltros }} testId="sin-resultados">
            Probá con otra persona, otro tipo de acción u otras fechas.
          </Vacio>
        ) : (
          <Vacio icono="actividad" titulo="Todavía no hay acciones anotadas" testId="sin-acciones">Apenas alguien venda, reciba mercadería o cambie un precio, queda anotado acá.</Vacio>
        ))}

        {datos && total > 0 && (
          <>
            {!esCelular && <p className="actividad__cuenta" data-testid="cuenta">{cuantas}{paginas > 1 && ` · página ${pagina} de ${paginas}`}</p>}

            <div className="actividad__dias" data-testid="auditoria">
              {dias.map((d) => (
                <section key={d} className="actividad__dia" aria-label={nombreDelDia(d)}>
                  <h2>{nombreDelDia(d)}</h2>
                  <Lista className="actividad__lista">
                    {eventos.filter((e) => claveDeDia(new Date(e.fecha)) === d).map((e) => (
                      <Renglon
                        key={e.id}
                        className={esAnulacion(e) ? "actividad__accion actividad__accion--anulacion" : "actividad__accion"}
                        inicio={<Quien evento={e} />}
                        titulo={<><strong>{e.nombre ?? "El sistema"}</strong> {enPalabras(e, nombres).frase}</>}
                        detalle={<span className="actividad__pie">{hora(e.fecha)}{esAnulacion(e) && <Pastilla tipo="error" icono="deshacer">Anulación</Pastilla>}</span>}
                        alTocar={() => setAbierta(e)}
                        testId="evento"
                      />
                    ))}
                  </Lista>
                </section>
              ))}
            </div>

            {paginas > 1 && (
              <nav className="actividad__paginas" aria-label="Páginas" data-testid="paginado">
                <Boton icono="flecha-izquierda" disabled={pagina <= 1} onClick={() => irAPagina(pagina - 1)} data-testid="anteriores">Anteriores</Boton>
                <p><span className="actividad__palabra-pagina">Página </span>{pagina} de {paginas}</p>
                <Boton iconoFinal="flecha" disabled={pagina >= paginas} onClick={() => irAPagina(pagina + 1)} data-testid="siguientes">Siguientes</Boton>
              </nav>
            )}
          </>
        )}
      </div>

      <Hoja
        abierta={filtrando}
        alCerrar={() => setFiltrando(false)}
        titulo="Filtrar"
        testId="hoja-filtros"
        pie={<>
          {puestos.length > 0 && <Boton onClick={quitarFiltros} data-testid="quitar-filtros">Quitar filtros</Boton>}
          <Boton variante="principal" onClick={() => setFiltrando(false)} data-testid="ver-acciones">{!datos ? "Ver las acciones" : total === 0 ? "No hay ninguna" : `Ver ${cuantas}`}</Boton>
        </>}
      >
        <div className="actividad__filtros actividad__filtros--hoja">{campos}</div>
      </Hoja>

      <Hoja abierta={abierta !== null} alCerrar={() => setAbierta(null)} titulo={abierta ? enPalabras(abierta, nombres).titulo : ""} testId="hoja-evento">
        {abierta && <Detalle evento={abierta} accion={enPalabras(abierta, nombres)} />}
      </Hoja>
    </Pagina>
  );
}

/** Las iniciales de quien lo hizo, siempre del mismo color (el de su fila en «Usuarios y sesiones»). */
function Quien({ evento, grande }: { evento: Evento; grande?: boolean }) {
  return <Iniciales nombre={evento.nombre ?? "El sistema"} tono={evento.email ? tonoDePersona(evento.email) : "negro"} tam={grande ? "grande" : "normal"} />;
}

// ---------------------------------------------------------------- Filtros

function CamposDeFiltro({ filtros, personas, alFiltrar }: { filtros: Filtros; personas: Persona[]; alFiltrar: (clave: keyof Filtros, valor: string) => void }) {
  const hoy = claveDeDia(new Date());
  return (
    <>
      <Elegir etiqueta="Persona" valor={filtros.persona} alElegir={(v) => alFiltrar("persona", v)} todas="Todas las personas" testId="filtro-usuario">
        {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? "" : " (desactivada)"}</option>)}
      </Elegir>
      <Elegir etiqueta="Tipo de acción" valor={filtros.tipo} alElegir={(v) => alFiltrar("tipo", v)} todas="Todas las acciones" testId="filtro-tipo">
        {TIPOS.map((t) => <option key={t.clave} value={t.clave}>{t.nombre}</option>)}
      </Elegir>
      <Campo className="actividad__fecha" etiqueta="Desde" type="date" value={filtros.desde} max={filtros.hasta || hoy} onChange={(e) => alFiltrar("desde", e.target.value)} data-testid="filtro-desde" />
      <Campo className="actividad__fecha" etiqueta="Hasta" type="date" value={filtros.hasta} min={filtros.desde || undefined} max={hoy} onChange={(e) => alFiltrar("hasta", e.target.value)} data-testid="filtro-hasta" />
    </>
  );
}

type PropsDeElegir = { etiqueta: string; valor: string; alElegir: (valor: string) => void; /** El texto de «sin filtro». */ todas: string; testId: string; children: ReactNode };

/** Una lista desplegable con el aspecto de `Campo` (no hay una pieza común para `<select>`). */
function Elegir({ etiqueta, valor, alElegir, todas, testId, children }: PropsDeElegir) {
  const id = useId();
  return (
    <div className="campo actividad__elegir">
      <label className="campo__etiqueta" htmlFor={id}>{etiqueta}</label>
      <div className="campo__caja">
        <select id={id} className="actividad__select" value={valor} onChange={(e) => alElegir(e.target.value)} data-testid={testId}>
          <option value="">{todas}</option>
          {children}
        </select>
        <Icono nombre="flecha-abajo" tam={20} className="actividad__select-flecha" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Detalle de una acción

function Detalle({ evento, accion }: { evento: Evento; accion: Accion }) {
  return (
    <div className="actividad__detalle">
      <div className="actividad__detalle-cabeza">
        <Quien evento={evento} grande />
        <div>
          <p className="actividad__detalle-frase"><strong>{evento.nombre ?? "El sistema"}</strong> {accion.frase}</p>
          <p className="detalle">{nombreDelDia(claveDeDia(new Date(evento.fecha)))} · {hora(evento.fecha)}</p>
          {esAnulacion(evento) && <p className="actividad__detalle-marca"><Pastilla tipo="error" icono="deshacer">Anulación</Pastilla></p>}
        </div>
      </div>
      {accion.datos.length > 0 && (
        <dl className="actividad__datos">
          {accion.datos.map((d) => (
            <div key={d.que}>
              <dt>{d.que}</dt>
              <dd>{Array.isArray(d.valor) ? d.valor.map((linea) => <span key={linea}>{linea}</span>) : d.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
