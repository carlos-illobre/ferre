import { useEffect, useRef, useState, type PointerEvent as EventoDePuntero, type ReactNode } from "react";
import { Lienzo } from "../editor/Lienzo";
import { Icono, type NombreDeIcono } from "../comun/Icono";
import { FormularioDelPaso } from "../comun/FormularioDelPaso";
import { ConfirmarBorrar, PedirNombre } from "../comun/Dialogo";
import { Historial } from "../comun/Historial";
import { useDibujo } from "../comun/useDibujo";
import { bpmnAMostrar, estadoDe, TEXTO_DEL_ESTADO, type Procesos } from "../estado";
import { NOMBRE_DEL_TIPO, type TipoDePaso } from "../modelo/grafo";
import { alMover, alPoner, alQuitar, listaDe, type Item, type Lugar } from "../modelo/lista";
import { erroresDeForma } from "../modelo/recorrido";
import type { Puede } from "../tipos";
import { EntradaDeArchivo } from "../compu/EditorCompu";

// El celular (historia 4): la lista de procesos y, adentro de cada uno, dos pestañas: «Diagrama»,
// el dibujo con las figuras en una hoja que sube desde abajo (E30), y «Pasos», una tarjeta por
// paso que se ordena arrastrando (E26 a E29). Las reglas y los textos son los de la computadora.

// Las doce figuras, como en la computadora, con nombres cortos para que entren en el celular
// (los textos se resumen en el celular, decisión 47); el nombre completo queda para los lectores.
const FIGURAS_CELU: { tipo: TipoDePaso | "carril"; nombre: string; corto: string }[] = [
  { tipo: "inicio", nombre: "Inicio", corto: "Inicio" }, { tipo: "tarea", nombre: "Tarea", corto: "Tarea" },
  { tipo: "persona", nombre: "Tarea de una persona", corto: "Persona" }, { tipo: "sistema", nombre: "Tarea del sistema", corto: "Sistema" },
  { tipo: "decision", nombre: "Decisión", corto: "Decisión" }, { tipo: "paralelo", nombre: "En paralelo", corto: "Paralelo" },
  { tipo: "espera", nombre: "Espera", corto: "Espera" }, { tipo: "fin", nombre: "Fin", corto: "Fin" },
  { tipo: "subproceso", nombre: "Subproceso", corto: "Subproceso" }, { tipo: "carril", nombre: "Carril", corto: "Carril" },
  { tipo: "documento", nombre: "Documento", corto: "Documento" }, { tipo: "nota", nombre: "Nota", corto: "Nota" },
];
// Los que se pueden poner en el recorrido desde «Pasos».
const PASOS_DEL_RECORRIDO = FIGURAS_CELU.filter((f): f is { tipo: TipoDePaso; nombre: string; corto: string } => ["tarea", "persona", "sistema", "decision", "paralelo", "espera", "fin", "subproceso"].includes(f.tipo));

// Lo que queda a la vista de «Agregar un paso» plegada: solo su título.
const ALTO_HOJA_PLEGADA = 64;

const claveDe = (l: Lugar) => `${l.desde}>${l.hasta ?? ""}`;

