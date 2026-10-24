import { useEffect, useRef, useSyncExternalStore } from "react";
import { alCambiarElVinculo, alMensajeDelOtro, arrancarEnlace, elOtroEsta, estadoDelVinculo, mandarAlOtro, type Lado } from "./enlace";

// El espejo entre el celular y la computadora emparejados (decisión 60). Con la aplicación
// abierta en los dos, están en la misma parte y comparten el trabajo en curso (la venta).
// Viaja por el enlace entre los dos (specs/023, `enlace.ts`); acá vive qué significa cada cosa.
// Qué se espeja lo decide cada pantalla (la navegación, la venta).
//
// Reglas:
//  - Se espeja solo con el otro presente y sin pausa. Si el otro no está, este lado trabaja
//    solo y guarda lo suyo; al encontrarse, cada uno le cuenta al otro lo que tiene.
//  - Al encontrarse: la parte es la de la computadora (decisión 71). De cada trabajo en curso
//    queda el que cambió último (el que acaba de abrir no cambió nada); si empatan, el de la
//    computadora. Si uno estaba en pausa, quedan en pausa.
//  - «Pausar» los separa sin desemparejarlos. Al reanudar manda la computadora, que es la
//    herramienta principal: vuelve a avisar dónde está y cómo tiene la venta.
//  - Lo que llega del otro lado no se vuelve a avisar (si no, rebotaría para siempre).
export type { Lado };
export type EstadoDelEspejo = { emparejado: boolean; lado: Lado | null; conectado: boolean; otroPresente: boolean; pausado: boolean };
// Lo que se espeja: la parte en la que están y cada trabajo en curso.
type Tipo = "ir" | "venta" | "ingreso" | "pedido" | "pedido-renglones";
const DOCUMENTOS: Tipo[] = ["venta", "ingreso", "pedido", "pedido-renglones"];
const TIPOS: Tipo[] = ["ir", ...DOCUMENTOS];

let pausado = false;
let estado: EstadoDelEspejo = { emparejado: false, lado: null, conectado: false, otroPresente: false, pausado: false };
const oyentesDeEstado = new Set<() => void>();

const suscriptos: Record<Tipo, Set<(datos: unknown) => void>> = { ir: new Set(), venta: new Set(), ingreso: new Set(), pedido: new Set(), "pedido-renglones": new Set() };
// Los avisos de algo que terminó del otro lado («venta cobrada»): pasan y no se guardan.
const oyentesDeAvisos = new Set<(texto: string) => void>();
// Cada pantalla que espeja algo sabe contarlo; devuelve si tenía algo para contar.
const alReanudar = new Map<() => boolean, Tipo>();
const reanudar = (solo?: Tipo) => { let conto = false; alReanudar.forEach((tipo, f) => { if (!solo || tipo === solo) conto = f() || conto; }); return conto; };
// Lo último avisado o recibido de cada cosa, y cuándo: en qué quedaron los dos.
const acordado: Partial<Record<Tipo, unknown>> = {};
const acordadoEn: Partial<Record<Tipo, number>> = {};
const acordar = (tipo: Tipo, datos: unknown) => { acordado[tipo] = datos; acordadoEn[tipo] = Date.now(); };
let irSinContar = false; // la computadora se encontró antes de tener pantalla: le debe al celular dónde está
let sala: string | null = null;

const enEspejo = () => estado.otroPresente && !estado.pausado;
function entregar(tipo: Tipo, datos: unknown) {
  if (datos === null || datos === undefined) return;
  acordar(tipo, datos);
  if (!estado.pausado) suscriptos[tipo].forEach((s) => s(datos));
}

// El estado del espejo sale del enlace y de la pausa.
function ponerEstado() {
  const v = estadoDelVinculo();
  const antes = estado;
  estado = {
    emparejado: v !== null, lado: v?.lado ?? null, pausado,
    conectado: v !== null && v.conexion !== "sin-conexion" && v.conexion !== "conectando",
    otroPresente: elOtroEsta(),
  };
  // Otro vínculo: se empieza de cero.
  const id = v?.sala ?? null;
  if (id !== sala) { sala = id; for (const t of TIPOS) { delete acordado[t]; delete acordadoEn[t]; } }
  oyentesDeEstado.forEach((o) => o());
  if (estado.otroPresente && !antes.otroPresente) seEncontraron();
}

