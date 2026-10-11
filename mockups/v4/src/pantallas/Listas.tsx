import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { cambiarAlmacen, nuevoId, useAlmacen } from "../almacen";
import { DIAS_PARA_LISTA_VIEJA, IVA, numero, pesosConCentavos, PROVEEDORES, type Proveedor, type Tono } from "../datos";
import { useConexion } from "../estructura/conexion";
import {
  Aviso, avisar, BarraDeAccion, Boton, Campo, Cargando, clases, ErrorDeCarga, Exito, Hoja, Icono, Iniciales, Lista, Pagina, Pastilla, Renglon, Segmentos,
  TituloDeSeccion, Vacio, useEstadoDeMaqueta, type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro, ir, useEsCelular } from "../ruta";
import "../estilos/listas.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "leyendo", nombre: "Leyendo la planilla" },
  { clave: "revisar", nombre: "Revisar antes de aplicar" },
  { clave: "aplicando", nombre: "Aplicando la lista" },
  { clave: "listo", nombre: "Lista aplicada" },
  { clave: "sin-proveedor", nombre: "No se reconoce el proveedor" },
  { clave: "sin-fecha", nombre: "La planilla no dice la fecha" },
  { clave: "no-se-lee", nombre: "Archivo que no se puede leer" },
  { clave: "sin-proveedores", nombre: "Sin proveedores todavía" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
  { clave: "cargando", nombre: "Cargando" },
  { clave: "error", nombre: "No se pudo cargar" },
];

// ---------------------------------------------------------------- Datos que le faltan a lo compartido

type Resumen = { nuevos: number; cambian: number; sinCambio: number; promedio: number };
type Ejemplo = { nombre: string; marca: string; antes: number | null; ahora: number };
type Carga = {
  id: string;
  proveedorId: string;
  proveedor: string;
  /** Cuántos días atrás es la fecha que dice la lista. */
  diasDeLaLista: number;
  /** Cuándo se cargó, en palabras. */
  cuando: string;
  estado: "aplicada" | "sin-revisar" | "descartada";
  resumen: Resumen;
  ejemplos: Ejemplo[];
};

const ARCHIVO_DE_EJEMPLO = "comodo-octubre.xlsx";

/** Los proveedores con los que arranca la maqueta (los que se agregan después no están acá). */
const DE_ENTRADA = new Set(PROVEEDORES.map((p) => p.id));

const EJEMPLOS_DE_COMODO: Ejemplo[] = [
  { nombre: "Mecha 6 mm madera", marca: "Bosch", antes: 1524, ahora: 1649.14 },
  { nombre: "Clavo punta París 2 pulgadas", marca: "Acindar", antes: 4760, ahora: 5200 },
  { nombre: "Cinta aisladora negra 20 m", marca: "Tacsa", antes: 838, ahora: 812 },
  { nombre: "Disco de corte 115 mm", marca: "Tyrolit", antes: null, ahora: 1180 },
];

const EJEMPLOS_DE_TRESGE: Ejemplo[] = [
  { nombre: "Llave francesa 10 pulgadas", marca: "Bahco", antes: 16100, ahora: 16800 },
  { nombre: "Mecha 6 mm para hormigón", marca: "Irwin", antes: 3240, ahora: 3100 },
  { nombre: "Pinza universal 8 pulgadas", marca: "Bahco", antes: null, ahora: 9450 },
];

