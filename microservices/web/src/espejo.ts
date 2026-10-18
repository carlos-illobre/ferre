import { useEffect, useRef, useSyncExternalStore } from "react";
import { api, leerToken, urlApi } from "./api";
import { escucharFlujo } from "./plataforma/tiempo-real/flujo-de-eventos";
import { EVENTO_EMPAREJAMIENTO, guardarPuestoLocal, guardarPuestoRemoto, puestoLocal, puestoRemoto } from "./puesto";
import { EVENTO_SESION_ABIERTA } from "./sesion";
import type { CambioEnEspejo } from "@servidor/puestos";

// El espejo entre el celular y la computadora emparejados (decisión 60). Con la aplicación
// abierta en los dos, están en la misma parte y comparten el trabajo en curso (la venta).
// Acá vive el canal: una conexión que escucha al otro lado y se reconecta sola, y el aviso de
// lo que cambia de este lado. Qué se espeja lo decide cada pantalla (la navegación, la venta).
//
// Reglas:
//  - Se espeja solo con el otro presente y sin pausa. Si el otro no está, este lado trabaja
//    solo, pero sigue avisando: el servidor guarda lo último y el que llega después, con este
//    lado todavía abierto, lo toma.
//  - «Pausar» los separa sin desemparejarlos. Al reanudar manda la computadora, que es la
//    herramienta principal: vuelve a avisar dónde está y cómo tiene la venta.
//  - Lo que llega del otro lado no se vuelve a avisar (si no, rebotaría para siempre).
export type Lado = "computadora" | "celular";
export type EstadoDelEspejo = { emparejado: boolean; lado: Lado | null; conectado: boolean; otroPresente: boolean; pausado: boolean };
// Lo que se espeja: la parte en la que están y cada trabajo en curso.
type Tipo = "ir" | "venta" | "ingreso" | "pedido" | "pedido-renglones";
const DOCUMENTOS: Tipo[] = ["venta", "ingreso", "pedido", "pedido-renglones"];

let estado: EstadoDelEspejo = { emparejado: false, lado: null, conectado: false, otroPresente: false, pausado: false };
const oyentesDeEstado = new Set<() => void>();
function poner(cambios: Partial<EstadoDelEspejo>) { estado = { ...estado, ...cambios }; oyentesDeEstado.forEach((o) => o()); }

const suscriptos: Record<Tipo, Set<(datos: unknown) => void>> = { ir: new Set(), venta: new Set(), ingreso: new Set(), pedido: new Set(), "pedido-renglones": new Set() };
// Los avisos de algo que terminó del otro lado («venta cobrada»): pasan y no se guardan.
const oyentesDeAvisos = new Set<(texto: string) => void>();
// En el celular: la computadora le pidió que haga de lector o una foto, y hay que preguntar qué es.
const oyentesDePedidos = new Set<() => void>();
// Cada pantalla que espeja algo sabe contarlo; devuelve si tenía algo para contar.
const alReanudar = new Map<() => boolean, Tipo>();
const reanudar = (solo?: Tipo) => { let conto = false; alReanudar.forEach((tipo, f) => { if (!solo || tipo === solo) conto = f() || conto; }); return conto; };
const acordado: Partial<Record<Tipo, unknown>> = {}; // lo último avisado o recibido de cada cosa: en qué quedaron los dos
let puestoId: string | null = null;
let irSinContar = false; // la computadora se conectó antes de tener pantalla: le debe al celular dónde está
let cortar: (() => void) | null = null;

const enEspejo = () => estado.conectado && estado.otroPresente && !estado.pausado;
function entregar(tipo: Tipo, datos: unknown) {
  if (datos === null || datos === undefined) return;
  acordado[tipo] = datos;
  if (!estado.pausado) suscriptos[tipo].forEach((s) => s(datos));
}

