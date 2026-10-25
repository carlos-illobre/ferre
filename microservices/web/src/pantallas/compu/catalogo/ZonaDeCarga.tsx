import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useCargaDeLista, type Cargada, type Proveedor } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Aviso, Boton, Icono, Progreso } from "../base/ui";
import css from "./Listas.module.css";

// Donde se entrega el archivo: la zona punteada de la v2. Se suelta encima o se elige (Alt S). Si
// no se sabe de qué proveedor o de qué fecha es, se pregunta y el archivo queda elegido.
const t = TEXTOS.listas;
type Props = { proveedores: Proveedor[]; enLinea: boolean; elegir: React.MutableRefObject<() => void>; alCargar: (c: Cargada) => void };

export function ZonaDeCarga({ proveedores, enLinea, elegir: abrirSelector, alCargar }: Props) {
  const c = useCargaDeLista(alCargar);
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const libre = c.estado === "esperando" && enLinea;
  useEffect(() => { abrirSelector.current = () => { if (libre) entrada.current?.click(); }; }, [abrirSelector, libre]);
  const elegir = (f: File | undefined) => { if (f && libre) c.elegir(f); };
  const soltar = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); };
  return (
    <div className={css.zonaLugar}>
      <div className={claseDeLaZona(arrastrando, c.estado === "esperando")} data-testid="zona-de-carga"
        onDragOver={(e) => { e.preventDefault(); if (libre) setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={soltar}>
        {c.estado === "leyendo" ? <Progreso texto={`Leyendo ${c.archivo?.name ?? "la planilla"}…`} /> : <ElegirArchivo libre={libre} arrastrando={arrastrando} alElegir={() => entrada.current?.click()} />}
      </div>
      {c.archivo && <Pregunta c={c} proveedores={proveedores} />}
      <input ref={entrada} type="file" accept=".xlsx,.xls" hidden data-testid="archivo" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
      {c.estado === "esperando" && <AvisosDeLaCarga enLinea={enLinea} error={c.error} />}
    </div>
  );
}

function AvisosDeLaCarga({ enLinea, error }: { enLinea: boolean; error: Carga["error"] }) {
  return (
    <>
      {!enLinea && <Aviso tipo="alerta">Sin conexión. Cargar una lista necesita internet; lo demás sigue funcionando.</Aviso>}
      {error && <Aviso tipo="error" testId="error-de-carga"><strong>No se cargó {error.archivo}.</strong> {error.motivo}</Aviso>}
    </>
  );
}

const claseDeLaZona = (arrastrando: boolean, esperando: boolean) => [css.zona, arrastrando ? "arrastrando" : "", esperando ? "" : "ocupada"].join(" ");

function ElegirArchivo({ libre, arrastrando, alElegir }: { libre: boolean; arrastrando: boolean; alElegir: () => void }) {
  const idAyuda = useId();
  return (
    <button type="button" className={css.zonaBoton} disabled={!libre} aria-describedby={idAyuda} onClick={alElegir} data-testid="elegir-archivo">
      <span className={css.zonaIc} aria-hidden="true"><Icono nombre="subir-archivo" /></span>
      <span className={css.texto}>
        <b>{arrastrando ? "Soltala acá" : t.cargarUnaLista.largo}</b>
        <span id={idAyuda}>{t.soltaElExcel.largo} <kbd className="tecla" aria-hidden="true">Alt S</kbd></span>
      </span>
    </button>
  );
}

type Carga = ReturnType<typeof useCargaDeLista>;

// La pregunta que falta para leer la lista: de qué proveedor es, o de qué fecha. El proveedor que se
// eligió sigue valiendo si después falta la fecha.
function Pregunta({ c, proveedores }: { c: Carga; proveedores: Proveedor[] }) {
  const [proveedorId, setProveedorId] = useState("");
  const [falta, setFalta] = useState(false);
  const idFalta = useId();
  const p: Preguntando = {
    c, proveedorId, falta, idFalta, alFaltar: () => setFalta(true),
    alElegir: (id: string) => { setProveedorId(id); setFalta(false); }, alCambiar: () => setFalta(false),
    cancelar: () => { c.cancelar(); setProveedorId(""); setFalta(false); },
  };
  if (c.estado === "falta-proveedor") return <PreguntaProveedor p={p} proveedores={proveedores} />;
  return c.estado === "falta-fecha" ? <PreguntaFecha p={p} /> : null;
}

type Preguntando = { c: Carga; proveedorId: string; falta: boolean; idFalta: string; alFaltar: () => void; alElegir: (id: string) => void; alCambiar: () => void; cancelar: () => void };

function leer(e: FormEvent, p: Preguntando, extra: Record<string, string> | null) {
  e.preventDefault();
  if (extra) void p.c.enviar(p.c.archivo!, extra); else p.alFaltar();
}

const Botones = ({ p }: { p: Preguntando }) => <div className="fila"><Boton type="submit" variante="principal">Leer la lista</Boton><Boton onClick={p.cancelar}>Cancelar</Boton></div>;

function PreguntaProveedor({ p, proveedores }: { p: Preguntando; proveedores: Proveedor[] }) {
  const sinElegir = p.falta && !p.proveedorId;
  return (
    <form className={css.pregunta} onSubmit={(e) => leer(e, p, p.proveedorId ? { proveedor_id: p.proveedorId } : null)} noValidate>
      <strong><Icono nombre="alerta" tam={18} />No reconocí de qué proveedor es {p.c.archivo!.name}</strong>
      <p className="detalle">Elegilo y la leo de nuevo. No hace falta volver a elegir el archivo.</p>
      <label className="campo">
        <span>Proveedor de esta lista</span>
        <select className="selector" value={p.proveedorId} autoFocus aria-invalid={sinElegir} aria-describedby={sinElegir ? p.idFalta : undefined} onChange={(e) => p.alElegir(e.target.value)} data-testid="elegir-proveedor">
          <option value="" disabled>Elegí el proveedor</option>
          {proveedores.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
      </label>
      {sinElegir && <p id={p.idFalta} className={css.falta}>Elegí de qué proveedor es la lista.</p>}
      <Botones p={p} />
    </form>
  );
}

function PreguntaFecha({ p }: { p: Preguntando }) {
  const fechaElegida = useRef<HTMLInputElement>(null);
  const conFecha = () => { const f = fechaElegida.current?.value; return f ? { fecha_lista: f, ...(p.proveedorId ? { proveedor_id: p.proveedorId } : {}) } : null; };
  return (
    <form className={css.pregunta} onSubmit={(e) => leer(e, p, conFecha())} noValidate>
      <strong><Icono nombre="reloj" tam={18} />La planilla {p.c.archivo!.name} no dice su fecha</strong>
      <p className="detalle">Indicá de qué fecha es la lista: con eso se sabe cuál es la más nueva de cada proveedor.</p>
      <label className="campo">
        <span>Fecha de la lista</span>
        <input ref={fechaElegida} className="entrada" type="date" autoFocus defaultValue={new Date().toISOString().slice(0, 10)} aria-invalid={p.falta} aria-describedby={p.falta ? p.idFalta : undefined} onChange={p.alCambiar} data-testid="elegir-fecha" />
      </label>
      {p.falta && <p id={p.idFalta} className={css.falta}>Escribí la fecha de la lista.</p>}
      <Botones p={p} />
    </form>
  );
}
