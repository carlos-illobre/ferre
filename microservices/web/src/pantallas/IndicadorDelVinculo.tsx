import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { alCambiarElVinculo, estadoDelVinculo, probarDirecta, type EstadoDelVinculo } from "../negocio/vinculo";
import { alAvisoDelEspejo, pausarEspejo, useEspejo } from "../negocio/espejo";
import { puestoRemoto } from "../negocio/vinculo";
import { useComandos } from "../plataforma/comandos";
import { TEXTOS, TEXTOS_DEL_VINCULO, texto, type Texto } from "./textos";

import "./indicador-del-vinculo.css";

// El estado de la conexión entre el celular y la computadora emparejados (specs/023, variante A):
// un puntito con un color por estado y el texto corto, en el lugar del vínculo. Al tocarlo se abre
// el detalle: con quién, por qué camino, la demora, desde cuándo y, si va por el servidor, por qué,
// con «Probar conexión directa». Ahí también están «Desconectar» y «Reconectar» (RF-77).
const t = TEXTOS.conexion;
type Clave = "directa" | "servidor" | "conectando" | "solo" | "pausa" | "sin-conexion";
type Vinculo = NonNullable<EstadoDelVinculo>;

const claveDe = (v: Vinculo, pausado: boolean): Clave => (pausado && v.conexion !== "sin-conexion" ? "pausa" : v.conexion);
const NOMBRES: Record<Exclude<Clave, "solo">, Texto> = { directa: t.directa, servidor: t.servidor, conectando: t.conectando, pausa: t.pausa, "sin-conexion": t.sinConexion };
const nombreDe = (clave: Clave, celular: boolean): Texto => (clave !== "solo" ? NOMBRES[clave] : celular ? t.soloEnElCelular : t.soloEnLaCompu);
const CAMINOS: Partial<Record<Clave, Texto>> = { directa: t.caminoDirecto, servidor: t.caminoServidor };
const MOTIVOS: Record<string, Texto> = { red: t.porLaRed, navegador: t.porElNavegador };

// «Hoy, 9:42», o la fecha si no fue hoy.
function cuando(ms: number): string {
  const d = new Date(ms);
  const hora = d.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit", hourCycle: "h23" });
  return d.toDateString() === new Date().toDateString() ? `Hoy, ${hora}` : `${d.toLocaleDateString("es-AR")}, ${hora}`;
}
// Por qué va por el servidor, y cuándo se probó la directa.
function porQue(v: Vinculo, x: (tx: Texto) => string): string {
  const probada = v.motivo && v.probadaEn ? ` Se probó ${cuando(v.probadaEn).replace("Hoy, ", "hoy a las ")}.` : "";
  return x(MOTIVOS[v.motivo ?? ""] ?? t.seCorto) + probada;
}

// El detalle va directo en el documento, para quedar encima de todo: en el celular, una hoja sobre
// el menú de abajo; en la computadora, encima del botón, sin que lo recorte el menú lateral.
function encima(celular: boolean, boton: HTMLElement | null, contenido: ReactNode) {
  const r = boton?.getBoundingClientRect();
  const lugar = celular || !r ? undefined : { left: r.left, bottom: window.innerHeight - r.top + 10 };
  return createPortal(<div className={`iv ${celular ? "iv-celu" : "iv-compu"}`} style={lugar && { position: "fixed", ...lugar, zIndex: 1000 }}>{contenido}</div>, document.body);
}

// Lo que terminó en el otro dispositivo («venta cobrada») se dice un momento (en la computadora).
function useAvisoDelOtro(celular: boolean): string | null {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => (celular ? undefined : alAvisoDelEspejo(setAviso)), [celular]);
  useEffect(() => { if (!aviso) return; const r = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(r); }, [aviso]);
  return aviso;
}

