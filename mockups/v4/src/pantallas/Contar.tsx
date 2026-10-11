import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cambiarAlmacen, moverStock, nuevoId, useAlmacen } from "../almacen";
import { buscarProductos, cantidad, CODIGO_DESCONOCIDO, numero, vaConDecimal, type Producto, type Sector } from "../datos";
import { useConexion } from "../estructura/conexion";
import {
  Aviso, Boton, Buscador, Campo, Cantidad, clases, Confirmar, Escaner, Exito, Hoja, Icono, Pagina, Pastilla, Tarjeta, TituloDeSeccion, Vacio,
  useEstadoDeMaqueta, type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro, useEsCelular } from "../ruta";
import "../estilos/contar.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Los sectores" },
  { clave: "contando", nombre: "Contando un sector" },
  { clave: "conteo-vacio", nombre: "Conteo recién empezado" },
  { clave: "contando-sin-conexion", nombre: "Contando sin conexión" },
  { clave: "sin-sectores", nombre: "Sin sectores" },
];

// ---------------------------------------------------------------- Los conteos abiertos

/** Un producto ya contado: cuántas había según el sistema y cuántas hay. */
type Contado = { productoId: string; nombre: string; unidad: Producto["unidad"]; habia: number; hay: number; sinEnviar: boolean };

/** Los conteos en curso, por sector. Viven acá (no en el almacén común) y duran mientras dura la maqueta. */
let conteosAbiertos: Record<string, Contado[]> = {
  "estanteria-1": [
    { productoId: "mecha-6-hormigon", nombre: "Mecha 6 mm para hormigón", unidad: "unidad", habia: 6, hay: 5, sinEnviar: false },
    { productoId: "mecha-8-widia", nombre: "Mecha 8 mm widia", unidad: "unidad", habia: 9, hay: 9, sinEnviar: false },
  ],
};

function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? `1 ${uno}` : `${n} ${varios}`;
}

const SECTOR_NUEVO: Sector = { id: "pared-del-fondo", nombre: "Pared del fondo", productos: 0, contados: 0, estado: "a-medias", detalle: "" };

type Cerrado = { sector: string; contados: number; ajustes: number };

// ---------------------------------------------------------------- Pantalla