const CARGAS_AL_EMPEZAR: Carga[] = [
  { id: "l-5", proveedorId: "tresge", proveedor: "Tresge", diasDeLaLista: 2, cuando: "Hoy, 09:10", estado: "sin-revisar", resumen: { nuevos: 3, cambian: 96, sinCambio: 1120, promedio: 4.6 }, ejemplos: EJEMPLOS_DE_TRESGE },
  { id: "l-4", proveedorId: "tresge", proveedor: "Tresge", diasDeLaLista: 4, cuando: "Hace 4 días", estado: "aplicada", resumen: { nuevos: 0, cambian: 41, sinCambio: 1175, promedio: 2.1 }, ejemplos: EJEMPLOS_DE_TRESGE },
  { id: "l-3", proveedorId: "comodo", proveedor: "Comodo", diasDeLaLista: 15, cuando: "Hace 15 días", estado: "aplicada", resumen: { nuevos: 28, cambian: 902, sinCambio: 6154, promedio: 5.3 }, ejemplos: EJEMPLOS_DE_COMODO },
  { id: "l-2", proveedorId: "erpa", proveedor: "Erpa", diasDeLaLista: 60, cuando: "Hace 2 meses", estado: "descartada", resumen: { nuevos: 0, cambian: 0, sinCambio: 0, promedio: 0 }, ejemplos: [] },
];

function nuevaDeComodo(proveedor: Proveedor | undefined, diasDeLaLista = 1): Carga {
  return {
    id: nuevoId("l"), proveedorId: proveedor?.id ?? "comodo", proveedor: proveedor?.nombre ?? "Comodo", diasDeLaLista, cuando: "Recién", estado: "sin-revisar",
    resumen: { nuevos: 12, cambian: 1340, sinCambio: 5744, promedio: 8.2 }, ejemplos: EJEMPLOS_DE_COMODO,
  };
}

/** La fecha de hace tantos días, como "09/10/2026". */
function fechaDeHace(dias: number): string {
  const momento = new Date();
  momento.setDate(momento.getDate() - dias);
  return momento.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function hace(dias: number): string {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 31) return `hace ${dias} días`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;
}

function porciento(valor: number): string {
  return `${numero(Math.abs(valor))} %`;
}

type Paso = "portada" | "leyendo" | "falta-proveedor" | "falta-fecha" | "no-se-lee" | "revisar" | "aplicando" | "listo";

const PASO_DE_ESTADO: Record<string, Paso> = {
  leyendo: "leyendo", revisar: "revisar", aplicando: "aplicando", listo: "listo",
  "sin-proveedor": "falta-proveedor", "sin-fecha": "falta-fecha", "no-se-lee": "no-se-lee",
};

// ---------------------------------------------------------------- Pantalla