function conectar() {
  const lado: Lado | null = puestoLocal() ? "computadora" : puestoRemoto() ? "celular" : null;
  const id = puestoLocal()?.id ?? puestoRemoto()?.id ?? null;
  if (id === puestoId && (id === null || cortar)) return;
  cortar?.(); cortar = null; puestoId = id; irSinContar = false;
  for (const t of ["ir", ...DOCUMENTOS] as Tipo[]) delete acordado[t];
  if (!id || !lado) { poner({ emparejado: false, lado: null, conectado: false, otroPresente: false, pausado: false }); return; }
  poner({ emparejado: true, lado, conectado: false, otroPresente: false });
  const presencia = (p: { computadora: boolean; celular: boolean }) => poner({ otroPresente: lado === "computadora" ? p.celular : p.computadora });
  // La conexión (escuchar el flujo y reconectar) es tecnología de la plataforma; acá va qué
  // significa cada evento del espejo.
  cortar = escucharFlujo({
    url: urlApi(`/puestos/${id}/espejo`),
    cabeceras: () => ({ Authorization: `Bearer ${leerToken() ?? ""}` }),
    ignorar: ["latido"],
    // El vínculo ya no existe (404) o la sesión no vale (401): no se insiste. Con 401 se vuelve
    // a intentar cuando se abra una sesión: si no, quedaría «Conectando…» para siempre.
    alResponder: (codigo) => {
      if (codigo !== 404 && codigo !== 401) return;
      if (codigo === 404) { guardarPuestoLocal(null); guardarPuestoRemoto(null); }
      else { cortar = null; puestoId = null; poner({ conectado: false, otroPresente: false }); }
      return "cortar";
    },
    alDesconectar: () => poner({ conectado: false, otroPresente: false }),
    alEvento: (evento, datos) => {
      if (evento === "estado") {
        const e = datos as { parte: string | null; docs: Record<string, unknown>; pausado: boolean; presentes: { computadora: boolean; celular: boolean } };
        const hayAlgo = e.parte !== null || DOCUMENTOS.some((d) => (e.docs?.[d] ?? null) !== null);
        poner({ conectado: true, pausado: e.pausado });
        presencia(e.presentes);
        // El que llega con el otro ya trabajando se suma a lo que el otro tiene. Si el otro no
        // está (o no hay nada todavía), este lado sigue con lo suyo y lo cuenta: lo guardado
        // puede ser de hace horas, y no tiene que mover a quien acaba de abrir la aplicación.
        const elOtroEsta = lado === "computadora" ? e.presentes.celular : e.presentes.computadora;
        // La excepción es dónde se está parado: ahí manda siempre la computadora (decisión 71).
        // La computadora cuenta su pantalla y el celular va a ella, nunca al revés al conectarse.
        if (elOtroEsta && hayAlgo) {
          // Si la computadora todavía está abriendo (sin pantalla que contar), la cuenta apenas la tenga.
          if (lado !== "computadora") entregar("ir", e.parte);
          else if (!reanudar("ir")) irSinContar = true;
          for (const d of DOCUMENTOS) entregar(d, e.docs?.[d]);
        }
        // Con los dos recién llegados y nada acordado todavía, cuenta lo suyo solo la
        // computadora, que es la principal: si contaran los dos, se cruzarían.
        else if (!elOtroEsta || lado === "computadora") reanudar();
      } else if (evento === "presencia") presencia(datos as { computadora: boolean; celular: boolean });
      else if (evento === "pausa") {
        const pausado = Boolean(datos);
        const reanuda = estado.pausado && !pausado;
        poner({ pausado });
        if (reanuda && lado === "computadora") reanudar();
      } else if (evento === "desvinculado") { guardarPuestoLocal(null); guardarPuestoRemoto(null); return "cortar"; }
      else if (evento === "aviso") { if (!estado.pausado) oyentesDeAvisos.forEach((o) => o(String(datos ?? ""))); }
      // La computadora le pidió algo a este celular (decisión 112): con o sin pausa, porque no es trabajo espejado.
      else if (evento === "pedidos") oyentesDePedidos.forEach((o) => o());
      else if (evento === "ir" || DOCUMENTOS.includes(evento as Tipo)) entregar(evento as Tipo, datos);
      return;
    },
  });
}

let arrancado = false;
function arrancar() {
  if (arrancado || typeof window === "undefined") return;
  arrancado = true;
  window.addEventListener(EVENTO_EMPAREJAMIENTO, conectar);
  window.addEventListener(EVENTO_SESION_ABIERTA, conectar);
  conectar();
}

// Avisar un cambio de este lado. En pausa no se avisa nada.
export function avisarAlEspejo(tipo: Tipo, datos: unknown): void {
  if (!puestoId || !estado.conectado || estado.pausado) return;
  acordado[tipo] = datos;
  api(`/puestos/${puestoId}/espejo`, { method: "POST", body: JSON.stringify({ tipo, datos } satisfies CambioEnEspejo) }).catch(() => undefined);
}
// Contarle al otro lado algo que terminó acá: se le muestra un momento y no se guarda.
export function contarAlEspejo(texto: string): void {
  if (!puestoId || !enEspejo()) return;
  api(`/puestos/${puestoId}/espejo`, { method: "POST", body: JSON.stringify({ tipo: "aviso", datos: texto } satisfies CambioEnEspejo) }).catch(() => undefined);
}
export function alPedidoDeLaCompu(oyente: () => void): () => void {
  oyentesDePedidos.add(oyente);
  return () => { oyentesDePedidos.delete(oyente); };
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
  if (!puestoId) return;
  poner({ pausado: pausar });
  api(`/puestos/${puestoId}/espejo`, { method: "POST", body: JSON.stringify({ tipo: "pausa", datos: pausar } satisfies CambioEnEspejo) }).catch(() => undefined);
}

export function useEspejo(): EstadoDelEspejo & { enEspejo: boolean } {
  useEffect(arrancar, []);
  const e = useSyncExternalStore((o) => { oyentesDeEstado.add(o); return () => { oyentesDeEstado.delete(o); }; }, () => estado);
  return { ...e, enEspejo: e.conectado && e.otroPresente && !e.pausado };
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
    // La computadora que se conectó sin pantalla todavía cuenta dónde está apenas lo sabe.
    if (tipo === "ir" && irSinContar && texto !== "null" && estado.conectado && !estado.pausado) {
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
    // Solo se avisa lo que cambia con el espejo ya conectado. Lo que cambia antes (la pantalla
    // con la que abre la aplicación, mientras todavía se está conectando) no es una decisión
    // de la persona: si se avisara, arrastraría al otro. Al conectar se decide quién sigue a quién.
    if (!estado.conectado || estado.pausado) return;
    const t = setTimeout(() => avisarAlEspejo(tipo, JSON.parse(texto)), 150);
    return () => clearTimeout(t);
  }, [texto, tipo]);
}
