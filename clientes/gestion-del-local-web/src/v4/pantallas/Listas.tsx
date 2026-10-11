import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { api, ErrorApi } from "../../api";
import { useConexion } from "../conexion";
import { fecha, hora, numero, pesosConCentavos } from "../formato";
import {
  Aviso, avisar, BarraDeAccion, Boton, Campo, Cargando, clases, ErrorDeCarga, Exito, Explicado, Hoja, Icono, Iniciales, Lista, Pagina, Pastilla, Renglon, Segmentos,
  TituloDeSeccion, tonoDe, Vacio,
} from "../piezas";
import { ir, useEsCelular } from "../rutas";
import "../estilos/listas.css";

// Cargar la lista de precios de un proveedor: entregar el archivo → revisar qué cambia →
// aplicar o descartar. Nada se guarda hasta «Aplicar». Todo el recorrido necesita internet.

type Proveedor = { id: string; nombre: string; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string; lector: string | null; activo: boolean };
type Salteada = { fila: number; motivo: string; contenido: string[] };
type Avance = { procesadas: number; total: number | null; etapa?: string };
type Resumen = { leidas: number; salteadas: number; nuevos: number; modificados: number; sin_cambio: number; dados_de_baja: number; variacion_promedio: number; salteadas_detalle?: Salteada[]; progreso?: Avance; error?: string };
type ListaCargada = { id: string; archivo_nombre: string; fecha_lista: string; estado: string; resumen: Resumen; avisos: string[]; importada_en: string | null; creado_en: string; proveedor_id: string; proveedor: string };
/** Una lista leída que espera la revisión: lo que devuelve la carga, o una pendiente que se retoma. */
type EnRevision = { id: string; proveedor: string; fecha_lista: string; resumen: Resumen; avisos: string[]; salteadas: Salteada[] };
type Fila = { codigo_proveedor: string; descripcion: string; marca: string | null; costo_neto: string; costo_anterior: string | null; explicacion: string[] };
type Paso = "portada" | "leyendo" | "falta-proveedor" | "falta-fecha" | "no-se-lee" | "revisar" | "aplicando" | "listo";

const DIAS_PARA_LISTA_VIEJA = 45;
const CUANTOS_EJEMPLOS = 6;
const IVA = 21;
/** Cada cuánto se le pregunta al servidor cómo va la aplicación. */
export const ESPERA_DEL_AVANCE = 800;
const SIN_INTERNET = "Revisá la conexión y probá de nuevo.";

const soloDia = (texto: string) => texto.slice(0, 10);
const diasDesde = (texto: string) => Math.max(0, Math.round((new Date().setHours(12, 0, 0, 0) - new Date(`${soloDia(texto)}T12:00:00`).getTime()) / 86400000));
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function hace(dias: number): string {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 31) return `hace ${dias} días`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;
}
const conMayuscula = (texto: string) => texto.replace(/^./, (l) => l.toUpperCase());