export default function Contar() {
  const estado = useEstadoDeMaqueta();
  const sectores = useAlmacen((a) => a.sectores);
  const [conteos, setConteosLocal] = useState(conteosAbiertos);
  const [sectorId, setSectorId] = useState<string | null>(null);
  const [inicial, setInicial] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [cerrado, setCerrado] = useState<Cerrado | null>(null);
  /** Para que cambiar el estado de maqueta desde el código no deshaga lo que se acaba de abrir. */
  const saltear = useRef(false);

  function setConteos(cambio: (antes: Record<string, Contado[]>) => Record<string, Contado[]>) {
    conteosAbiertos = cambio(conteosAbiertos);
    setConteosLocal(conteosAbiertos);
  }

  function empezar(sector: Sector) {
    if (sector.estado !== "a-medias") {
      setConteos((antes) => ({ ...antes, [sector.id]: [] }));
      cambiarAlmacen((a) => ({ ...a, sectores: a.sectores.map((s) => (s.id === sector.id ? { ...s, estado: "a-medias" } : s)) }));
    }
    setInicial(null);
    setSectorId(sector.id);
    window.scrollTo(0, 0);
  }

  function crear(nombre: string) {
    const sector: Sector = { id: nuevoId("sector"), nombre, productos: 0, contados: 0, estado: "a-medias", detalle: "" };
    cambiarAlmacen((a) => ({ ...a, sectores: [...a.sectores, sector] }));
    setConteos((antes) => ({ ...antes, [sector.id]: [] }));
    setNuevo(false);
    setInicial(null);
    setSectorId(sector.id);
  }

  // Cada estado de maqueta abre lo que hace falta para verlo.
  useEffect(() => {
    if (saltear.current) { saltear.current = false; return; }
    setCerrado(null);
    if (estado === "contando" || estado === "contando-sin-conexion") { setInicial("mecha-6-madera"); setSectorId("estanteria-1"); }
    else if (estado === "conteo-vacio") {
      // Un sector recién creado: todavía no tiene productos ni nada contado.
      cambiarAlmacen((a) => (a.sectores.some((s) => s.id === SECTOR_NUEVO.id) ? a : { ...a, sectores: [...a.sectores, SECTOR_NUEVO] }));
      setConteos((antes) => ({ ...antes, [SECTOR_NUEVO.id]: [] }));
      setInicial(null);
      setSectorId(SECTOR_NUEVO.id);
    }
    else setSectorId(null);
  }, [estado]);

  function volver() {
    setSectorId(null);
    if (estado.startsWith("conte")) cambiarParametro("estado", null);
  }

  const sector = sectores.find((s) => s.id === sectorId);

  if (cerrado) {
    return (
      <Pagina titulo="Contar stock" ancho="angosto" estados={ESTADOS} volver={false}>
        <Exito
          titulo={cerrado.ajustes === 0 ? "Conteo cerrado: todo coincide" : `Conteo cerrado: ${plural(cerrado.ajustes, "ajuste", "ajustes")}`}
          detalle={`${cerrado.sector} · ${plural(cerrado.contados, "producto contado", "productos contados")}`}
          boton="Contar otro sector"
          alSeguir={() => { setCerrado(null); volver(); }}
        />
      </Pagina>
    );
  }

  if (sector) {
    return (
      <Conteo
        key={`${sector.id}-${estado}`}
        sector={sector}
        contados={conteos[sector.id] ?? []}
        inicial={inicial}
        alCambiar={(lista) => setConteos((antes) => ({ ...antes, [sector.id]: lista }))}
        alVolver={volver}
        alCerrar={(hecho) => {
          setConteos((antes) => { const { [sector.id]: _, ...resto } = antes; return resto; });
          cambiarAlmacen((a) => ({ ...a, sectores: a.sectores.map((s) => (s.id === sector.id ? { ...s, estado: "cerrado" } : s)) }));
          setSectorId(null);
          setCerrado(hecho);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  const haySectores = sectores.length > 0 && estado !== "sin-sectores";
  const aMedias = haySectores ? sectores.find((s) => s.estado === "a-medias") : undefined;

  return (
    <Pagina titulo="Contar stock" estados={ESTADOS}>
      {haySectores ? (
        <>
          <TituloDeSeccion titulo="¿Dónde vas a contar?" detalle="Se cuenta de a un sector. Podés dejarlo a medias y seguir después.">
            <Boton tam="chico" icono="mas" onClick={() => setNuevo(true)}>Nuevo sector</Boton>
          </TituloDeSeccion>
          <div className="contar__sectores">
            {sectores.map((s) => {
              const cuantos = (conteos[s.id] ?? []).length;
              return (
                <Tarjeta key={s.id} como="article" className={clases("contar__sector", s.estado === "a-medias" && "contar__sector--a-medias")}>
                  <h3>{s.nombre}</h3>
                  {s.estado === "a-medias" && <Pastilla tipo="alerta">Conteo a medias</Pastilla>}
                  {s.estado === "sin-empezar" && <Pastilla>Nunca contado</Pastilla>}
                  {s.estado === "cerrado" && <Pastilla tipo="bien" icono="tilde">Contado</Pastilla>}
                  <p className="detalle">
                    {s.estado === "a-medias" ? (cuantos === 0 ? "Todavía sin productos contados" : `Llevás ${plural(cuantos, "producto contado", "productos contados")}`) : s.estado === "cerrado" ? (s.detalle.startsWith("Contado") ? s.detalle : "Contado hoy") : "Sin empezar"}
                  </p>
                  <Boton variante={s.id === aMedias?.id ? "principal" : "secundario"} ancho iconoFinal="flecha" onClick={() => empezar(s)} aria-label={`${s.estado === "a-medias" ? "Retomar" : s.estado === "cerrado" ? "Contar de nuevo" : "Empezar"} ${s.nombre}`}>
                    {s.estado === "a-medias" ? "Retomar" : s.estado === "cerrado" ? "Contar de nuevo" : "Empezar"}
                  </Boton>
                </Tarjeta>
              );
            })}
          </div>
        </>
      ) : (
        <Vacio icono="contar" titulo="Todavía no hay sectores" accion={{ texto: "Crear el primer sector", icono: "mas", alTocar: () => setNuevo(true) }}>
          Un sector es un lugar del local: una estantería, una pared, el mostrador. Se cuenta de a uno.
        </Vacio>
      )}

      <NuevoSector abierta={nuevo} existentes={haySectores ? sectores.map((s) => s.nombre) : []} alCerrar={() => setNuevo(false)} alCrear={(nombre) => { if (estado === "sin-sectores") { saltear.current = true; cambiarParametro("estado", null); } crear(nombre); }} />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Hoja: nuevo sector

function NuevoSector({ abierta, existentes, alCerrar, alCrear }: { abierta: boolean; existentes: string[]; alCerrar: () => void; alCrear: (nombre: string) => void }) {
  const [nombre, setNombre] = useState("");
  const [revisado, setRevisado] = useState(false);
  useEffect(() => { if (abierta) { setNombre(""); setRevisado(false); } }, [abierta]);

  const limpio = nombre.trim();
  const error = limpio === "" ? "Escribí el nombre del sector." : existentes.some((e) => e.toLowerCase() === limpio.toLowerCase()) ? "Ya hay un sector con ese nombre. Poné otro." : null;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (!error) alCrear(limpio);
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Nuevo sector">
      <form className="contar__nuevo" onSubmit={enviar} noValidate>
        <Campo etiqueta="¿Cómo se llama?" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Pared del fondo" error={revisado ? error : null} autoFocus />
        <Boton type="submit" variante="principal" tam="grande" ancho>Crear y empezar a contar</Boton>
      </form>
    </Hoja>
  );
}

// ---------------------------------------------------------------- El conteo de un sector

type PropsDeConteo = {
  sector: Sector;
  contados: Contado[];
  /** Producto que arranca elegido (solo para los estados de maqueta). */
  inicial: string | null;
  alCambiar: (lista: Contado[]) => void;
  alVolver: () => void;
  alCerrar: (hecho: Cerrado) => void;
};

function Conteo({ sector, contados, inicial, alCambiar, alVolver, alCerrar }: PropsDeConteo) {
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const productos = useAlmacen((a) => a.productos);
  const [consulta, setConsulta] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [elegidoId, setElegidoId] = useState<string | null>(inicial);
  const [cuantas, setCuantas] = useState(() => Math.max(0, productos.find((p) => p.id === inicial)?.stock ?? 0));
  const [codigoSuelto, setCodigoSuelto] = useState<string | null>(null);
  const [escaner, setEscaner] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const buscador = useRef<HTMLInputElement>(null);

  const elegido = productos.find((p) => p.id === elegidoId);
  const yaContado = contados.find((c) => c.productoId === elegidoId);
  const resultados = buscarProductos(productos, consulta);
  const faltan = productos.filter((p) => p.sectorId === sector.id && p.id !== elegidoId && !contados.some((c) => c.productoId === p.id));
  const conDiferencia = contados.filter((c) => c.hay !== c.habia);

  function elegir(producto: Producto) {
    const antes = contados.find((c) => c.productoId === producto.id);
    setElegidoId(producto.id);
    setCuantas(antes ? antes.hay : Math.max(0, producto.stock));
    setConsulta("");
    setMarcado(0);
    setCodigoSuelto(null);
    window.scrollTo(0, 0);
  }

  function leerCodigo(codigo: string) {
    const producto = productos.find((p) => p.codigoDeBarras === codigo);
    if (producto) elegir(producto);
    else { setCodigoSuelto(codigo); setConsulta(""); }
  }

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, resultados.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
    if (e.key === "Escape" && consulta !== "") { e.preventDefault(); setConsulta(""); }
    if (e.key === "Enter") {
      e.preventDefault();
      const primero = resultados[Math.min(marcado, resultados.length - 1)];
      if (primero) elegir(primero);
      else if (/^\d{8,14}$/.test(consulta.trim())) leerCodigo(consulta.trim());
    }
  }

  function siguiente() {
    if (!elegido) return;
    const hecho: Contado = { productoId: elegido.id, nombre: elegido.nombre, unidad: elegido.unidad, habia: elegido.stock, hay: cuantas, sinEnviar: !enLinea };
    alCambiar([hecho, ...contados.filter((c) => c.productoId !== elegido.id)]);
    if (!enLinea) cambiarAlmacen((a) => ({ ...a, porEnviar: a.porEnviar + 1 }));
    setElegidoId(null);
    if (!esCelular) buscador.current?.focus();
  }

  function cerrar() {
    for (const c of conDiferencia) moverStock(c.productoId, c.hay - c.habia, `Conteo de ${sector.nombre}: había ${numero(c.habia)}, hay ${numero(c.hay)}`);
    alCerrar({ sector: sector.nombre, contados: contados.length, ajustes: conDiferencia.length });
  }

  return (
    <Pagina titulo={sector.nombre} ancho="angosto" estados={ESTADOS} volver={{ texto: "Volver", alTocar: alVolver }}>
      <div className="contar__conteo">
        {elegido ? (
          <form className="contar__producto" onSubmit={(e) => { e.preventDefault(); siguiente(); }}>
            <Boton variante="texto" tam="chico" icono="cerrar" className="contar__otro" onClick={() => setElegidoId(null)}>Contar otro</Boton>
            <h2>{elegido.nombre}</h2>
            <p className="detalle">{elegido.marca}{vaConDecimal(elegido.unidad) && ` · se cuenta por ${elegido.unidad}`}</p>
            {yaContado && <Aviso tipo="info" titulo={`Ya lo contaste: pusiste ${numero(yaContado.hay)}`}>Si seguís, queda la cantidad nueva.</Aviso>}
            <p className="contar__pregunta">¿Cuántas hay?</p>
            <Cantidad tam="grande" valor={cuantas} minimo={0} decimal={vaConDecimal(elegido.unidad)} alCambiar={setCuantas} etiqueta={`Cuántas hay de ${elegido.nombre}`} />
            <Boton type="submit" variante="principal" tam="grande" ancho iconoFinal="flecha">Siguiente</Boton>
          </form>
        ) : (
          <div className="contar__buscar">
            <Buscador
              ref={buscador}
              valor={consulta}
              alCambiar={(texto) => { setConsulta(texto); setMarcado(0); }}
              alTeclear={teclear}
              alEscanear={esCelular ? () => setEscaner(true) : undefined}
              etiqueta="Buscar el producto que vas a contar"
              placeholder={esCelular ? "Buscá o escaneá un producto" : "Escribí el nombre del producto o el código"}
              autoFocus={!esCelular}
            />
            {codigoSuelto && <Aviso tipo="alerta" titulo={`El código ${codigoSuelto} no está en el catálogo`} accion={{ texto: "Entendido", alTocar: () => setCodigoSuelto(null) }}>Buscá el producto por el nombre.</Aviso>}

            {consulta.trim() !== "" && (
              <div className="contar__resultados" role="listbox" aria-label="Productos encontrados">
                {resultados.map((p, i) => (
                  <button key={p.id} type="button" role="option" aria-selected={i === marcado} className={clases("contar__resultado", i === marcado && "contar__resultado--marcado")} onClick={() => elegir(p)} onMouseEnter={() => setMarcado(i)}>
                    <span><strong>{p.nombre}</strong><span>{p.marca}</span></span>
                    {contados.some((c) => c.productoId === p.id) && <Pastilla tipo="bien" icono="tilde">Contado</Pastilla>}
                    <Icono nombre="flecha" tam={18} />
                  </button>
                ))}
                {resultados.length === 0 && <p className="contar__sin-resultados">No hay productos con «{consulta.trim()}». Probá con otra palabra.</p>}
              </div>
            )}

            {consulta.trim() === "" && contados.length === 0 && faltan.length === 0 && (
              <Vacio icono="contar" titulo="Buscá o escaneá el primer producto">Poné cuántas hay y tocá «Siguiente». Así con cada producto del sector.</Vacio>
            )}

            {consulta.trim() === "" && faltan.length > 0 && (
              <section className="contar__lista" aria-label="Falta contar">
                <h3>Falta contar en {sector.nombre}</h3>
                <div className="contar__resultados">
                  {faltan.map((p) => (
                    <button key={p.id} type="button" className="contar__resultado" onClick={() => elegir(p)}>
                      <span><strong>{p.nombre}</strong><span>{p.marca}</span></span>
                      <Icono nombre="flecha" tam={18} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {contados.length > 0 && (
          <section className="contar__lista" aria-label="Ya contados">
            <h3>Ya contaste {plural(contados.length, "producto", "productos")}</h3>
            <ul className="contar__contados">
              {contados.map((c) => (
                <li key={c.productoId}>
                  <span className="contar__contado-texto">
                    <strong>{c.nombre}</strong>
                    <span className={clases(c.hay !== c.habia && "contar__diferencia")}>{c.hay === c.habia ? "Coincide" : `Había ${numero(c.habia)}, hay ${numero(c.hay)}`}{c.sinEnviar && " · guardado en el dispositivo"}</span>
                  </span>
                  <strong className="cifra contar__cuanto">{numero(c.hay)}</strong>
                  <Boton variante="texto" tam="chico" icono="basura" className="contar__quitar" aria-label={`Quitar ${c.nombre} de lo contado`} onClick={() => alCambiar(contados.filter((x) => x.productoId !== c.productoId))} />
                </li>
              ))}
            </ul>
            <Boton ancho onClick={() => setCerrando(true)}>Cerrar el conteo</Boton>
          </section>
        )}
      </div>

      <Escaner
        abierto={escaner}
        alCerrar={() => setEscaner(false)}
        alLeer={leerCodigo}
        ejemplos={[{ codigo: "7790001000015", nombre: "Mecha 6 mm madera" }, { codigo: CODIGO_DESCONOCIDO, nombre: "Un código que no está en el catálogo" }]}
      />

      <Confirmar abierta={cerrando} titulo={`¿Cerrar el conteo de ${sector.nombre}?`} confirmar="Sí, cerrar" alCancelar={() => setCerrando(false)} alConfirmar={cerrar}>
        {conDiferencia.length === 0 ? (
          <p>Contaste {plural(contados.length, "producto", "productos")} y todo coincide. No se cambia ninguna cantidad.</p>
        ) : (
          <>
            <p>Contaste {plural(contados.length, "producto", "productos")}. Al cerrar, el stock de {conDiferencia.length === 1 ? "este" : "estos"} queda como lo contaste:</p>
            <ul className="contar__diferencias">
              {conDiferencia.map((c) => <li key={c.productoId}><strong>{c.nombre}</strong><span>había {cantidad(c.habia, c.unidad).replace(/ .*/, "")}, hay {cantidad(c.hay, c.unidad)}</span></li>)}
            </ul>
          </>
        )}
        <p>{faltan.length > 0 ? `${plural(faltan.length, "producto que no contaste queda", "productos que no contaste quedan")} como ${faltan.length === 1 ? "está" : "están"}. ` : ""}No se puede deshacer.</p>
      </Confirmar>
    </Pagina>
  );
}