export function IndicadorDelVinculo({ celular = false }: { celular?: boolean }) {
  const v = useSyncExternalStore(alCambiarElVinculo, estadoDelVinculo);
  const { pausado } = useEspejo();
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const aviso = useAvisoDelOtro(celular);
  if (!v) return null;
  const clave = claveDe(v, pausado);
  const nombre = texto(nombreDe(clave, celular), celular);
  const cerrar = () => { setAbierto(false); boton.current?.focus(); };
  return (
    <div className={`iv ${celular ? "iv-celu" : "iv-compu"}`} data-testid="espejo">
      <button ref={boton} type="button" className="iv-boton" aria-haspopup="dialog" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)} data-testid="indicador-vinculo">
        <span className={`iv-punto ${clave}`} aria-hidden="true" />
        <span className="iv-textos">
          <b data-testid="espejo-estado" data-conexion={clave}>{nombre}</b>
          {!celular && <small>{v.lado === "computadora" ? "Con tu celular" : "Con la computadora"}</small>}
        </span>
      </button>
      {aviso && <span className="iv-aviso" data-testid="espejo-aviso">{aviso}</span>}
      {abierto && encima(celular, boton.current, <Detalle v={v} clave={clave} nombre={nombre} celular={celular} pausado={pausado} alCerrar={cerrar} />)}
    </div>
  );
}

// El detalle del vínculo: los datos, por qué va por el servidor y lo que se puede hacer.
function Detalle({ v, clave, nombre, celular, pausado, alCerrar }: { v: Vinculo; clave: Clave; nombre: string; celular: boolean; pausado: boolean; alCerrar: () => void }) {
  const x = (tx: Texto) => texto(tx, celular);
  const porServidor = v.conexion === "servidor";
  useComandos({ cerrar: alCerrar }, { encima: true });
  return (
    <>
      {celular && <div className="iv-velo" onClick={alCerrar} aria-hidden="true" />}
      <div className="iv-detalle" role="dialog" aria-label="Conexión con el otro dispositivo" data-testid="detalle-del-vinculo">
        <h3><span className={`iv-punto ${clave}`} aria-hidden="true" />{nombre}</h3>
        <Datos v={v} x={x} />
        {porServidor && <p className="iv-por" data-testid="por-que-servidor">{porQue(v, x)}</p>}
        <div className="iv-botones">
          {porServidor && <button type="button" className="iv-probar" onClick={() => probarDirecta()} data-testid="probar-directa">{x(t.probar)}</button>}
          {v.conexion !== "sin-conexion" && <BotonDePausa pausado={pausado} />}
          <button type="button" className="iv-comun" onClick={alCerrar} autoFocus data-testid="cerrar-detalle">{x(t.cerrar)}</button>
        </div>
      </div>
    </>
  );
}

// Con quién, por qué camino, la demora de la última confirmación y desde cuándo.
function Datos({ v, x }: { v: Vinculo; x: (tx: Texto) => string }) {
  const camino = CAMINOS[v.conexion];
  return (
    <dl>
      <dt>Con</dt><dd>{v.lado === "computadora" ? "Tu celular" : (puestoRemoto()?.nombre ?? "La computadora")}</dd>
      <dt>Camino</dt><dd>{camino ? x(camino) : "—"}</dd>
      <dt>Demora</dt><dd>{v.demoraMs === null ? "—" : `${v.demoraMs} ms ida y vuelta`}</dd>
      <dt>Desde</dt><dd>{cuando(v.desde)}</dd>
    </dl>
  );
}

// «Desconectar» para trabajar cada uno por su lado un rato, o «Reconectar» (decisiones 73 y 75).
function BotonDePausa({ pausado }: { pausado: boolean }) {
  return pausado
    ? <button type="button" className="iv-comun" onClick={() => pausarEspejo(false)} data-testid="reconectar-arriba">{TEXTOS_DEL_VINCULO.juntar}</button>
    : <button type="button" className="iv-comun" onClick={() => pausarEspejo(true)} data-testid="desconectar-arriba">{TEXTOS_DEL_VINCULO.separar}</button>;
}