// Al encontrarse, cada uno le cuenta al otro lo que tiene (antes lo guardaba el servidor).
function seEncontraron() {
  const ahora = Date.now();
  const docs = Object.fromEntries(DOCUMENTOS.filter((d) => acordado[d] !== undefined).map((d) => [d, { datos: acordado[d], haceMs: ahora - acordadoEn[d]! }]));
  void mandarAlOtro({ tipo: "estado", docs, pausado });
  // La parte la cuenta la computadora; si todavía está abriendo, la cuenta apenas la tenga.
  if (estado.lado === "computadora" && !reanudar("ir")) irSinContar = true;
}
function alEstadoDelOtro(docs: Record<string, { datos: unknown; haceMs: number }>, pausadoAlla: boolean) {
  const ahora = Date.now();
  if (pausadoAlla && !pausado) { pausado = true; ponerEstado(); }
  for (const d of DOCUMENTOS) {
    const suyo = docs[d];
    if (!suyo) continue;
    const mioHace = acordadoEn[d] === undefined ? Infinity : ahora - acordadoEn[d]!;
    if (suyo.haceMs < mioHace || (suyo.haceMs === mioHace && estado.lado === "celular")) entregar(d, suyo.datos);
  }
}

function alMensaje(m: Parameters<Parameters<typeof alMensajeDelOtro>[0]>[0]) {
  if (m.tipo === "espejo" && TIPOS.includes(m.cambio as Tipo)) entregar(m.cambio as Tipo, m.datos);
  else if (m.tipo === "estado" && typeof m.docs === "object" && m.docs !== null) alEstadoDelOtro(m.docs, m.pausado === true);
  else if (m.tipo === "pausa") {
    const reanuda = pausado && !m.pausado;
    pausado = m.pausado === true;
    ponerEstado();
    if (reanuda && estado.lado === "computadora") reanudar();
  } else if (m.tipo === "aviso" && typeof m.texto === "string" && !pausado) oyentesDeAvisos.forEach((o) => o(m.texto.slice(0, 300)));
}

let arrancado = false;
function arrancar() {
  if (arrancado || typeof window === "undefined") return;
  arrancado = true;
  arrancarEnlace();
  alCambiarElVinculo(ponerEstado);
  alMensajeDelOtro(alMensaje);
  ponerEstado();
}

// Avisar un cambio de este lado. Se guarda siempre (para contarlo al encontrarse); se manda
// solo con el otro presente y sin pausa.
export function avisarAlEspejo(tipo: Tipo, datos: unknown): void {
  if (pausado) return;
  acordar(tipo, datos);
  if (enEspejo()) void mandarAlOtro({ tipo: "espejo", cambio: tipo, datos });
}
// Contarle al otro lado algo que terminó acá: se le muestra un momento y no se guarda.
export function contarAlEspejo(texto: string): void {
  if (enEspejo()) void mandarAlOtro({ tipo: "aviso", texto });
}

export function alAvisoDelEspejo(oyente: (texto: string) => void): () => void {
  oyentesDeAvisos.add(oyente);
  if (avisoPendiente && avisoPendiente.hasta > Date.now()) oyente(avisoPendiente.texto);
  avisoPendiente = null;
  return () => { oyentesDeAvisos.delete(oyente); };
}
// Un aviso de algo que pasó en la computadora por una acción de este celular (la computadora
// entró): se muestra en el mismo lugar que los avisos del espejo. Si todavía no hay dónde
// mostrarlo (la pantalla de siempre no se abrió), espera unos segundos a que aparezca.
let avisoPendiente: { texto: string; hasta: number } | null = null;
export function avisarEnEsteDispositivo(texto: string): void {
  if (oyentesDeAvisos.size) { oyentesDeAvisos.forEach((o) => o(texto)); return; }
  avisoPendiente = { texto, hasta: Date.now() + 5000 };
}
export function pausarEspejo(pausar: boolean): void {
  if (!estado.emparejado) return;
  pausado = pausar;
  ponerEstado();
  void mandarAlOtro({ tipo: "pausa", pausado: pausar });
}