/** Cuándo se cargó, en palabras: "Hoy, 09:10", "Ayer", "Hace 4 días". */
function cuando(momento: string): string {
  const d = new Date(momento);
  const dias = diasDesde(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  return dias === 0 ? `Hoy, ${hora(d)}` : conMayuscula(hace(dias));
}

const porciento = (valor: number) => `${numero(Math.abs(valor))} %`;
const tituloDe = (l: { proveedor: string; fecha_lista: string }) => `${l.proveedor}, lista del ${fecha(soloDia(l.fecha_lista))}`;
const aGuardarDe = (r: Resumen) => r.nuevos + r.modificados;
const esExcel = (nombre: string) => /\.xlsx?$/i.test(nombre);

// ---------------------------------------------------------------- Pantalla

export function Listas() {
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();

  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [cargas, setCargas] = useState<ListaCargada[]>([]);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);

  const [paso, setPaso] = useState<Paso>("portada");
  const [archivo, setArchivo] = useState<File | null>(null);
  /** Por qué no se pudo leer; `null` cuando el archivo ni siquiera es un Excel. */
  const [motivo, setMotivo] = useState<{ texto: string; sePuedeRepetir: boolean } | null>(null);
  const [enRevision, setEnRevision] = useState<EnRevision | null>(null);
  const [avance, setAvance] = useState<Avance | null>(null);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [descartando, setDescartando] = useState(false);
  const [aplicada, setAplicada] = useState<Resumen | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [fechaEscrita, setFechaEscrita] = useState("");
  const [faltaLaFecha, setFaltaLaFecha] = useState(false);

  /** Lo que se averiguó preguntando (proveedor o fecha): va con el archivo al leerlo de nuevo. */
  const sabido = useRef<{ proveedor_id?: string; fecha_lista?: string }>({});
  /** Cada lectura o aplicación tiene su turno: si se sale del paso, la respuesta que llega tarde no se usa. */
  const turno = useRef(0);
  const entrada = useRef<HTMLInputElement>(null);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  const recargar = useCallback(async () => {
    try {
      const [p, l] = await Promise.all([api<Proveedor[]>("/proveedores"), api<ListaCargada[]>("/listas")]);
      if (!vivo.current) return;
      setProveedores(p.filter((x) => x.activo));
      setCargas(l);
      setErrorDeCarga(null);
    } catch (e) {
      if (vivo.current) setErrorDeCarga(e instanceof ErrorApi ? `${e.message}.` : SIN_INTERNET);
    }
  }, []);
  // Al entrar, y de nuevo cuando vuelve internet.
  useEffect(() => { if (enLinea) void recargar(); }, [enLinea, recargar]);
  useEffect(() => { if (!enLinea && proveedores === null) setErrorDeCarga(SIN_INTERNET); }, [enLinea, proveedores]);

  // ---- Leer la planilla

  async function leer(planilla: File) {
    const esteTurno = ++turno.current;
    setArchivo(planilla);
    setPaso("leyendo");
    window.scrollTo(0, 0);
    const cuerpo = new FormData();
    cuerpo.set("archivo", planilla, planilla.name);
    for (const [clave, valor] of Object.entries(sabido.current)) if (valor) cuerpo.set(clave, valor);
    try {
      const leida = await api<EnRevision>("/listas", { method: "POST", body: cuerpo });
      if (esteTurno !== turno.current) return;
      setEnRevision(leida);
      setRechazo(null);
      setPaso("revisar");
      void recargar();
    } catch (e) {
      if (esteTurno !== turno.current) return;
      const texto = e instanceof ErrorApi ? e.message : "";
      // El servidor dice con palabras qué le falta; el archivo queda elegido para no pedirlo de nuevo.
      if (texto.includes("de qué proveedor")) setPaso("falta-proveedor");
      else if (texto.includes("fecha de la lista")) { setFechaEscrita(""); setFaltaLaFecha(false); setPaso("falta-fecha"); }
      else {
        setMotivo(e instanceof ErrorApi ? { texto: `${texto.replace(/\.$/, "")}.`, sePuedeRepetir: false } : { texto: "Se cortó la conexión mientras se subía la planilla.", sePuedeRepetir: true });
        setPaso("no-se-lee");
      }
    }
  }

  function recibir(planilla: File | undefined) {
    if (!planilla || !enLinea) return;
    sabido.current = {};
    if (!esExcel(planilla.name)) { turno.current++; setArchivo(planilla); setMotivo(null); setPaso("no-se-lee"); return; }
    void leer(planilla);
  }

  const elegirArchivo = () => entrada.current?.click();

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    recibir(e.dataTransfer.files[0]);
  }

  function conLaFecha(e: FormEvent) {
    e.preventDefault();
    if (fechaEscrita === "") { setFaltaLaFecha(true); return; }
    sabido.current = { ...sabido.current, fecha_lista: fechaEscrita };
    if (archivo) void leer(archivo);
  }

  function conElProveedor(id: string) {
    sabido.current = { ...sabido.current, proveedor_id: id };
    if (archivo) void leer(archivo);
  }

  // ---- Revisar, aplicar, descartar

  function volverALaPortada() {
    turno.current++;
    setPaso("portada");
    setEnRevision(null);
    setArchivo(null);
    setRechazo(null);
    window.scrollTo(0, 0);
    void recargar();
  }

  function retomar(lista: ListaCargada) {
    setEnRevision({ id: lista.id, proveedor: lista.proveedor, fecha_lista: lista.fecha_lista, resumen: lista.resumen, avisos: lista.avisos, salteadas: lista.resumen.salteadas_detalle ?? [] });
    setRechazo(lista.resumen.error ?? null);
    setPaso("revisar");
    window.scrollTo(0, 0);
  }

  // Aplicar corre en el servidor; acá se le pregunta cómo va. `yaEmpezo` es para seguir una
  // aplicación que quedó andando (se recargó la página en el medio).
  async function aplicar(lista: EnRevision, yaEmpezo = false) {
    const esteTurno = ++turno.current;
    const sigue = () => vivo.current && esteTurno === turno.current;
    setRechazo(null);
    setAvance(lista.resumen.progreso ?? { procesadas: 0, total: lista.resumen.leidas });
    setPaso("aplicando");
    window.scrollTo(0, 0);
    try {
      if (!yaEmpezo) await api(`/listas/${lista.id}/aplicar`, { method: "POST" });
      while (sigue()) {
        await new Promise((listo) => window.setTimeout(listo, ESPERA_DEL_AVANCE));
        if (!sigue()) return;
        let estado: { estado: string; resumen: Resumen };
        try {
          estado = await api<{ estado: string; resumen: Resumen }>(`/listas/${lista.id}`);
        } catch (e) {
          if (e instanceof ErrorApi) throw e;
          continue; // un corte de internet no frena la aplicación: se vuelve a preguntar
        }
        if (!sigue()) return;
        if (estado.estado === "aplicada") { setAplicada(estado.resumen); setPaso("listo"); void recargar(); return; }
        if (estado.estado !== "aplicando") throw new ErrorApi(409, estado.resumen.error ?? "La aplicación se interrumpió y no se terminó de guardar. La lista sigue acá: volvé a tocar «Aplicar»");
        if (estado.resumen.progreso) setAvance(estado.resumen.progreso);
      }
    } catch (e) {
      if (!sigue()) return;
      setRechazo(e instanceof ErrorApi ? `${e.message.replace(/\.$/, "")}.` : "Para aplicar hace falta internet. Revisá la conexión y probá de nuevo.");
      setPaso("revisar");
    }
  }

  async function descartar() {
    if (!enRevision) return;
    setDescartando(true);
    setRechazo(null);
    try {
      await api(`/listas/${enRevision.id}/descartar`, { method: "POST" });
      volverALaPortada();
      avisar("Lista descartada", { detalle: "No se guardó ningún precio." });
    } catch (e) {
      setRechazo(e instanceof ErrorApi ? `${e.message}.` : "Para descartar hace falta internet. Revisá la conexión y probá de nuevo.");
    } finally {
      setDescartando(false);
    }
  }

  const volver = paso === "portada" ? undefined : paso === "aplicando" ? false as const : { texto: "Volver a las listas", alTocar: volverALaPortada };
  const nombreDelArchivo = archivo?.name ?? "la planilla";
  const selector = <input ref={entrada} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { recibir(e.target.files?.[0]); e.target.value = ""; }} data-testid="archivo" />;

  // ---- Lista aplicada

  if (paso === "listo" && enRevision && aplicada) {
    return (
      <Pagina titulo="Listas de precios" volver={volver} testId="listas">
        <Exito
          titulo={`Listo: ${numero(aGuardarDe(aplicada))} precios actualizados`}
          detalle={`${tituloDe(enRevision)}: ${numero(aplicada.nuevos)} ${aplicada.nuevos === 1 ? "producto nuevo" : "productos nuevos"} y ${numero(aplicada.modificados)} con precio nuevo.`}
          boton="Ver los productos"
          alSeguir={() => ir("productos")}
        />
      </Pagina>
    );
  }

  // ---- Pasos con el archivo en la mano

  if (paso !== "portada") {
    const guardando = avance?.etapa !== "duplicados";
    const total = avance?.total ?? enRevision?.resumen.leidas ?? 0;
    // Los precios llenan hasta el 90 %; lo que queda es la búsqueda de repetidos, que no avisa cuánto le falta.
    const porcentaje = guardando ? (total ? ((avance?.procesadas ?? 0) / total) * 90 : 0) : 95;
    return (
      <Pagina titulo="Listas de precios" volver={volver} ancho={paso === "revisar" ? "normal" : "angosto"} testId={paso === "revisar" ? "revision" : "listas"}>
        {paso === "leyendo" && (
          <div className="listas__paso">
            <Cargando texto={`Leyendo ${nombreDelArchivo}…`} detalle="Se fija de qué proveedor es y qué precios cambian. Todavía no se guarda nada." />
          </div>
        )}

        {paso === "aplicando" && enRevision && (
          <div className="listas__paso">
            <Cargando
              texto={guardando ? `Guardando los precios de ${enRevision.proveedor}…` : "Buscando productos repetidos con otros proveedores…"}
              avance={porcentaje}
              detalle={guardando
                ? "Después se buscan productos repetidos con otros proveedores. Podés dejar esta pantalla abierta."
                : `Los ${numero(aGuardarDe(enRevision.resumen))} precios ya están guardados. Falta poco.`}
            />
          </div>
        )}

        {paso === "falta-proveedor" && (
          <div className="listas__paso listas__pregunta" data-testid="falta-proveedor">
            <span className="listas__signo"><Icono nombre="alerta" tam={28} /></span>
            <h2>¿De qué proveedor es esta planilla?</h2>
            <p>No se reconoce de quién es <strong>{nombreDelArchivo}</strong>. Elegilo y se lee de nuevo: no hace falta volver a elegir el archivo.</p>
            <div className="listas__opciones" data-testid="elegir-proveedor">
              {(proveedores ?? []).map((p) => (
                <button key={p.id} type="button" className="listas__opcion" onClick={() => conElProveedor(p.id)} data-testid="proveedor-opcion">
                  <Iniciales nombre={p.nombre} tono={tonoDe(p.id)} forma="cuadrada" />
                  <strong>{p.nombre}</strong>
                  <Icono nombre="flecha" tam={18} />
                </button>
              ))}
            </div>
            <Boton variante="texto" icono="mas" onClick={() => setAgregando(true)} data-testid="agregar-proveedor">Es de un proveedor nuevo</Boton>
          </div>
        )}

        {paso === "falta-fecha" && (
          <form className="listas__paso listas__pregunta" onSubmit={conLaFecha} noValidate data-testid="falta-fecha">
            <span className="listas__signo"><Icono nombre="calendario" tam={28} /></span>
            <h2>¿De qué fecha es esta lista?</h2>
            <p>La planilla <strong>{nombreDelArchivo}</strong> no lo dice. Con la fecha se sabe cuál es la lista más nueva de cada proveedor.</p>
            <Campo
              className="listas__fecha"
              etiqueta="Fecha de la lista"
              type="date"
              max={hoy()}
              value={fechaEscrita}
              onChange={(e) => { setFechaEscrita(e.target.value); setFaltaLaFecha(false); }}
              error={faltaLaFecha ? "Poné la fecha de la lista para seguir." : null}
              data-testid="elegir-fecha"
            />
            <Boton type="submit" variante="principal" tam="grande" ancho data-testid="seguir">Seguir</Boton>
          </form>
        )}

        {paso === "no-se-lee" && (
          <div className="listas__paso listas__pregunta" data-testid="error-de-carga">
            <span className="listas__signo listas__signo--error"><Icono nombre="error" tam={28} /></span>
            <h2>No se pudo leer el archivo</h2>
            {motivo
              ? <p><strong>{nombreDelArchivo}</strong>: {motivo.texto} No se guardó nada.</p>
              : <p><strong>{nombreDelArchivo}</strong> no es una planilla de Excel. Pedile al proveedor la lista en Excel (.xlsx o .xls) y probá de nuevo. No se guardó nada.</p>}
            {motivo?.sePuedeRepetir && archivo
              ? <Boton variante="principal" tam="grande" icono="deshacer" ancho disabled={!enLinea} onClick={() => void leer(archivo)} data-testid="probar-de-nuevo">Probar de nuevo</Boton>
              : <Boton variante="principal" tam="grande" icono="subir" ancho disabled={!enLinea} onClick={elegirArchivo} data-testid="elegir-archivo">Elegir otra planilla</Boton>}
          </div>
        )}

        {paso === "revisar" && enRevision && (
          <Revisar lista={enRevision} enLinea={enLinea} rechazo={rechazo} descartando={descartando} alAplicar={() => void aplicar(enRevision)} alDescartar={() => void descartar()} />
        )}

        {selector}
        <AgregarProveedor abierta={agregando} enLinea={enLinea} alCerrar={() => setAgregando(false)} alAgregar={(p) => { void recargar(); conElProveedor(p.id); }} />
      </Pagina>
    );
  }

  // ---- Portada

  if (proveedores === null) {
    return (
      <Pagina titulo="Listas de precios" testId="listas">
        {errorDeCarga
          ? <ErrorDeCarga titulo="No se pudieron traer las listas" alReintentar={() => { setErrorDeCarga(null); void recargar(); }} testId="error-listas">{errorDeCarga}</ErrorDeCarga>
          : <Cargando texto="Buscando las listas…" />}
      </Pagina>
    );
  }

  const pendientes = cargas.filter((c) => c.estado === "pendiente");
  // Las cargas vienen de la más nueva a la más vieja: la primera aplicada de cada proveedor es la vigente.
  const ultima = new Map<string, ListaCargada>();
  for (const c of cargas) if (c.estado === "aplicada" && !ultima.has(c.proveedor_id)) ultima.set(c.proveedor_id, c);

  return (
    <Pagina titulo="Listas de precios" testId="listas">
      {!enLinea && <Aviso tipo="alerta" testId="aviso-sin-conexion">Cargar una lista necesita internet. Lo demás sigue funcionando.</Aviso>}
      {enLinea && errorDeCarga && <Aviso tipo="error" titulo="No se pudieron actualizar las listas" accion={{ texto: "Reintentar", alTocar: () => void recargar() }} testId="error-listas">{errorDeCarga}</Aviso>}

      {proveedores.length === 0 ? (
        <Vacio icono="listas" titulo="Todavía no hay proveedores" principal={{ texto: "Agregar el primer proveedor", icono: "mas", alTocar: () => setAgregando(true) }} testId="sin-proveedores">El primer paso es agregar un proveedor. Después cargás su planilla y entran sus productos con el costo.</Vacio>
      ) : (
        <>
          <section
            className={clases("listas__zona", arrastrando && "listas__zona--arrastrando")}
            aria-label="Cargar una planilla"
            onDragOver={(e) => { e.preventDefault(); if (enLinea) setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
            data-testid="zona-de-carga"
          >
            <span className="listas__icono"><Icono nombre="subir" tam={30} /></span>
            <div className="listas__zona-texto">
              <h2>{arrastrando ? "Soltala acá" : esCelular ? "Cargá la planilla del proveedor" : "Arrastrá acá la planilla del proveedor"}</h2>
              <p>Es el Excel que te manda. Se reconoce sola de quién es, y no se guarda nada hasta que la revises.</p>
            </div>
            <Boton variante="principal" tam="grande" icono="subir" disabled={!enLinea} onClick={elegirArchivo} data-testid="elegir-archivo">Elegir archivo</Boton>
          </section>

          {pendientes.map((p) => (
            <Aviso key={p.id} tipo="alerta" titulo="Hay una lista sin revisar" accion={{ texto: "Retomar", alTocar: () => retomar(p) }} testId="lista-pendiente">
              {tituloDe(p)}. Todavía no se guardó nada.
            </Aviso>
          ))}

          <TituloDeSeccion titulo="Proveedores">
            <Boton tam="chico" icono="mas" onClick={() => setAgregando(true)} data-testid="agregar-proveedor">Agregar proveedor</Boton>
          </TituloDeSeccion>
          <ul className="listas__proveedores" data-testid="estado-proveedores">
            {proveedores.map((p) => {
              const lista = ultima.get(p.id);
              const dias = lista ? diasDesde(lista.fecha_lista) : null;
              return (
                <li key={p.id} className="listas__proveedor" data-testid="proveedor">
                  <Iniciales nombre={p.nombre} tono={tonoDe(p.id)} forma="cuadrada" />
                  <div className="listas__proveedor-texto">
                    <h3>{p.nombre}</h3>
                    <p>{lista ? `Última lista: ${fecha(soloDia(lista.fecha_lista))}` : "Todavía sin lista"}</p>
                  </div>
                  {dias !== null && (dias > DIAS_PARA_LISTA_VIEJA
                    ? <Pastilla tipo="alerta" icono="alerta" testId="lista-vieja">Vieja: {hace(dias)}</Pastilla>
                    : <span className="listas__hace">{conMayuscula(hace(dias))}</span>)}
                </li>
              );
            })}
          </ul>

          {cargas.length > 0 && (
            <>
              <TituloDeSeccion titulo="Últimas cargas" />
              <Lista data-testid="historial">
                {cargas.slice(0, 5).map((c) => (
                  <Renglon
                    key={c.id}
                    className="listas__carga"
                    testId="carga"
                    titulo={tituloDe(c)}
                    detalle={c.estado === "aplicada" ? `${cuando(c.importada_en ?? c.creado_en)} · ${numero(aGuardarDe(c.resumen))} precios actualizados` : cuando(c.creado_en)}
                    fin={<>
                      {c.estado === "aplicada" && <Pastilla tipo="bien" icono="tilde">Aplicada</Pastilla>}
                      {c.estado === "descartada" && <Pastilla>Descartada</Pastilla>}
                      {c.estado === "pendiente" && <Pastilla tipo="alerta">Sin revisar</Pastilla>}
                      {c.estado === "pendiente" && <Boton tam="chico" aria-label={`Retomar la lista de ${c.proveedor}`} onClick={() => retomar(c)} data-testid="retomar">Retomar</Boton>}
                      {c.estado === "aplicando" && <Pastilla tipo="info">Aplicándose</Pastilla>}
                      {c.estado === "aplicando" && <Boton tam="chico" aria-label={`Ver cómo va la lista de ${c.proveedor}`} onClick={() => { const lista = { id: c.id, proveedor: c.proveedor, fecha_lista: c.fecha_lista, resumen: c.resumen, avisos: c.avisos, salteadas: [] }; setEnRevision(lista); void aplicar(lista, true); }} data-testid="ver-avance">Ver avance</Boton>}
                    </>}
                  />
                ))}
              </Lista>
            </>
          )}
        </>
      )}

      {selector}
      <AgregarProveedor abierta={agregando} enLinea={enLinea} alCerrar={() => setAgregando(false)} alAgregar={(p) => { void recargar(); avisar(`Proveedor ${p.nombre} agregado`, { detalle: "Ya podés cargar su planilla." }); }} />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Revisar antes de aplicar

type PropsDeRevisar = { lista: EnRevision; enLinea: boolean; rechazo: string | null; descartando: boolean; alAplicar: () => void; alDescartar: () => void };

function Revisar({ lista, enLinea, rechazo, descartando, alAplicar, alDescartar }: PropsDeRevisar) {
  const r = lista.resumen;
  const [ejemplos, setEjemplos] = useState<Fila[] | null>(null);
  const [errorDeEjemplos, setErrorDeEjemplos] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Los ejemplos son las primeras filas de la vista previa: las que cambian de precio van primero.
  useEffect(() => {
    let vigente = true;
    setErrorDeEjemplos(null);
    api<{ total: number; filas: Fila[] }>(`/listas/${lista.id}/filas`)
      .then((x) => { if (vigente) setEjemplos(x.filas.slice(0, CUANTOS_EJEMPLOS)); })
      .catch((e: unknown) => { if (vigente) setErrorDeEjemplos(e instanceof ErrorApi ? `${e.message}.` : SIN_INTERNET); });
    return () => { vigente = false; };
  }, [lista.id, intento]);

  const salteadas = lista.salteadas.slice(0, 3).map((s) => `fila ${numero(s.fila)} (${s.motivo})`);
  const mas = r.salteadas - salteadas.length;

  return (
    <div className="listas__revisar">
      <header className="listas__cabeza">
        <h2>{tituloDe(lista)}</h2>
        <p>Mirá qué cambia. Si algo no cierra, descartala: no pasa nada.</p>
      </header>

      {rechazo && <Aviso tipo="error" titulo="No se pudo terminar" testId="error-revision">{rechazo}</Aviso>}
      {lista.avisos.map((aviso, i) => <Aviso key={i} tipo="alerta" testId="aviso-de-lectura">{aviso}</Aviso>)}

      <ul className="listas__numeros" data-testid="resumen">
        <li>
          <strong className="cifra">{numero(r.nuevos)}</strong>
          <span>{r.nuevos === 1 ? "producto nuevo" : "productos nuevos"}</span>
        </li>
        <li className="listas__numero--cambian">
          <strong className="cifra">{numero(r.modificados)}</strong>
          <span>{r.modificados === 1 ? "cambia de precio" : "cambian de precio"}</span>
          {r.modificados > 0 && <em><Icono nombre={r.variacion_promedio >= 0 ? "flecha-arriba" : "flecha-abajo"} tam={16} grosor={2.4} />{r.variacion_promedio >= 0 ? "Suben" : "Bajan"} {porciento(r.variacion_promedio)} en promedio</em>}
        </li>
        <li>
          <strong className="cifra">{numero(r.sin_cambio)}</strong>
          <span>{r.sin_cambio === 1 ? "queda igual" : "quedan igual"}</span>
        </li>
      </ul>

      {(r.salteadas > 0 || r.dados_de_baja > 0) && (
        <Aviso tipo="info" testId="fuera-de-la-lista">
          {r.salteadas > 0 && <>{r.salteadas === 1 ? "Una fila de la planilla no se pudo leer" : `${numero(r.salteadas)} filas de la planilla no se pudieron leer`}{salteadas.length > 0 && `: ${salteadas.join(", ")}${mas > 0 ? ` y ${numero(mas)} más` : ""}`}. </>}
          {r.dados_de_baja > 0 && (r.dados_de_baja === 1 ? "Un producto que estaba en la lista anterior ya no aparece." : `${numero(r.dados_de_baja)} productos que estaban en la lista anterior ya no aparecen.`)}
        </Aviso>
      )}

      <h3 className="listas__subtitulo">Algunos ejemplos</h3>
      {ejemplos === null && !errorDeEjemplos && <Cargando texto="Buscando ejemplos…" testId="buscando-ejemplos" />}
      {errorDeEjemplos && <Aviso tipo="error" titulo="No se pudieron traer los ejemplos" accion={{ texto: "Reintentar", alTocar: () => setIntento((n) => n + 1) }} testId="error-ejemplos">{errorDeEjemplos}</Aviso>}
      {ejemplos && (
        <ul className="listas__ejemplos" data-testid="vista-previa">
          {ejemplos.map((e) => {
            const antes = e.costo_anterior === null ? null : Number(e.costo_anterior);
            const ahora = Number(e.costo_neto);
            const cambio = antes === null || antes <= 0 ? null : ((ahora - antes) / antes) * 100;
            return (
              <li key={e.codigo_proveedor} data-testid="ejemplo">
                <span className="listas__ejemplo-nombre"><strong>{e.descripcion}</strong><span>{e.marca}</span></span>
                <span className="listas__ejemplo-costo">
                  {antes !== null ? <span>Costo: de {pesosConCentavos(antes)} a</span> : <span>Costo:</span>}
                  <strong className="cifra"><Explicado valor={pesosConCentavos(ahora)} pasos={e.explicacion} titulo={`Costo de ${e.descripcion}`} /></strong>
                </span>
                {antes === null
                  ? <Pastilla tipo="info">Nuevo</Pastilla>
                  : cambio === null || cambio === 0
                    ? <Pastilla>Igual</Pastilla>
                    : cambio > 0
                      ? <Pastilla tipo="error" icono="flecha-arriba">Sube {porciento(cambio)}</Pastilla>
                      : <Pastilla tipo="bien" icono="flecha-abajo">Baja {porciento(cambio)}</Pastilla>}
              </li>
            );
          })}
        </ul>
      )}

      <BarraDeAccion className="listas__aplicar">
        <p className="listas__nada"><Icono nombre="informacion" tam={20} />{enLinea ? "Todavía no se guardó nada." : "Sin conexión: para aplicar hace falta internet."}</p>
        <Boton disabled={!enLinea || descartando} onClick={alDescartar} data-testid="descartar">{descartando ? "Descartando…" : "Descartar"}</Boton>
        <Boton variante="principal" tam="grande" disabled={!enLinea || descartando} onClick={alAplicar} data-testid="aplicar">Aplicar {numero(aGuardarDe(r))} precios</Boton>
      </BarraDeAccion>
    </div>
  );
}

// ---------------------------------------------------------------- Agregar proveedor

type PropsDeAgregar = { abierta: boolean; enLinea: boolean; alCerrar: () => void; alAgregar: (proveedor: { id: string; nombre: string }) => void };

function AgregarProveedor({ abierta, enLinea, alCerrar, alAgregar }: PropsDeAgregar) {
  const [nombre, setNombre] = useState("");
  const [iva, setIva] = useState<"sin" | "con">("sin");
  const [descuento, setDescuento] = useState("");
  const [errorDelNombre, setErrorDelNombre] = useState<string | null>(null);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierta) { setNombre(""); setIva("sin"); setDescuento(""); setErrorDelNombre(null); setRechazo(null); setGuardando(false); }
  }, [abierta]);

  const porcentaje = Math.min(99, Number(descuento) || 0);
  const costoDeEjemplo = (1000 / (iva === "con" ? 1 + IVA / 100 : 1)) * (1 - porcentaje / 100);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = nombre.trim();
    if (limpio === "") { setErrorDelNombre("Escribí el nombre del proveedor."); return; }
    if (guardando) return;
    setGuardando(true);
    setRechazo(null);
    try {
      const creado = await api<{ id?: string } | undefined>("/proveedores", {
        method: "POST",
        body: JSON.stringify({ nombre: limpio, lector: null, precios_incluyen_iva: iva === "con", descuento_general: porcentaje / 100, descuento_contado: 0 }),
      });
      // Si la respuesta no trae el proveedor, se busca por el nombre recién puesto.
      const id = creado?.id ?? (await api<Proveedor[]>("/proveedores")).find((p) => p.nombre.toLowerCase() === limpio.toLowerCase())?.id ?? "";
      alCerrar();
      alAgregar({ id, nombre: limpio });
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 409) setErrorDelNombre(`Ya hay un proveedor que se llama ${limpio}.`);
      else setRechazo(err instanceof ErrorApi ? `${err.message}.` : "Para agregar un proveedor hace falta internet. Revisá la conexión y probá de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Agregar proveedor" testId="panel-proveedores">
      <form className="listas__formulario" onSubmit={(e) => void enviar(e)} noValidate>
        <Campo etiqueta="Nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); setErrorDelNombre(null); }} error={errorDelNombre} placeholder="Por ejemplo: Ferretera del Sur" autoFocus data-testid="nombre-del-proveedor" />
        <div className="listas__grupo">
          <p>Sus precios de lista vienen</p>
          <Segmentos etiqueta="Sus precios de lista vienen" opciones={[{ clave: "sin", nombre: "Sin IVA" }, { clave: "con", nombre: "Con IVA incluido" }]} elegido={iva} alElegir={setIva} testId="iva" />
        </div>
        <Campo
          etiqueta="Descuento que te hace"
          sufijo="%"
          inputMode="numeric"
          value={descuento}
          onChange={(e) => setDescuento(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 2))}
          ayuda="Si no te hace descuento, dejalo vacío."
          data-testid="descuento-del-proveedor"
        />
        <p className="listas__ejemplo-de-costo" data-testid="ejemplo-de-costo">
          Con esto, si su lista dice <strong>$1.000,00</strong> el costo queda en <strong>{pesosConCentavos(costoDeEjemplo)}</strong>.
        </p>
        {rechazo && <Aviso tipo="error" titulo="No se pudo agregar" testId="error-proveedor">{rechazo}</Aviso>}
        {!enLinea && <Aviso tipo="alerta">Agregar un proveedor necesita internet.</Aviso>}
        <Boton type="submit" variante="principal" tam="grande" ancho disabled={guardando || !enLinea} data-testid="guardar-proveedor">{guardando ? "Agregando…" : "Agregar proveedor"}</Boton>
      </form>
    </Hoja>
  );
}