export function ProcesosCelu({ procesos, puede, pantallas }: { procesos: Procesos; puede: Puede; pantallas: string[] }) {
  const [vista, setVista] = useState<"lista" | "proceso">("lista");
  const [pestana, setPestana] = useState<"pasos" | "diagrama">("diagrama");
  const [hoja, setHoja] = useState<null | "menu" | "paso" | "agregar">(null);
  const [lugarNuevo, setLugarNuevo] = useState<Lugar | null>(null);
  const [dialogo, setDialogo] = useState<null | "nuevo" | "renombrar" | "borrar" | "historial">(null);
  const archivo = useRef<HTMLInputElement>(null);
  // «Agregar un paso» se pliega (arranca abierta); el logo de bpmn.io flota encima de lo que se ve
  // de la hoja y se mueve con ella.
  const [figurasAbiertas, setFigurasAbiertas] = useState(true);
  const hojaFiguras = useRef<HTMLDivElement>(null);
  const [altoHoja, setAltoHoja] = useState(0);
  useEffect(() => {
    const hoja = hojaFiguras.current;
    if (!hoja || typeof ResizeObserver === "undefined") return;
    const medir = () => setAltoHoja(hoja.offsetHeight);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(hoja);
    return () => observador.disconnect();
  });
  const d = useDibujo(procesos);
  const dibuja = puede.dibujar && !procesos.sinConexion;
  const { abierto, lista } = procesos;
  const xml = abierto ? bpmnAMostrar(abierto, puede) : null;
  const estado = abierto ? estadoDe(abierto) : null;

  // Al abrir un proceso, arranca en «Diagrama», la primera pestaña (E25).
  useEffect(() => { setPestana("diagrama"); setHoja(null); }, [abierto?.id]);
  useEffect(() => { if (pestana === "diagrama") setTimeout(() => d.lienzo.current?.verTodo(), 0); }, [pestana, d.lienzo]);

  const avisos = procesos.aviso && (
    <div className="procesos-aviso" role="alert" data-testid="procesos-aviso"><span>{procesos.aviso}</span><button type="button" className="procesos-boton chico" onClick={procesos.cerrarAviso}>Entendido</button></div>
  );
  const dialogos = (
    <>
      <EntradaDeArchivo archivo={archivo} alElegir={async (f) => { await d.importar(f); setVista("proceso"); }} />
      {dialogo === "nuevo" && <PedirNombre titulo="Proceso nuevo" boton="Crear" alCerrar={() => setDialogo(null)} alAceptar={async (n) => { if (await procesos.crear(n)) { setDialogo(null); setVista("proceso"); } }} />}
      {dialogo === "renombrar" && abierto && <PedirNombre titulo="Cambiar el nombre" inicial={abierto.nombre} boton="Guardar" alCerrar={() => setDialogo(null)} alAceptar={async (n) => { if (await procesos.renombrar(n)) setDialogo(null); }} />}
      {dialogo === "borrar" && abierto && <ConfirmarBorrar nombre={abierto.nombre} alCerrar={() => setDialogo(null)} alBorrar={async () => { setDialogo(null); await procesos.borrar(); setVista("lista"); }} />}
      {dialogo === "historial" && abierto && <Historial procesos={procesos} puedeCopiar={dibuja} alCerrar={() => setDialogo(null)} />}
    </>
  );

  if (vista === "lista") {
    return (
      <div className="procesos procesos-celu" data-testid="procesos">
        <div className="procesos-celu-barra">
          <h1>Procesos</h1>
          {dibuja && <button type="button" className="procesos-boton icono" aria-label="Importar" onClick={() => archivo.current?.click()} data-testid="procesos-importar"><Icono nombre="subir" /></button>}
        </div>
        {procesos.sinConexion && <p className="procesos-guardado sin-conexion" data-testid="procesos-sin-conexion">Sin conexión: solo se puede mirar</p>}
        {avisos}
        {lista === null ? <p className="procesos-ayuda" role="status">Buscando los procesos…</p>
          : lista.length === 0 ? (
            <div className="procesos-vacio" data-testid="procesos-vacio">
              <p>Un proceso es cómo se hace una tarea del negocio, paso a paso: vender en el mostrador, comprar a un proveedor, recibir mercadería.</p>
              {!dibuja && <p>Todavía no hay ninguno vigente.</p>}
            </div>
          ) : (
            <ul className="procesos-tarjetas" data-testid="procesos-lista">
              {lista.map((p) => (
                <li key={p.id}>
                  <button type="button" className="procesos-tarjeta" onClick={() => { setVista("proceso"); void procesos.abrir(p.id); }} data-testid={`procesos-item-${p.id}`}>
                    <span className="procesos-tarjeta-texto"><b>{p.nombre}</b><span>{TEXTO_DEL_ESTADO[p.vigente && p.borrador ? "vigente-con-borrador" : p.vigente ? "vigente" : "borrador"]} · {p.pasos} {p.pasos === 1 ? "paso" : "pasos"}</span></span>
                    <Icono nombre="derecha" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        {dibuja && <button type="button" className="procesos-boton principal ancho" onClick={() => setDialogo("nuevo")} data-testid="procesos-nuevo"><Icono nombre="mas" /> Proceso nuevo</button>}
        {dialogos}
      </div>
    );
  }

  const items = listaDe(d.grafo);
  return (
    <div className="procesos procesos-celu procesos-celu-proceso" data-testid="procesos">
      <div className="procesos-celu-barra">
        <button type="button" className="procesos-boton icono" aria-label="Volver a la lista" onClick={() => setVista("lista")} data-testid="procesos-volver"><Icono nombre="izquierda" /></button>
        <h1 title={abierto?.nombre}>{abierto?.nombre ?? "Abriendo…"}</h1>
        {dibuja && <button type="button" className="procesos-boton icono" aria-label="Deshacer" onClick={() => d.lienzo.current?.deshacer()}><Icono nombre="deshacer" /></button>}
        <button type="button" className="procesos-boton icono" aria-label="Más opciones" onClick={() => setHoja("menu")} data-testid="procesos-menu-celu"><Icono nombre="puntos" /></button>
      </div>
      <div className="procesos-celu-estado">
        {estado && <span className={`procesos-chip ${estado}`} data-testid="procesos-estado">{TEXTO_DEL_ESTADO[estado]}</span>}
        {dibuja && <span className={`procesos-guardado ${procesos.guardado}`} data-testid="procesos-guardado">{{ guardado: "Guardado", guardando: "Guardando…", "sin-conexion": "Sin conexión: no se guardó", error: "No se guardó" }[procesos.guardado]}</span>}
        {procesos.sinConexion && <span className="procesos-guardado sin-conexion" data-testid="procesos-sin-conexion">Sin conexión: solo se puede mirar</span>}
      </div>
      {avisos}
      <div className="procesos-segmentos" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === "diagrama"} className={pestana === "diagrama" ? "elegido" : ""} onClick={() => setPestana("diagrama")} data-testid="procesos-pestana-diagrama"><Icono nombre="diagrama" /> Diagrama</button>
        <button type="button" role="tab" aria-selected={pestana === "pasos"} className={pestana === "pasos" ? "elegido" : ""} onClick={() => setPestana("pasos")} data-testid="procesos-pestana-pasos"><Icono nombre="lista" /> Pasos</button>
      </div>

      {pestana === "pasos" && (
        <div className="procesos-pasos-celu" data-testid="procesos-pasos-celu">
          {items === null ? (
            <p className="procesos-ayuda" data-testid="procesos-no-es-lista">Este proceso tiene caminos que vuelven atrás o pasos sueltos, y no se puede mostrar como lista. Miralo y cambialo en «Diagrama».</p>
          ) : (
            <ListaDePasos items={items} dibuja={dibuja} elegido={d.elegido}
              alTocar={(id) => { d.setElegido(id); setHoja("paso"); }}
              alMover={(id, lugar) => { d.lienzo.current?.aplicarFlechas(alMover(d.grafo, id, lugar)); }}
              alAgregar={(lugar) => { setLugarNuevo(lugar); setHoja("agregar"); }} />
          )}
        </div>
      )}

      <div className={`procesos-panel procesos-dibujo procesos-dibujo-celu ${pestana === "diagrama" ? "" : "oculto"}`} aria-hidden={pestana !== "diagrama"}
        style={{ "--procesos-hoja-visible": `${dibuja && pestana === "diagrama" ? (figurasAbiertas ? altoHoja : ALTO_HOJA_PLEGADA) : 0}px` } as React.CSSProperties}>
        {xml && <Lienzo ref={d.lienzo} xml={xml} soloLectura={!dibuja} tactil alCambiar={d.alCambiar} alCargar={d.alCargar} alElegir={d.setElegido} alError={procesos.avisar} />}
        <div className="procesos-zoom procesos-zoom-celu">
          <button type="button" className="procesos-boton icono" aria-label="Acercar" onClick={() => d.lienzo.current?.acercar()}><Icono nombre="mas" /></button>
          <button type="button" className="procesos-boton icono" aria-label="Alejar" onClick={() => d.lienzo.current?.alejar()}><Icono nombre="menos" /></button>
          <button type="button" className="procesos-boton icono" aria-label="Ver todo" onClick={() => d.lienzo.current?.verTodo()}><Icono nombre="ajustar" /></button>
        </div>
        {dibuja && pestana === "diagrama" && (
          <div ref={hojaFiguras} className={`procesos-hoja procesos-hoja-figuras ${figurasAbiertas ? "abierta" : "plegada"}`} data-testid="procesos-hoja-figuras">
            <button type="button" className="procesos-hoja-titulo" aria-expanded={figurasAbiertas} onClick={() => setFigurasAbiertas((a) => !a)} data-testid="procesos-plegar-hoja">
              <span className="procesos-tirador" />
              <span className="procesos-hoja-titulo-texto"><b>Agregar un paso</b><Icono nombre={figurasAbiertas ? "abajo" : "arriba"} /></span>
            </button>
            <p className="procesos-ayuda">Arrastralo al dibujo, o tocalo para ponerlo después del paso elegido.</p>
            <div className="procesos-figuras-celu">
              {FIGURAS_CELU.map((f) => (
                <button key={f.tipo} type="button" className="procesos-figura-celu" aria-label={f.nombre} title={f.nombre} data-testid={`procesos-figura-${f.tipo}`}
                  onTouchStart={(e) => d.lienzo.current?.empezarArrastre(e.nativeEvent, f.tipo)}
                  onMouseDown={(e) => { if (e.button === 0) d.lienzo.current?.empezarArrastre(e.nativeEvent, f.tipo); }}
                  onClick={() => d.lienzo.current?.agregar(f.tipo, d.elegido)}>
                  <Icono nombre={f.tipo as NombreDeIcono} tam={26} /><span>{f.corto}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {hoja === "paso" && d.pasoElegido && (
        <Hoja alCerrar={() => setHoja(null)} testId="procesos-hoja-paso">
          <div className="procesos-hoja-cabeza"><Icono nombre={d.pasoElegido.tipo} tam={24} /><b>{d.pasoElegido.nombre || NOMBRE_DEL_TIPO[d.pasoElegido.tipo]}</b></div>
          {erroresDeForma(d.grafo).porPaso.get(d.pasoElegido.id) && <p className="procesos-ayuda"><span className="procesos-marca-error">!</span> {erroresDeForma(d.grafo).porPaso.get(d.pasoElegido.id)}</p>}
          <FormularioDelPaso paso={d.pasoElegido} grafo={d.grafo} pantallas={pantallas} soloLectura={!dibuja} alCambiar={(c) => d.lienzo.current?.cambiar(d.pasoElegido!.id, c)} />
          {dibuja && (
            <div className="procesos-botones">
              <button type="button" className="procesos-boton peligro" onClick={() => { d.lienzo.current?.aplicarFlechas([alQuitar(d.grafo, d.pasoElegido!.id)]); d.lienzo.current?.quitar(d.pasoElegido!.id); setHoja(null); }} data-testid="procesos-quitar-paso"><Icono nombre="tacho" /> Quitar el paso</button>
              <button type="button" className="procesos-boton" onClick={() => { const siguiente = d.grafo.flechas.find((f) => f.desde === d.pasoElegido!.id)?.hasta ?? null; setLugarNuevo({ desde: d.pasoElegido!.id, hasta: siguiente }); setHoja("agregar"); }} data-testid="procesos-agregar-despues"><Icono nombre="mas" /> Agregar un paso después</button>
            </div>
          )}
        </Hoja>
      )}

      {hoja === "agregar" && lugarNuevo && (
        <AgregarPaso alCerrar={() => setHoja(null)} alAgregar={(tipo, nombre) => {
          const api = d.lienzo.current;
          if (!api) return;
          const id = api.agregar(tipo, null);
          if (!id) return;
          if (nombre) api.cambiar(id, { nombre });
          api.aplicarFlechas([alPoner(api.grafo(), id, lugarNuevo)]);
          setHoja(null);
        }} />
      )}

      {hoja === "menu" && abierto && (
        <Hoja alCerrar={() => setHoja(null)} testId="procesos-hoja-menu">
          <div className="procesos-menu-celu">
            {dibuja && abierto.borrador && <button type="button" onClick={() => { setHoja(null); void procesos.marcarVigente(); }} data-testid="procesos-marcar-vigente"><Icono nombre="ok" /> Marcar vigente</button>}
            {dibuja && abierto.borrador && abierto.vigente && <button type="button" onClick={() => { setHoja(null); void procesos.descartarBorrador(); }} data-testid="procesos-descartar">Descartar el borrador</button>}
            {dibuja && <button type="button" onClick={() => { setHoja(null); void d.exportar("png", abierto.nombre, TEXTO_DEL_ESTADO[estado!]); }} data-testid="procesos-exportar-png"><Icono nombre="bajar" /> Exportar como imagen (PNG)</button>}
            {dibuja && <button type="button" onClick={() => { setHoja(null); void d.exportar("bpmn", abierto.nombre, TEXTO_DEL_ESTADO[estado!]); }} data-testid="procesos-exportar-bpmn"><Icono nombre="bajar" /> Exportar en BPMN (estándar)</button>}
            {dibuja && <button type="button" onClick={() => { setHoja(null); archivo.current?.click(); }} data-testid="procesos-importar"><Icono nombre="subir" /> Importar un BPMN</button>}
            <button type="button" onClick={() => { setHoja(null); setDialogo("historial"); }} data-testid="procesos-ver-historial"><Icono nombre="reloj" /> Historial</button>
            {dibuja && <button type="button" onClick={() => { setHoja(null); setDialogo("renombrar"); }} data-testid="procesos-renombrar"><Icono nombre="lapiz" /> Cambiar el nombre</button>}
            {dibuja && <button type="button" className="peligro" onClick={() => { setHoja(null); setDialogo("borrar"); }} data-testid="procesos-borrar"><Icono nombre="tacho" /> Borrar el proceso</button>}
          </div>
        </Hoja>
      )}
      {dialogos}
    </div>
  );
}

function Hoja({ children, alCerrar, testId }: { children: ReactNode; alCerrar: () => void; testId?: string }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [alCerrar]);
  return (
    <div className="procesos-fondo procesos-fondo-hoja" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className="procesos-hoja" role="dialog" aria-modal="true" data-testid={testId}>
        <div className="procesos-tirador" />
        {children}
      </div>
    </div>
  );
}

function AgregarPaso({ alCerrar, alAgregar }: { alCerrar: () => void; alAgregar: (tipo: TipoDePaso, nombre: string) => void }) {
  const [tipo, setTipo] = useState<TipoDePaso>("tarea");
  const [nombre, setNombre] = useState("");
  return (
    <Hoja alCerrar={alCerrar} testId="procesos-hoja-agregar">
      <b>Agregar un paso</b>
      <div className="procesos-figuras-celu">
        {PASOS_DEL_RECORRIDO.map((f) => (
          <button key={f.tipo} type="button" className={`procesos-figura-celu ${tipo === f.tipo ? "elegida" : ""}`} aria-pressed={tipo === f.tipo} aria-label={f.nombre} title={f.nombre} onClick={() => setTipo(f.tipo)}>
            <Icono nombre={f.tipo as NombreDeIcono} tam={26} /><span>{f.corto}</span>
          </button>
        ))}
      </div>
      <label className="procesos-campo"><span>Nombre</span><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Cobrar" data-testid="procesos-nombre-nuevo" /></label>
      <div className="procesos-botones">
        <button type="button" className="procesos-boton" onClick={alCerrar}>Cancelar</button>
        <button type="button" className="procesos-boton principal" onClick={() => alAgregar(tipo, nombre.trim())} data-testid="procesos-agregar">Agregar</button>
      </div>
    </Hoja>
  );
}

// La lista de pasos: cada tarjeta se arrastra desde el asa (o manteniéndola apretada) y se suelta
// entre otras dos, también en otra rama (E27).
function ListaDePasos({ items, dibuja, elegido, alTocar, alMover, alAgregar }: {
  items: Item[]; dibuja: boolean; elegido: string | null; alTocar: (id: string) => void; alMover: (id: string, lugar: Lugar) => void; alAgregar: (lugar: Lugar) => void;
}) {
  const [arrastre, setArrastre] = useState<{ id: string; y0: number; dy: number; lugar: string | null } | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lugares = useRef(new Map<string, Lugar>());
  lugares.current.clear();

  const empezar = (id: string, e: EventoDePuntero, demora: number) => {
    if (!dibuja) return;
    const y0 = e.clientY;
    const arrancar = () => setArrastre({ id, y0, dy: 0, lugar: null });
    if (demora) espera.current = setTimeout(arrancar, demora);
    else { (e.target as Element).setPointerCapture?.(e.pointerId); arrancar(); }
  };
  const mover = (e: EventoDePuntero) => {
    if (!arrastre) {
      if (espera.current) { clearTimeout(espera.current); espera.current = null; }
      return;
    }
    e.preventDefault();
    // Cerca del borde de arriba o de abajo, la pantalla se corre para llegar a toda la lista.
    const borde = 90;
    if (e.clientY > window.innerHeight - borde) window.scrollBy(0, 24);
    else if (e.clientY < borde) window.scrollBy(0, -24);
    const bajo = document.elementsFromPoint?.(e.clientX, e.clientY).find((el) => el.hasAttribute("data-lugar"));
    setArrastre({ ...arrastre, dy: e.clientY - arrastre.y0, lugar: bajo?.getAttribute("data-lugar") ?? arrastre.lugar });
  };
  const soltar = () => {
    if (espera.current) { clearTimeout(espera.current); espera.current = null; }
    if (arrastre?.lugar) {
      const lugar = lugares.current.get(arrastre.lugar);
      if (lugar) alMover(arrastre.id, lugar);
    }
    setArrastre(null);
  };

  const ranura = (l: Lugar) => {
    const clave = claveDe(l);
    lugares.current.set(clave, l);
    return <div key={`r-${clave}`} className={`procesos-ranura ${arrastre ? "visible" : ""} ${arrastre?.lugar === clave ? "activa" : ""}`} data-lugar={clave} data-testid={`procesos-ranura-${clave}`} />;
  };

  const render = (lista: Item[], antes: string | null, enRama = false): ReactNode[] => {
    const salida: ReactNode[] = [];
    let previo = antes;
    lista.forEach((item) => {
      if (previo) salida.push(ranura({ desde: previo, hasta: item.paso.id }));
      const p = item.paso;
      const moviendo = arrastre?.id === p.id;
      salida.push(
        <div key={p.id} className={`procesos-paso-celu ${p.id === elegido ? "elegido" : ""} ${moviendo ? "moviendo" : ""}`} style={moviendo ? { transform: `translateY(${arrastre!.dy}px)` } : undefined}
          onPointerDown={(e) => empezar(p.id, e, 400)} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}
          data-testid={`procesos-paso-${p.id}`}>
          {dibuja && <span className="procesos-asa" aria-hidden="true" onPointerDown={(e) => { e.stopPropagation(); empezar(p.id, e, 0); }}><Icono nombre="arrastrar" /></span>}
          <button type="button" className="procesos-paso-celu-boton" onClick={() => { if (!arrastre) alTocar(p.id); }}>
            <Icono nombre={p.tipo as NombreDeIcono} tam={26} />
            <span className="procesos-tarjeta-texto"><b>{p.nombre || NOMBRE_DEL_TIPO[p.tipo]}</b>{p.carril && <span>{p.carril}</span>}</span>
          </button>
        </div>,
      );
      if (item.ramas.length) {
        for (const rama of item.ramas) {
          salida.push(
            <div key={`rama-${rama.flecha}`} className="procesos-rama" data-testid={`procesos-rama-${rama.flecha}`}>
              <span className="procesos-rama-nombre">{rama.nombre || "Sigue"}</span>
              {ranura({ desde: p.id, hasta: rama.items[0]?.paso.id ?? null })}
              {render(rama.items, null, true)}
              {dibuja && (!rama.items.length || rama.items.at(-1)!.paso.tipo !== "fin") && !rama.items.at(-1)?.ramas.length && (
                <button type="button" className="procesos-agregar-aca" onClick={() => alAgregar({ desde: rama.items.at(-1)?.paso.id ?? p.id, hasta: null })}><Icono nombre="mas" /> Agregar un paso acá</button>
              )}
            </div>,
          );
        }
        previo = null;
      } else previo = p.id;
    });
    if (previo && lista.at(-1)?.paso.tipo !== "fin") {
      salida.push(ranura({ desde: previo, hasta: null }));
      if (dibuja && !enRama) salida.push(<button key={`agregar-${previo}`} type="button" className="procesos-agregar-aca" onClick={() => alAgregar({ desde: previo!, hasta: null })} data-testid="procesos-agregar-al-final"><Icono nombre="mas" /> Agregar un paso acá</button>);
    }
    return salida;
  };

  // Dentro de una rama, la ranura antes del primer paso es la de la decisión, que se pone aparte.
  return <div className="procesos-lista-pasos" onPointerMove={mover} onPointerUp={soltar}>{render(items, null)}</div>;
}
