import { useRef, useState, type DragEvent } from "react";
import { useCargaDeLista, type Cargada, type Proveedor } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { AvisoError, Icono } from "../componentes/base";
import css from "./Listas.module.css";

// Donde se sube la planilla: se suelta encima o se elige. Si no se sabe de qué proveedor o de qué
// fecha es, se pregunta y el archivo queda elegido.
type Carga = ReturnType<typeof useCargaDeLista>;

export function ZonaDeCarga({ proveedores, alCargar }: { proveedores: Proveedor[]; alCargar: (c: Cargada) => void }) {
  const c = useCargaDeLista(alCargar);
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const proveedorElegido = useRef<HTMLSelectElement>(null);
  const elegir = (f: File | undefined) => { if (f) c.elegir(f); };
  function soltar(e: DragEvent<HTMLElement>) { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); }
  return (
    <>
      <div className={`${css.cargar} ${arrastrando ? "arrastrando" : ""}`} onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={soltar} data-testid="zona-de-carga">
        <span className={css.cargarIc}><Icono nombre="subirArchivo" tam={22} /></span>
        <span className={css.cargarTexto}>
          <b>{c.estado === "leyendo" ? `Leyendo ${c.archivo?.name ?? ""}…` : TEXTOS.listas.cargarUnaLista.corto}</b>
          <small>{TEXTOS.listas.soltaElExcel.corto}</small>
        </span>
        <button type="button" className={css.subir} disabled={c.estado !== "esperando"} onClick={() => entrada.current?.click()} data-testid="subir-lista">{TEXTOS.listas.subirLista.corto}</button>
      </div>
      <LaPregunta c={c} proveedores={proveedores} elegido={proveedorElegido} />
      <AvisoError texto={c.error?.motivo ?? null} alCerrar={() => c.setError(null)} />
      <input ref={entrada} type="file" accept=".xlsx,.xls" hidden data-testid="archivo" onChange={(e) => elegir(e.target.files?.[0])} />
    </>
  );
}

function LaPregunta({ c, proveedores, elegido }: { c: Carga; proveedores: Proveedor[]; elegido: React.RefObject<HTMLSelectElement> }) {
  if (!c.archivo) return null;
  if (c.estado === "falta-proveedor") return <PreguntaProveedor c={c} archivo={c.archivo} proveedores={proveedores} elegido={elegido} />;
  if (c.estado === "falta-fecha") return <PreguntaFecha c={c} archivo={c.archivo} proveedor={elegido} />;
  return null;
}

function PreguntaProveedor({ c, archivo, proveedores, elegido }: { c: Carga; archivo: File; proveedores: Proveedor[]; elegido: React.RefObject<HTMLSelectElement> }) {
  return (
    <div className="tarjeta">
      <span>No reconocí de qué proveedor es <strong>{archivo.name}</strong>. ¿De cuál es?</span>
      <select ref={elegido} defaultValue="" className="campo grande" style={{ width: "100%" }} data-testid="elegir-proveedor">
        <option value="" disabled>Elegir proveedor</option>
        {proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <LeerOCancelar c={c} alLeer={() => { if (elegido.current?.value) void c.enviar(archivo, { proveedor_id: elegido.current.value }); }} />
    </div>
  );
}

// El proveedor que se eligió antes sigue valiendo si después falta la fecha.
function PreguntaFecha({ c, archivo, proveedor }: { c: Carga; archivo: File; proveedor: React.RefObject<HTMLSelectElement> }) {
  const fecha = useRef<HTMLInputElement>(null);
  const leer = () => {
    if (!fecha.current?.value) return;
    void c.enviar(archivo, { fecha_lista: fecha.current.value, ...(proveedor.current?.value ? { proveedor_id: proveedor.current.value } : {}) });
  };
  return (
    <div className="tarjeta">
      <span>La planilla no dice su fecha. ¿De qué fecha es la lista?</span>
      <input ref={fecha} type="date" className="campo grande" defaultValue={new Date().toISOString().slice(0, 10)} />
      <LeerOCancelar c={c} alLeer={leer} />
    </div>
  );
}

function LeerOCancelar({ c, alLeer }: { c: Carga; alLeer: () => void }) {
  return (
    <div className="acciones dos">
      <button type="button" className="boton tinta" onClick={alLeer}>Leer</button>
      <button type="button" className="boton" onClick={c.cancelar}>Cancelar</button>
    </div>
  );
}