export default function Listas() {
  const estado = useEstadoDeMaqueta();
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const todosLosProveedores = useAlmacen((a) => a.proveedores);

  const [paso, setPaso] = useState<Paso>("portada");
  const [avance, setAvance] = useState(0);
  const [archivo, setArchivo] = useState(ARCHIVO_DE_EJEMPLO);
  const [cargas, setCargas] = useState<Carga[]>(CARGAS_AL_EMPEZAR);
  const [enRevision, setEnRevision] = useState<Carga | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const [fechaEscrita, setFechaEscrita] = useState("");
  const [faltaLaFecha, setFaltaLaFecha] = useState(false);
  /** Lo que se averiguó preguntando (proveedor o fecha), para armar la lista al terminar de leer. */
  const sabido = useRef<{ proveedor?: Proveedor; dias?: number }>({});
  /** Cuando el recorrido sigue desde un estado de maqueta, el cambio de dirección no reinicia el paso. */
  const sigueElRecorrido = useRef(false);

  const sinProveedores = estado === "sin-proveedores";
  const proveedores = sinProveedores ? todosLosProveedores.filter((p) => !DE_ENTRADA.has(p.id)) : todosLosProveedores;
  const lasCargas = sinProveedores ? [] : cargas;
  const pendiente = lasCargas.find((c) => c.estado === "sin-revisar");
  const quieto = estado === "leyendo" || estado === "aplicando";

  // Cada estado de maqueta deja la pantalla en el paso que hay que mirar.
  useEffect(() => {
    if (sigueElRecorrido.current) { sigueElRecorrido.current = false; return; }
    const destino = PASO_DE_ESTADO[estado] ?? "portada";
    sabido.current = {};
    setArchivo(estado === "no-se-lee" ? "presupuesto-comodo.pdf" : ARCHIVO_DE_EJEMPLO);
    setAvance(estado === "leyendo" ? 62 : estado === "aplicando" ? 46 : 0);
    setFechaEscrita("");
    setFaltaLaFecha(false);
    if (destino === "revisar" || destino === "aplicando" || destino === "listo") setEnRevision(nuevaDeComodo(todosLosProveedores.find((p) => p.id === "comodo")));
    setPaso(destino);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  // La barra de avance camina sola mientras se lee o se aplica (salvo en los estados de maqueta, que se quedan quietos).
  useEffect(() => {
    if (quieto || (paso !== "leyendo" && paso !== "aplicando")) return;
    const reloj = window.setInterval(() => setAvance((a) => Math.min(100, a + (paso === "leyendo" ? 9 : 4))), 130);
    return () => window.clearInterval(reloj);
  }, [paso, quieto]);

  useEffect(() => {
    if (avance < 100 || quieto) return;
    if (paso === "leyendo") {
      const lista = nuevaDeComodo(sabido.current.proveedor ?? todosLosProveedores.find((p) => p.id === "comodo"), sabido.current.dias);
      setCargas((antes) => [lista, ...antes]);
      setEnRevision(lista);
      setPaso("revisar");
      window.scrollTo(0, 0);
    }
    if (paso === "aplicando" && enRevision) {
      marcar(enRevision, "aplicada");
      // La fecha de la última lista vive en el almacén: Productos la lee de ahí.
      cambiarAlmacen((a) => ({ ...a, proveedores: a.proveedores.map((p) => (p.id === enRevision.proveedorId ? { ...p, diasDeLaLista: enRevision.diasDeLaLista } : p)) }));
      setPaso("listo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avance, paso, quieto]);

  /** Si se venía mirando un estado de maqueta, el control vuelve a «Normal» sin reiniciar el recorrido. */
  function seguir() {
    if (estado !== "normal" && estado !== "sin-conexion") { sigueElRecorrido.current = true; cambiarParametro("estado", null); }
  }

  function marcar(carga: Carga, como: Carga["estado"]) {
    setCargas((antes) => (antes.some((c) => c.id === carga.id) ? antes : [carga, ...antes]).map((c) => (c.id === carga.id ? { ...c, estado: como, cuando: como === "sin-revisar" ? c.cuando : "Recién" } : c)));
  }

  function leer(nombre: string) {
    seguir();
    setArchivo(nombre);
    if (!/\.xlsx?$/i.test(nombre)) { setPaso("no-se-lee"); return; }
    setAvance(0);
    setPaso("leyendo");
  }

  function elegirArchivo() {
    sabido.current = {};
    leer(ARCHIVO_DE_EJEMPLO);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    if (!enLinea) return;
    sabido.current = {};
    leer(e.dataTransfer.files[0]?.name ?? ARCHIVO_DE_EJEMPLO);
  }

  function volverALaPortada() {
    seguir();
    setPaso("portada");
    setEnRevision(null);
    window.scrollTo(0, 0);
  }

  function retomar(carga: Carga) {
    setEnRevision(carga);
    setPaso("revisar");
    window.scrollTo(0, 0);
  }

  function aplicar() {
    seguir();
    setAvance(0);
    setPaso("aplicando");
    window.scrollTo(0, 0);
  }

  function descartar() {
    if (!enRevision) return;
    marcar(enRevision, "descartada");
    avisar("Lista descartada", { detalle: "No se guardó ningún precio." });
    volverALaPortada();
  }

  function conLaFecha(e: FormEvent) {
    e.preventDefault();
    if (fechaEscrita === "") { setFaltaLaFecha(true); return; }
    const dias = Math.max(0, Math.round((Date.now() - new Date(`${fechaEscrita}T12:00:00`).getTime()) / 86400000));
    sabido.current = { dias };
    leer(archivo);
  }

  const volver = paso === "portada" ? undefined : paso === "aplicando" ? false as const : { texto: "Volver a las listas", alTocar: volverALaPortada };
  const aGuardar = enRevision ? enRevision.resumen.nuevos + enRevision.resumen.cambian : 0;
  const tituloDeLaLista = enRevision ? `${enRevision.proveedor}, lista del ${fechaDeHace(enRevision.diasDeLaLista)}` : "";

  // ---- Estados de carga de la pantalla

  if (estado === "cargando" || estado === "error") {
    return (
      <Pagina titulo="Listas de precios" estados={ESTADOS}>
        {estado === "cargando"
          ? <Cargando texto="Buscando las listas…" />
          : <ErrorDeCarga titulo="No se pudieron traer las listas" alReintentar={() => cambiarParametro("estado", null)}>Revisá la conexión y probá de nuevo.</ErrorDeCarga>}
      </Pagina>
    );
  }

  // ---- Lista aplicada

  if (paso === "listo" && enRevision) {
    return (
      <Pagina titulo="Listas de precios" estados={ESTADOS} volver={volver}>
        <Exito
          titulo={`Listo: ${numero(aGuardar)} precios actualizados`}
          detalle={`${tituloDeLaLista}: ${numero(enRevision.resumen.nuevos)} productos nuevos y ${numero(enRevision.resumen.cambian)} con precio nuevo.`}
          boton="Ver los productos"
          alSeguir={() => ir("productos")}
        />
      </Pagina>
    );
  }

  // ---- Pasos con el archivo en la mano

  if (paso !== "portada") {
    return (
      <Pagina titulo="Listas de precios" estados={ESTADOS} volver={volver} ancho={paso === "revisar" ? "normal" : "angosto"}>
        {paso === "leyendo" && (
          <div className="listas__paso">
            <Cargando texto={`Leyendo ${archivo}…`} avance={avance} detalle="Se fija de qué proveedor es y qué precios cambian. Todavía no se guarda nada." />
          </div>
        )}

        {paso === "aplicando" && enRevision && (
          <div className="listas__paso">
            <Cargando
              texto={avance < 75 ? `Guardando los precios de ${enRevision.proveedor}…` : "Buscando productos repetidos con otros proveedores…"}
              avance={avance}
              detalle={avance < 75
                ? "Después se buscan productos repetidos con otros proveedores. Podés dejar esta pantalla abierta."
                : `Los ${numero(aGuardar)} precios ya están guardados. Falta poco.`}
            />
          </div>
        )}

        {paso === "falta-proveedor" && (
          <div className="listas__paso listas__pregunta">
            <span className="listas__signo"><Icono nombre="alerta" tam={28} /></span>
            <h2>¿De qué proveedor es esta planilla?</h2>
            <p>No se reconoce de quién es <strong>{archivo}</strong>. Elegilo y se lee de nuevo: no hace falta volver a elegir el archivo.</p>
            <div className="listas__opciones">
              {proveedores.map((p) => (
                <button key={p.id} type="button" className="listas__opcion" onClick={() => { sabido.current = { proveedor: p }; leer(archivo); }}>
                  <Iniciales nombre={p.nombre} tono={p.tono} forma="cuadrada" />
                  <strong>{p.nombre}</strong>
                  <Icono nombre="flecha" tam={18} />
                </button>
              ))}
            </div>
            <Boton variante="texto" icono="mas" onClick={() => setAgregando(true)}>Es de un proveedor nuevo</Boton>
          </div>
        )}

        {paso === "falta-fecha" && (
          <form className="listas__paso listas__pregunta" onSubmit={conLaFecha} noValidate>
            <span className="listas__signo"><Icono nombre="calendario" tam={28} /></span>
            <h2>¿De qué fecha es esta lista?</h2>
            <p>La planilla <strong>{archivo}</strong> no lo dice. Con la fecha se sabe cuál es la lista más nueva de cada proveedor.</p>
            <Campo
              className="listas__fecha"
              etiqueta="Fecha de la lista"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={fechaEscrita}
              onChange={(e) => { setFechaEscrita(e.target.value); setFaltaLaFecha(false); }}
              error={faltaLaFecha ? "Poné la fecha de la lista para seguir." : null}
            />
            <Boton type="submit" variante="principal" tam="grande" ancho>Seguir</Boton>
          </form>
        )}

        {paso === "no-se-lee" && (
          <div className="listas__paso listas__pregunta">
            <span className="listas__signo listas__signo--error"><Icono nombre="error" tam={28} /></span>
            <h2>No se pudo leer el archivo</h2>
            <p><strong>{archivo}</strong> no es una planilla de Excel. Pedile al proveedor la lista en Excel (.xlsx o .xls) y probá de nuevo. No se guardó nada.</p>
            <Boton variante="principal" tam="grande" icono="subir" ancho onClick={elegirArchivo}>Elegir otra planilla</Boton>
          </div>
        )}

        {paso === "revisar" && enRevision && (
          <Revisar carga={enRevision} titulo={tituloDeLaLista} aGuardar={aGuardar} enLinea={enLinea} alAplicar={aplicar} alDescartar={descartar} />
        )}

        <AgregarProveedor abierta={agregando} alCerrar={() => setAgregando(false)} alAgregar={(p) => { sabido.current = { proveedor: p }; leer(archivo); }} />
      </Pagina>
    );
  }

  // ---- Portada

  return (
    <Pagina titulo="Listas de precios" estados={ESTADOS}>
      {!enLinea && <Aviso tipo="alerta">Cargar una lista necesita internet. Lo demás sigue funcionando.</Aviso>}

      {proveedores.length === 0 ? (
        <Vacio icono="listas" titulo="Todavía no hay proveedores" principal={{ texto: "Agregar el primer proveedor", icono: "mas", alTocar: () => setAgregando(true) }}>El primer paso es agregar un proveedor. Después cargás su planilla y entran sus productos con el costo.</Vacio>
      ) : (
        <>
          <section
            className={clases("listas__zona", arrastrando && "listas__zona--arrastrando")}
            aria-label="Cargar una planilla"
            onDragOver={(e) => { e.preventDefault(); if (enLinea) setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
          >
            <span className="listas__icono"><Icono nombre="subir" tam={30} /></span>
            <div className="listas__zona-texto">
              <h2>{arrastrando ? "Soltala acá" : esCelular ? "Cargá la planilla del proveedor" : "Arrastrá acá la planilla del proveedor"}</h2>
              <p>Es el Excel que te manda. Se reconoce sola de quién es, y no se guarda nada hasta que la revises.</p>
            </div>
            <Boton variante="principal" tam="grande" icono="subir" disabled={!enLinea} onClick={elegirArchivo}>Elegir archivo</Boton>
          </section>

          {pendiente && (
            <Aviso tipo="alerta" titulo="Hay una lista sin revisar" accion={{ texto: "Retomar", alTocar: () => retomar(pendiente) }}>
              {pendiente.proveedor}, lista del {fechaDeHace(pendiente.diasDeLaLista)}. Todavía no se guardó nada.
            </Aviso>
          )}

          <TituloDeSeccion titulo="Proveedores">
            <Boton tam="chico" icono="mas" onClick={() => setAgregando(true)}>Agregar proveedor</Boton>
          </TituloDeSeccion>
          <ul className="listas__proveedores">
            {proveedores.map((p) => {
              const dias = p.diasDeLaLista ?? undefined;
              const vieja = dias !== undefined && dias > DIAS_PARA_LISTA_VIEJA;
              return (
                <li key={p.id} className="listas__proveedor">
                  <Iniciales nombre={p.nombre} tono={p.tono} forma="cuadrada" />
                  <div className="listas__proveedor-texto">
                    <h3>{p.nombre}</h3>
                    <p>{dias === undefined ? "Todavía sin lista" : `Última lista: ${fechaDeHace(dias)}`}</p>
                  </div>
                  {dias !== undefined && (vieja
                    ? <Pastilla tipo="alerta" icono="alerta">Vieja: {hace(dias)}</Pastilla>
                    : <span className="listas__hace">{hace(dias).replace(/^./, (l) => l.toUpperCase())}</span>)}
                </li>
              );
            })}
          </ul>

          {lasCargas.length > 0 && (
            <>
              <TituloDeSeccion titulo="Últimas cargas" />
              <Lista>
                {lasCargas.slice(0, 5).map((c) => (
                  <Renglon
                    key={c.id}
                    className="listas__carga"
                    titulo={`${c.proveedor}, lista del ${fechaDeHace(c.diasDeLaLista)}`}
                    detalle={c.estado === "aplicada" ? `${c.cuando} · ${numero(c.resumen.nuevos + c.resumen.cambian)} precios actualizados` : c.cuando}
                    fin={<>
                      {c.estado === "aplicada" && <Pastilla tipo="bien" icono="tilde">Aplicada</Pastilla>}
                      {c.estado === "descartada" && <Pastilla>Descartada</Pastilla>}
                      {c.estado === "sin-revisar" && <Pastilla tipo="alerta">Sin revisar</Pastilla>}
                      {c.estado === "sin-revisar" && <Boton tam="chico" aria-label={`Retomar la lista de ${c.proveedor}`} onClick={() => retomar(c)}>Retomar</Boton>}
                    </>}
                  />
                ))}
              </Lista>
            </>
          )}
        </>
      )}

      <AgregarProveedor abierta={agregando} alCerrar={() => setAgregando(false)} alAgregar={(p) => { avisar(`Proveedor ${p.nombre} agregado`, { detalle: "Ya podés cargar su planilla." }); }} />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Revisar antes de aplicar

type PropsDeRevisar = { carga: Carga; titulo: string; aGuardar: number; enLinea: boolean; alAplicar: () => void; alDescartar: () => void };

function Revisar({ carga, titulo, aGuardar, enLinea, alAplicar, alDescartar }: PropsDeRevisar) {
  const r = carga.resumen;
  return (
    <div className="listas__revisar">
      <header className="listas__cabeza">
        <h2>{titulo}</h2>
        <p>Mirá qué cambia. Si algo no cierra, descartala: no pasa nada.</p>
      </header>

      <ul className="listas__numeros">
        <li>
          <strong className="cifra">{numero(r.nuevos)}</strong>
          <span>{r.nuevos === 1 ? "producto nuevo" : "productos nuevos"}</span>
        </li>
        <li className="listas__numero--cambian">
          <strong className="cifra">{numero(r.cambian)}</strong>
          <span>cambian de precio</span>
          <em><Icono nombre={r.promedio >= 0 ? "flecha-arriba" : "flecha-abajo"} tam={16} grosor={2.4} />{r.promedio >= 0 ? "Suben" : "Bajan"} {porciento(r.promedio)} en promedio</em>
        </li>
        <li>
          <strong className="cifra">{numero(r.sinCambio)}</strong>
          <span>quedan igual</span>
        </li>
      </ul>

      <h3 className="listas__subtitulo">Algunos ejemplos</h3>
      <ul className="listas__ejemplos">
        {carga.ejemplos.map((e) => {
          const cambio = e.antes === null ? null : ((e.ahora - e.antes) / e.antes) * 100;
          return (
            <li key={e.nombre}>
              <span className="listas__ejemplo-nombre"><strong>{e.nombre}</strong><span>{e.marca}</span></span>
              <span className="listas__ejemplo-costo">
                {e.antes !== null && <span>Costo: de {pesosConCentavos(e.antes)} a</span>}
                {e.antes === null && <span>Costo:</span>}
                <strong className="cifra">{pesosConCentavos(e.ahora)}</strong>
              </span>
              {cambio === null
                ? <Pastilla tipo="info">Nuevo</Pastilla>
                : cambio > 0
                  ? <Pastilla tipo="error" icono="flecha-arriba">Sube {porciento(cambio)}</Pastilla>
                  : <Pastilla tipo="bien" icono="flecha-abajo">Baja {porciento(cambio)}</Pastilla>}
            </li>
          );
        })}
      </ul>

      <BarraDeAccion className="listas__aplicar">
        <p className="listas__nada"><Icono nombre="informacion" tam={20} />{enLinea ? "Todavía no se guardó nada." : "Sin conexión: para aplicar hace falta internet."}</p>
        <Boton onClick={alDescartar}>Descartar</Boton>
        <Boton variante="principal" tam="grande" disabled={!enLinea} onClick={alAplicar}>Aplicar {numero(aGuardar)} precios</Boton>
      </BarraDeAccion>
    </div>
  );
}

// ---------------------------------------------------------------- Agregar proveedor

const TONOS: Tono[] = ["amarillo", "negro", "azul", "verde", "violeta", "naranja"];

function AgregarProveedor({ abierta, alCerrar, alAgregar }: { abierta: boolean; alCerrar: () => void; alAgregar: (proveedor: Proveedor) => void }) {
  const proveedores = useAlmacen((a) => a.proveedores);
  const [nombre, setNombre] = useState("");
  const [iva, setIva] = useState<"sin" | "con">("sin");
  const [descuento, setDescuento] = useState("");
  const [error, setError] = useState<string | null>(null);

  const campoDelNombre = useRef<HTMLInputElement>(null);

  // Al abrirse, el foco va al nombre, que es lo primero que se escribe (la hoja ya enfoca el primer campo; esto lo asegura).
  useEffect(() => {
    if (!abierta) return;
    setNombre(""); setIva("sin"); setDescuento(""); setError(null);
    const cuadro = requestAnimationFrame(() => campoDelNombre.current?.focus());
    return () => cancelAnimationFrame(cuadro);
  }, [abierta]);

  const porcentaje = Math.min(99, Number(descuento) || 0);
  const costoDeEjemplo = (1000 / (iva === "con" ? 1 + IVA / 100 : 1)) * (1 - porcentaje / 100);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = nombre.trim();
    if (limpio === "") { setError("Escribí el nombre del proveedor."); return; }
    const repetido = proveedores.find((p) => p.nombre.toLowerCase() === limpio.toLowerCase());
    if (repetido) { setError(`Ya hay un proveedor que se llama ${repetido.nombre}.`); return; }
    const nuevo: Proveedor = { id: nuevoId("prov"), nombre: limpio, tono: TONOS[proveedores.length % TONOS.length] ?? "azul", productos: 0, diasDeLaLista: null, conIva: iva === "con", descuento: porcentaje };
    cambiarAlmacen((a) => ({ ...a, proveedores: [...a.proveedores, nuevo] }));
    alCerrar();
    alAgregar(nuevo);
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Agregar proveedor">
      <form className="listas__formulario" onSubmit={enviar} noValidate>
        <Campo etiqueta="Nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); setError(null); }} error={error} placeholder="Por ejemplo: Ferretera del Sur" ref={campoDelNombre} />
        <div className="listas__grupo">
          <p>Sus precios de lista vienen</p>
          <Segmentos etiqueta="Sus precios de lista vienen" opciones={[{ clave: "sin", nombre: "Sin IVA" }, { clave: "con", nombre: "Con IVA incluido" }]} elegido={iva} alElegir={setIva} />
        </div>
        <Campo
          etiqueta="Descuento que te hace"
          sufijo="%"
          inputMode="numeric"
          value={descuento}
          onChange={(e) => setDescuento(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 2))}
          ayuda="Si no te hace descuento, dejalo vacío."
        />
        <p className="listas__ejemplo-de-costo">
          Con esto, si su lista dice <strong>$1.000,00</strong> el costo queda en <strong>{pesosConCentavos(costoDeEjemplo)}</strong>.
        </p>
        <Boton type="submit" variante="principal" tam="grande" ancho>Agregar proveedor</Boton>
      </form>
    </Hoja>
  );
}
