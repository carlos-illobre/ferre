import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Lienzo } from "../editor/Lienzo";
import { Icono, type NombreDeIcono } from "../comun/Icono";
import { FormularioDelPaso } from "../comun/FormularioDelPaso";
import { ConfirmarBorrar, PedirNombre } from "../comun/Dialogo";
import { Historial } from "../comun/Historial";
import { useDibujo } from "../comun/useDibujo";
import { bpmnAMostrar, estadoDe, TEXTO_DEL_ESTADO, type Procesos } from "../estado";
import { NOMBRE_DEL_TIPO, type TipoDePaso } from "../modelo/grafo";
import { enOrden, erroresDeForma, filasDe } from "../modelo/recorrido";
import type { GuardarLocal, Puede } from "../tipos";

// La computadora (historias 1, 2, 3, 5 y 6): el editor clásico, con las figuras a la izquierda,
// el paso elegido a la derecha y los pasos en orden abajo. Los tres paneles se pliegan, arrancan
// plegados y recuerdan cómo quedaron en esta computadora (E12).

export const FIGURAS: { tipo: TipoDePaso | "carril"; nombre: string }[] = [
  { tipo: "inicio", nombre: "Inicio" }, { tipo: "tarea", nombre: "Tarea" }, { tipo: "persona", nombre: "Tarea de una persona" },
  { tipo: "sistema", nombre: "Tarea del sistema" }, { tipo: "decision", nombre: "Decisión" }, { tipo: "paralelo", nombre: "En paralelo" },
  { tipo: "espera", nombre: "Espera" }, { tipo: "fin", nombre: "Fin" }, { tipo: "subproceso", nombre: "Subproceso" },
  { tipo: "carril", nombre: "Carril" }, { tipo: "documento", nombre: "Documento" }, { tipo: "nota", nombre: "Nota" },
];

function usePanel(clave: string, local: GuardarLocal | null | undefined): [boolean, () => void] {
  const [abierto, setAbierto] = useState(() => {
    try { return local?.getItem(`procesos.panel.${clave}`) === "abierto"; } catch { return false; }
  });
  const alternar = useCallback(() => setAbierto((a) => {
    try { local?.setItem(`procesos.panel.${clave}`, a ? "cerrado" : "abierto"); } catch { /* sin guardado */ }
    return !a;
  }), [clave, local]);
  return [abierto, alternar];
}

const TEXTO_DEL_GUARDADO = { guardado: "Guardado", guardando: "Guardando…", "sin-conexion": "Sin conexión: no se guardó", error: "No se guardó" } as const;

