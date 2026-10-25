import { alCambiarElVinculo, alMensajeDelOtro, arrancarEnlace, elOtroEsta, estadoDelVinculo, mandarAlOtro, type Lado, type MensajeDelEnlace } from "../enlace";

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
export type Tipo = "ir" | "venta" | "ingreso" | "pedido" | "pedido-renglones";
const DOCUMENTOS: Tipo[] = ["venta", "ingreso", "pedido", "pedido-renglones"];
const TIPOS: Tipo[] = ["ir", ...DOCUMENTOS];

let pausado = false;
let estado: EstadoDelEspejo = { emparejado: false, lado: null, conectado: false, otroPresente: false, pausado: false };
const oyentesDeEstado = new Set<() => void>();
export const elEstado = () => estado;
export const estaPausado = () => pausado;
export const suscribirAlEstado = (o: () => void) => { oyentesDeEstado.add(o); return () => { oyentesDeEstado.delete(o); }; };

export const suscriptos: Record<Tipo, Set<(datos: unknown) => void>> = { ir: new Set(), venta: new Set(), ingreso: new Set(), pedido: new Set(), "pedido-renglones": new Set() };
// Los avisos de algo que terminó del otro lado («venta cobrada»): pasan y no se guardan.
export const oyentesDeAvisos = new Set<(texto: string) => void>();
// Cada pantalla que espeja algo sabe contarlo; devuelve si tenía algo para contar.
export const alReanudar = new Map<() => boolean, Tipo>();
const reanudar = (solo?: Tipo) => { let conto = false; alReanudar.forEach((tipo, f) => { if (!solo || tipo === solo) conto = f() || conto; }); return conto; };
// Lo último avisado o recibido de cada cosa, y cuándo: en qué quedaron los dos.
export const acordado: Partial<Record<Tipo, unknown>> = {};
const acordadoEn: Partial<Record<Tipo, number>> = {};
export const acordar = (tipo: Tipo, datos: unknown) => { acordado[tipo] = datos; acordadoEn[tipo] = Date.now(); };
let irSinContar = false; // la computadora se encontró antes de tener pantalla: le debe al celular dónde está
export const debeDondeEsta = () => irSinContar;
export const yaContoDondeEsta = () => { irSinContar = false; };
let sala: string | null = null;

export const enEspejo = () => estado.otroPresente && !estado.pausado;
function entregar(tipo: Tipo, datos: unknown) {
  if (datos === null || datos === undefined) return;
  acordar(tipo, datos);
  if (!estado.pausado) suscriptos[tipo].forEach((s) => s(datos));
}

const estadoDe = (v: ReturnType<typeof estadoDelVinculo>): EstadoDelEspejo => ({
  emparejado: v !== null, lado: v?.lado ?? null, pausado,
  conectado: v !== null && v.conexion !== "sin-conexion" && v.conexion !== "conectando",
  otroPresente: elOtroEsta(),
});

// Otro vínculo: se empieza de cero.
function cambiarDeSala(id: string | null) {
  if (id === sala) return;
  sala = id;
  for (const t of TIPOS) { delete acordado[t]; delete acordadoEn[t]; }
}

// El estado del espejo sale del enlace y de la pausa.
function ponerEstado() {
  const v = estadoDelVinculo();
  const antes = estado;
  estado = estadoDe(v);
  cambiarDeSala(v?.sala ?? null);
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
// De cada trabajo queda el que cambió último; si empatan, el de la computadora.
function elDelOtroEsMasNuevo(d: Tipo, haceMs: number, ahora: number): boolean {
  const mioHace = acordadoEn[d] === undefined ? Infinity : ahora - acordadoEn[d]!;
  return haceMs < mioHace || (haceMs === mioHace && estado.lado === "celular");
}
function alEstadoDelOtro(docs: Record<string, { datos: unknown; haceMs: number }>, pausadoAlla: boolean) {
  const ahora = Date.now();
  if (pausadoAlla && !pausado) { pausado = true; ponerEstado(); }
  for (const d of DOCUMENTOS) {
    const suyo = docs[d];
    if (suyo && elDelOtroEsMasNuevo(d, suyo.haceMs, ahora)) entregar(d, suyo.datos);
  }
}
function alPausar(pausar: boolean) {
  const reanuda = pausado && !pausar;
  pausado = pausar;
  ponerEstado();
  if (reanuda && estado.lado === "computadora") reanudar();
}

type Mensaje<K extends MensajeDelEnlace["tipo"]> = Extract<MensajeDelEnlace, { tipo: K }>;
const AL_RECIBIR: Partial<{ [K in MensajeDelEnlace["tipo"]]: (m: Mensaje<K>) => void }> = {
  espejo: (m) => { if (TIPOS.includes(m.cambio as Tipo)) entregar(m.cambio as Tipo, m.datos); },
  estado: (m) => { if (typeof m.docs === "object" && m.docs !== null) alEstadoDelOtro(m.docs, m.pausado === true); },
  pausa: (m) => alPausar(m.pausado === true),
  aviso: (m) => { if (typeof m.texto === "string" && !pausado) oyentesDeAvisos.forEach((o) => o(m.texto.slice(0, 300))); },
};
const alMensaje = (m: MensajeDelEnlace) => (AL_RECIBIR[m.tipo] as ((m: MensajeDelEnlace) => void) | undefined)?.(m);

let arrancado = false;
export function arrancar() {
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
export function pausarEspejo(pausar: boolean): void {
  if (!estado.emparejado) return;
  pausado = pausar;
  ponerEstado();
  void mandarAlOtro({ tipo: "pausa", pausado: pausar });
}