export function useEspejo(): EstadoDelEspejo & { enEspejo: boolean } {
  useEffect(arrancar, []);
  const e = useSyncExternalStore((o) => { oyentesDeEstado.add(o); return () => { oyentesDeEstado.delete(o); }; }, () => estado);
  return { ...e, enEspejo: e.otroPresente && !e.pausado };
}

// Espejar un valor de la pantalla: `valor` es lo de este lado y `aplicar` pone lo que llega del
// otro. Lo que llega no se vuelve a avisar. `listo` frena aplicar hasta que la pantalla pueda
// (por ejemplo, hasta tener el catálogo para armar los renglones de la venta).
export function useEspejar<T>(tipo: Tipo, valor: T, aplicar: (v: T) => void, listo = true): void {
  useEffect(arrancar, []);
  const visto = useRef<string | null>(null);      // lo último avisado o aplicado, serializado
  const pendiente = useRef<T | null>(null);
  const aplicarRef = useRef(aplicar); aplicarRef.current = aplicar;
  const valorRef = useRef(valor); valorRef.current = valor;
  const listoRef = useRef(listo); listoRef.current = listo;
  const primera = useRef(true);
  const eraNada = useRef(false);

  useEffect(() => {
    const recibir = (datos: unknown) => {
      const texto = JSON.stringify(datos);
      if (texto === visto.current) return;
      if (!listoRef.current) { pendiente.current = datos as T; return; }
      visto.current = texto;
      aplicarRef.current(datos as T);
    };
    // La pantalla que se abre retoma el trabajo donde habían quedado los dos: así una venta o
    // un ingreso a medio cargar no se pierde por ir a mirar otra parte.
    if (acordado[tipo] !== undefined && enEspejo()) recibir(acordado[tipo]);
    const contar = () => {
      // Una pantalla que es solo de este dispositivo (sin parte) no tiene dónde llevar al otro.
      if (tipo === "ir" && valorRef.current === null) return false;
      visto.current = JSON.stringify(valorRef.current); avisarAlEspejo(tipo, valorRef.current);
      return true;
    };
    suscriptos[tipo].add(recibir); alReanudar.set(contar, tipo);
    return () => { suscriptos[tipo].delete(recibir); alReanudar.delete(contar); };
  }, [tipo]);

  useEffect(() => {
    if (!listo || pendiente.current === null) return;
    const v = pendiente.current; pendiente.current = null;
    visto.current = JSON.stringify(v);
    aplicarRef.current(v);
  }, [listo]);

  const texto = JSON.stringify(valor);
  useEffect(() => {
    // La computadora que se encontró sin pantalla todavía cuenta dónde está apenas lo sabe.
    if (tipo === "ir" && irSinContar && texto !== "null" && enEspejo()) {
      irSinContar = false; primera.current = false; eraNada.current = false; visto.current = texto;
      avisarAlEspejo(tipo, JSON.parse(texto));
      return;
    }
    // Al abrirse, la pantalla no pisa lo del otro con su estado inicial.
    if (primera.current) { primera.current = false; eraNada.current = texto === "null"; if (visto.current === null) visto.current = texto; return; }
    // Sin nada que espejar (una pantalla que es solo de este dispositivo: la cámara, un enlace
    // con código) no se avisa. Y al volver de una de esas no se arrastra al otro: se vuelve a
    // donde habían quedado los dos.
    const veniaDeNada = eraNada.current;
    eraNada.current = texto === "null";
    if (texto === visto.current || texto === "null") return;
    if (veniaDeNada && acordado[tipo] != null && enEspejo() && JSON.stringify(acordado[tipo]) !== texto) {
      visto.current = JSON.stringify(acordado[tipo]);
      aplicarRef.current(acordado[tipo] as T);
      return;
    }
    visto.current = texto;
    // Lo que cambia mientras el vínculo todavía se está conectando (la pantalla con la que abre
    // la aplicación) no es una decisión de la persona: si se avisara, arrastraría al otro. Al
    // encontrarse se decide quién sigue a quién.
    if (pausado) return;
    if (!estado.conectado) { acordar(tipo, JSON.parse(texto)); return; }
    const t = setTimeout(() => avisarAlEspejo(tipo, JSON.parse(texto)), 150);
    return () => clearTimeout(t);
  }, [texto, tipo]);
}