export function EditorCompu({ procesos, puede, pantallas, guardarLocal, donde }: { procesos: Procesos; puede: Puede; pantallas: string[]; guardarLocal?: GuardarLocal | null; donde?: string[] }) {
  const d = useDibujo(procesos);
  const [figuras, alternarFiguras] = usePanel("figuras", guardarLocal);
  const [delPaso, alternarDelPaso] = usePanel("paso", guardarLocal);
  const [pasos, alternarPasos] = usePanel("pasos", guardarLocal);
  const [menu, setMenu] = useState<null | "procesos" | "exportar">(null);
  const [dialogo, setDialogo] = useState<null | "nuevo" | "renombrar" | "borrar" | "historial">(null);
  const [buscar, setBuscar] = useState("");
  const [zoom, setZoom] = useState(1);
  const archivo = useRef<HTMLInputElement>(null);
  const { abierto, lista } = procesos;
  const dibuja = puede.dibujar && !procesos.sinConexion;
  const xml = abierto ? bpmnAMostrar(abierto, puede) : null;
  const estado = abierto ? estadoDe(abierto) : null;

  // Al elegir un paso en el dibujo, el panel del paso se abre si estaba plegado (E02).
  const alElegir = useCallback((id: string | null) => {
    d.setElegido(id);
    if (id && !delPaso) alternarDelPaso();
  }, [d, delPaso, alternarDelPaso]);

  // Alt+P, Alt+F y Alt+E abren y cierran los paneles.
  function teclas(e: KeyboardEvent) {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const accion = { p: alternarPasos, f: alternarFiguras, e: alternarDelPaso }[e.key.toLowerCase()];
    if (!accion) return;
    e.preventDefault();
    accion();
  }
  // En el dibujo: flechas para pasar de un paso a otro, Insert agrega una tarea a continuación y
  // Enter va al nombre del paso elegido (E13). Supr, Ctrl+Z y Ctrl+Y los atiende bpmn-js.
  function teclasDelDibujo(e: KeyboardEvent) {
    const orden = enOrden(d.grafo).map((p) => p.id);
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key) && !e.altKey && !e.ctrlKey && orden.length) {
      e.preventDefault();
      e.stopPropagation();
      const i = d.elegido ? orden.indexOf(d.elegido) : -1;
      const paso = e.key === "ArrowRight" || e.key === "ArrowDown" ? Math.min(orden.length - 1, i + 1) : Math.max(0, i - 1);
      d.lienzo.current?.elegir(orden[paso] ?? null);
    } else if (e.key === "Insert" && dibuja) {
      e.preventDefault();
      e.stopPropagation();
      d.lienzo.current?.agregar("tarea", d.elegido);
    } else if (e.key === "Enter" && d.elegido) {
      e.preventDefault();
      e.stopPropagation();
      if (!delPaso) alternarDelPaso();
      setTimeout(() => document.getElementById("procesos-nombre-del-paso")?.focus(), 0);
    }
  }

  useEffect(() => {
    const cerrar = () => setMenu(null);
    if (menu) document.addEventListener("click", cerrar);
    return () => document.removeEventListener("click", cerrar);
  }, [menu]);

  if (!procesos.cargando && lista && lista.length === 0 && !abierto) {
    return (
      <div className="procesos procesos-compu" data-testid="procesos">
        <div className="procesos-vacio" data-testid="procesos-vacio">
          <Icono nombre="diagrama" tam={40} />
          <h1>Procesos</h1>
          <p>Un proceso es cómo se hace una tarea del negocio, paso a paso: vender en el mostrador, comprar a un proveedor, recibir mercadería.</p>
          {dibuja ? (
            <div className="procesos-botones">
              <button type="button" className="procesos-boton principal" onClick={() => setDialogo("nuevo")} data-testid="procesos-nuevo"><Icono nombre="mas" /> Proceso nuevo</button>
              <button type="button" className="procesos-boton" onClick={() => archivo.current?.click()} data-testid="procesos-importar"><Icono nombre="subir" /> Importar</button>
            </div>
          ) : <p>Todavía no hay ninguno vigente.</p>}
          {procesos.aviso && <p className="procesos-aviso" role="alert">{procesos.aviso}</p>}
        </div>
        <EntradaDeArchivo archivo={archivo} alElegir={d.importar} />
        {dialogo === "nuevo" && <PedirNombre titulo="Proceso nuevo" boton="Crear" alCerrar={() => setDialogo(null)} alAceptar={async (n) => { if (await procesos.crear(n)) setDialogo(null); }} />}
      </div>
    );
  }

  const filtrados = (lista ?? []).filter((p) => p.nombre.toLocaleLowerCase("es").includes(buscar.toLocaleLowerCase("es")));
  const errores = erroresDeForma(d.grafo).generales;
  const conAviso = erroresDeForma(d.grafo).porPaso.size;
  const orden = enOrden(d.grafo);
  const decisiones = d.grafo.pasos.filter((p) => p.tipo === "decision" || p.tipo === "paralelo").length;
  const resumen = [`${d.grafo.pasos.length} ${d.grafo.pasos.length === 1 ? "paso" : "pasos"}`, ...(d.grafo.carriles.length ? [`${d.grafo.carriles.length} ${d.grafo.carriles.length === 1 ? "carril" : "carriles"}`] : []), ...(decisiones ? [`${decisiones} ${decisiones === 1 ? "decisión" : "decisiones"}`] : [])].join(" · ");
  const marcarVigente = dibuja && abierto?.borrador;

  // Alt+V marca vigente el borrador (la v2).
  function teclasDeLaCabeza(e: KeyboardEvent) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "v" && marcarVigente) { e.preventDefault(); void procesos.marcarVigente(); return; }
    teclas(e);
  }

  // La v2 (decisión 148 de Ferrebress): arriba el nombre con la miga y el estado, y las acciones; a
  // la izquierda las figuras, en el centro el dibujo con el acercar abajo a la derecha, a la
  // derecha el paso elegido y abajo la barra de los pasos, en orden.
  return (
    <div className="procesos procesos-compu" data-testid="procesos" onKeyDown={teclasDeLaCabeza}>
      <header className="procesos-cabeza">
        <span className="procesos-cabeza-icono" aria-hidden="true"><Icono nombre="diagrama" tam={22} /></span>
        <div className="procesos-cabeza-titulo">
          <div className="procesos-migas">
            <span>{[...(donde ?? []), "Procesos"].join(" › ")}</span>
            {procesos.sinConexion && <span className="procesos-guardado sin-conexion" data-testid="procesos-sin-conexion">Sin conexión: solo se puede mirar</span>}
            {dibuja && abierto && <span className={`procesos-guardado ${procesos.guardado}`} data-testid="procesos-guardado">{procesos.guardado === "guardado" && <Icono nombre="ok" tam={16} />}{TEXTO_DEL_GUARDADO[procesos.guardado]}</span>}
          </div>
          <div className="procesos-selector-caja" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="procesos-selector" aria-expanded={menu === "procesos"} onClick={() => setMenu(menu === "procesos" ? null : "procesos")} data-testid="procesos-selector">
              <span className="procesos-selector-nombre">{abierto?.nombre ?? "Procesos"}</span> <Icono nombre="abajo" tam={18} />
            </button>
            {menu === "procesos" && (
              <div className="procesos-menu procesos-menu-procesos" role="menu" data-testid="procesos-menu">
                <label className="procesos-buscar"><Icono nombre="buscar" /><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar un proceso" aria-label="Buscar un proceso" autoFocus /></label>
                <ul>
                  {filtrados.map((p) => (
                    <li key={p.id}>
                      <button type="button" role="menuitem" className={p.id === abierto?.id ? "elegido" : ""} onClick={() => { setMenu(null); void procesos.abrir(p.id); }} data-testid={`procesos-item-${p.id}`}>
                        <b>{p.nombre}</b>
                        <span>{TEXTO_DEL_ESTADO[p.vigente && p.borrador ? "vigente-con-borrador" : p.vigente ? "vigente" : "borrador"]} · {p.pasos} {p.pasos === 1 ? "paso" : "pasos"}</span>
                      </button>
                    </li>
                  ))}
                  {!filtrados.length && <li className="procesos-ayuda">Ningún proceso se llama así.</li>}
                </ul>
                {abierto && (
                  <div className="procesos-menu-acciones">
                    <button type="button" onClick={() => { setMenu(null); setDialogo("historial"); }} data-testid="procesos-ver-historial"><Icono nombre="reloj" /> Historial</button>
                    {dibuja && <button type="button" onClick={() => { setMenu(null); setDialogo("renombrar"); }} data-testid="procesos-renombrar"><Icono nombre="lapiz" /> Cambiar el nombre</button>}
                    {dibuja && <button type="button" className="peligro" onClick={() => { setMenu(null); setDialogo("borrar"); }} data-testid="procesos-borrar"><Icono nombre="tacho" /> Borrar el proceso</button>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {estado && <span className={`procesos-chip ${estado}`} data-testid="procesos-estado">{TEXTO_DEL_ESTADO[estado]}</span>}
        <span className="procesos-esp" />
        {dibuja && abierto && (
          <>
            <button type="button" className="procesos-boton icono" title="Deshacer (Ctrl+Z)" aria-label="Deshacer" onClick={() => d.lienzo.current?.deshacer()}><Icono nombre="deshacer" /></button>
            <button type="button" className="procesos-boton icono" title="Rehacer (Ctrl+Y)" aria-label="Rehacer" onClick={() => d.lienzo.current?.rehacer()}><Icono nombre="rehacer" /></button>
            <span className="procesos-separador" aria-hidden="true" />
          </>
        )}
        {dibuja && <button type="button" className="procesos-boton" onClick={() => archivo.current?.click()} title="Traer un archivo BPMN de otro programa" data-testid="procesos-importar"><Icono nombre="subir" /> Importar</button>}
        {dibuja && abierto && (
          <div className="procesos-selector-caja" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="procesos-boton" aria-expanded={menu === "exportar"} onClick={() => setMenu(menu === "exportar" ? null : "exportar")} data-testid="procesos-exportar"><Icono nombre="bajar" /> Exportar</button>
            {menu === "exportar" && (
              <div className="procesos-menu procesos-menu-exportar" role="menu" data-testid="procesos-menu-exportar">
                <button type="button" role="menuitem" onClick={() => { setMenu(null); void d.exportar("png", abierto.nombre, TEXTO_DEL_ESTADO[estado!]); }} data-testid="procesos-exportar-png"><b>Imagen (PNG)</b><span>Para mandar o imprimir</span></button>
                <button type="button" role="menuitem" onClick={() => { setMenu(null); void d.exportar("bpmn", abierto.nombre, TEXTO_DEL_ESTADO[estado!]); }} data-testid="procesos-exportar-bpmn"><b>BPMN (estándar)</b><span>Para abrirlo en otro programa de procesos</span></button>
              </div>
            )}
          </div>
        )}
        {dibuja && abierto?.borrador && abierto.vigente && <button type="button" className="procesos-boton fantasma" onClick={() => void procesos.descartarBorrador()} data-testid="procesos-descartar">Descartar el borrador</button>}
        {dibuja && <button type="button" className={`procesos-boton ${marcarVigente ? "" : "principal"}`} onClick={() => setDialogo("nuevo")} title="Proceso nuevo" data-testid="procesos-nuevo"><Icono nombre="mas" /> Nuevo</button>}
        {marcarVigente && <button type="button" className="procesos-boton principal" onClick={() => void procesos.marcarVigente()} aria-keyshortcuts="Alt+V" data-testid="procesos-marcar-vigente"><Icono nombre="ok" /> Marcar vigente <span className="procesos-tecla">Alt V</span></button>}
      </header>

      {procesos.aviso && (
        <div className="procesos-aviso" role="alert" data-testid="procesos-aviso">
          <span>{procesos.aviso}</span>
          <button type="button" className="procesos-boton chico" onClick={procesos.cerrarAviso}>Entendido</button>
        </div>
      )}

      <div className="procesos-cuerpo">
        {dibuja && abierto && (
          <aside className={`procesos-figuras ${figuras ? "abierto" : "plegado"}`} data-testid="procesos-panel-figuras">
            <button type="button" className="procesos-plegar" onClick={alternarFiguras} aria-expanded={figuras} title="Mostrar u ocultar los nombres (Alt+F)" data-testid="procesos-plegar-figuras">
              <Icono nombre={figuras ? "panel" : "panel-derecho"} />{figuras && <span>Arrastrá al dibujo</span>}
            </button>
            {FIGURAS_EN_GRUPOS.map((f, i) => (
              <span key={f.tipo} className={`procesos-figura-caja ${GRUPO_NUEVO.has(i) ? "grupo" : ""}`}>
                <button type="button" className="procesos-figura" aria-label={f.nombre} data-testid={`procesos-figura-${f.tipo}`}
                  onMouseDown={(e) => { e.preventDefault(); d.lienzo.current?.empezarArrastre(e.nativeEvent, f.tipo); }}
                  onClick={() => d.lienzo.current?.agregar(f.tipo, d.elegido)}>
                  <Icono nombre={f.tipo as NombreDeIcono} tam={figuras ? 20 : 18} />{figuras && <span>{f.nombre}</span>}
                </button>
                {!figuras && <span className="procesos-globo" role="tooltip">{f.nombre}{f.tipo === "tarea" && <span className="procesos-tecla">Insert</span>}</span>}
              </span>
            ))}
          </aside>
        )}

        <div className="procesos-centro">
          <div className="procesos-dibujo" onKeyDownCapture={teclasDelDibujo}>
            {xml ? (
              <Lienzo ref={d.lienzo} xml={xml} soloLectura={!dibuja} alCambiar={d.alCambiar} alCargar={d.alCargar} alElegir={alElegir} alZoom={setZoom} alError={procesos.avisar} />
            ) : <p className="procesos-ayuda procesos-cargando" role="status">{procesos.cargando ? "Abriendo el proceso…" : "Elegí un proceso de la lista."}</p>}
            {errores.length > 0 && dibuja && <p className="procesos-errores-generales" data-testid="procesos-errores-generales"><Icono nombre="aviso" tam={16} />{errores.join(" · ")}</p>}
            {xml && (
              <div className="procesos-zoom">
                <button type="button" className="procesos-zoom-boton" aria-label="Alejar" onClick={() => d.lienzo.current?.alejar()}><Icono nombre="alejar" tam={18} /></button>
                <span className="procesos-zoom-valor" aria-label="Tamaño del dibujo">{Math.round(zoom * 100)} %</span>
                <button type="button" className="procesos-zoom-boton" aria-label="Acercar" onClick={() => d.lienzo.current?.acercar()}><Icono nombre="acercar" tam={18} /></button>
                <span className="procesos-zoom-raya" aria-hidden="true" />
                <button type="button" className="procesos-zoom-boton ancho" onClick={() => d.lienzo.current?.verTodo()}><Icono nombre="ver-todo" tam={18} />Ver todo</button>
              </div>
            )}
          </div>
        </div>

        {abierto && (
          <aside className={`procesos-del-paso ${delPaso ? "abierto" : "plegado"}`} data-testid="procesos-panel-paso">
            {delPaso ? (
              <>
                <div className="procesos-del-paso-cabeza">
                  <h2>Paso elegido</h2>
                  <span className="procesos-tecla">Alt E</span>
                  <button type="button" className="procesos-plegar-paso" onClick={alternarDelPaso} aria-expanded title="Plegar (Alt+E)" aria-label="Plegar el paso elegido" data-testid="procesos-plegar-paso"><Icono nombre="panel-derecho" /></button>
                </div>
                {d.pasoElegido ? <>
                  <div className="procesos-paso-tarjeta">
                    <span className="procesos-paso-icono"><Icono nombre={d.pasoElegido.tipo} tam={22} /></span>
                    <div><b>{d.pasoElegido.nombre || NOMBRE_DEL_TIPO[d.pasoElegido.tipo]}</b><span>{[`Paso ${orden.findIndex((p) => p.id === d.pasoElegido!.id) + 1} de ${orden.length}`, d.pasoElegido.carril ? `carril ${d.pasoElegido.carril}` : null].filter(Boolean).join(" · ")}</span></div>
                  </div>
                  <FormularioDelPaso paso={d.pasoElegido} grafo={d.grafo} pantallas={pantallas} soloLectura={!dibuja} alCambiar={(c) => d.lienzo.current?.cambiar(d.pasoElegido!.id, c)} />
                  {dibuja && <button type="button" className="procesos-quitar" onClick={() => d.lienzo.current?.quitar(d.pasoElegido!.id)} aria-keyshortcuts="Delete" data-testid="procesos-quitar-paso"><Icono nombre="tacho" tam={18} /> Quitar el paso <span className="procesos-tecla">Supr</span></button>}
                </> : <p className="procesos-ayuda">Tocá un paso del dibujo para ver sus datos.</p>}
              </>
            ) : (
              <button type="button" className="procesos-plegado-vertical" onClick={alternarDelPaso} aria-expanded={false} title="Mostrar el paso elegido (Alt+E)" data-testid="procesos-plegar-paso">
                <Icono nombre="panel" />
                {d.pasoElegido && <><Icono nombre={d.pasoElegido.tipo} /><span className="procesos-vertical">{d.pasoElegido.nombre || NOMBRE_DEL_TIPO[d.pasoElegido.tipo]}</span></>}
              </button>
            )}
          </aside>
        )}
      </div>

      <section className={`procesos-pasos ${pasos ? "abierto" : "plegado"}`} data-testid="procesos-panel-pasos">
        <button type="button" className="procesos-pasos-cabeza" onClick={alternarPasos} aria-expanded={pasos} data-testid="procesos-plegar-pasos">
          <Icono nombre="lista" /><b>Los pasos, en orden</b>
          <span className="procesos-ayuda">{resumen}</span>
          {conAviso > 0 && dibuja && <span className="procesos-chip borrador"><Icono nombre="aviso" tam={16} />{conAviso === 1 ? "1 paso con aviso" : `${conAviso} pasos con aviso`}</span>}
          <span className="procesos-esp" /><span className="procesos-tecla">Alt P</span><Icono nombre={pasos ? "abajo" : "arriba"} />
        </button>
        {pasos && <TablaDePasos procesos={procesos} d={d} dibuja={dibuja} />}
      </section>

      <EntradaDeArchivo archivo={archivo} alElegir={d.importar} />
      {dialogo === "nuevo" && <PedirNombre titulo="Proceso nuevo" boton="Crear" alCerrar={() => setDialogo(null)} alAceptar={async (n) => { if (await procesos.crear(n)) setDialogo(null); }} />}
      {dialogo === "renombrar" && abierto && <PedirNombre titulo="Cambiar el nombre" inicial={abierto.nombre} boton="Guardar" alCerrar={() => setDialogo(null)} alAceptar={async (n) => { if (await procesos.renombrar(n)) setDialogo(null); }} />}
      {dialogo === "borrar" && abierto && <ConfirmarBorrar nombre={abierto.nombre} alCerrar={() => setDialogo(null)} alBorrar={async () => { setDialogo(null); await procesos.borrar(); }} />}
      {dialogo === "historial" && abierto && <Historial procesos={procesos} puedeCopiar={dibuja} alCerrar={() => setDialogo(null)} />}
    </div>
  );
}

// Las figuras van en cuatro grupos, separados por una raya: los eventos, las tareas, las
// decisiones y el resto.
const ORDEN_DE_LAS_FIGURAS = ["inicio", "fin", "espera", "tarea", "persona", "sistema", "decision", "paralelo", "subproceso", "carril", "documento", "nota"];
const FIGURAS_EN_GRUPOS = ORDEN_DE_LAS_FIGURAS.map((t) => FIGURAS.find((f) => f.tipo === t)!);
const GRUPO_NUEVO = new Set([3, 6, 8]);

function TablaDePasos({ procesos, d, dibuja }: { procesos: Procesos; d: ReturnType<typeof useDibujo>; dibuja: boolean }) {
  const filas = filasDe(d.grafo);
  const errores = erroresDeForma(d.grafo).porPaso;
  return (
    <div className="procesos-tabla-caja">
      <table className="procesos-tabla" data-testid="procesos-tabla">
        <thead><tr><th>Paso</th><th>Tipo</th><th>Quién lo hace</th><th>Dónde se hace</th><th>Sigue con</th></tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className={f.id === d.elegido ? "elegida" : ""} onClick={() => d.lienzo.current?.elegir(f.id)} data-testid={`procesos-fila-${f.id}`}>
              <td>
                <span className="procesos-celda-paso"><Icono nombre={f.tipo} />
                  {dibuja ? (
                    <input defaultValue={f.nombre} key={`${f.id}-${f.nombre}`} aria-label={`Nombre de ${f.nombre || f.tipoTexto}`}
                      onBlur={(e) => { if (e.target.value !== f.nombre) d.lienzo.current?.cambiar(f.id, { nombre: e.target.value }); }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                  ) : <b>{f.nombre || f.tipoTexto}</b>}
                  {errores.get(f.id) && <span className="procesos-marca-error" title={errores.get(f.id)}>!</span>}
                </span>
              </td>
              <td>{f.tipoTexto}</td><td>{f.carril}</td><td>{f.pantalla}</td><td>{f.sigueCon}</td>
            </tr>
          ))}
          {!filas.length && <tr><td colSpan={5} className="procesos-ayuda">{procesos.cargando ? "Abriendo…" : "Todavía no hay pasos."}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function EntradaDeArchivo({ archivo, alElegir }: { archivo: React.RefObject<HTMLInputElement>; alElegir: (f: File) => void }) {
  return <input ref={archivo} type="file" accept=".bpmn,.xml,.bpmn2,application/xml,text/xml" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) alElegir(f); e.target.value = ""; }} data-testid="procesos-archivo" />;
}
