import { useEffect, useRef, useSyncExternalStore } from "react";
import { api, leerToken, urlApi } from "./api";
import { EVENTO_EMPAREJAMIENTO, guardarPuestoLocal, guardarPuestoRemoto, puestoLocal, puestoRemoto } from "./puesto";

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
type Tipo = "ir" | "venta";

let estado: EstadoDelEspejo = { emparejado: false, lado: null, conectado: false, otroPresente: false, pausado: false };
const oyentesDeEstado = new Set<() => void>();
function poner(cambios: Partial<EstadoDelEspejo>) { estado = { ...estado, ...cambios }; oyentesDeEstado.forEach((o) => o()); }

const suscriptos: Record<Tipo, Set<(datos: unknown) => void>> = { ir: new Set(), venta: new Set() };
const alReanudar = new Set<() => void>();
const ultimo: Partial<Record<Tipo, unknown>> = {}; // lo último que llegó, para la pantalla que se abre después
const acordado: Partial<Record<Tipo, unknown>> = {}; // lo último avisado o recibido: en qué quedaron los dos
let puestoId: string | null = null;
let cortar: (() => void) | null = null;

const enEspejo = () => estado.conectado && estado.otroPresente && !estado.pausado;
function entregar(tipo: Tipo, datos: unknown) {
  if (datos === null || datos === undefined) return;
  ultimo[tipo] = datos; acordado[tipo] = datos;
  if (!estado.pausado) suscriptos[tipo].forEach((s) => s(datos));
}

function conectar() {
  const lado: Lado | null = puestoLocal() ? "computadora" : puestoRemoto() ? "celular" : null;
  const id = puestoLocal()?.id ?? puestoRemoto()?.id ?? null;
  if (id === puestoId && (id === null || cortar)) return;
  cortar?.(); cortar = null; puestoId = id;
  delete ultimo.ir; delete ultimo.venta; delete acordado.ir; delete acordado.venta;
  if (!id || !lado) { poner({ emparejado: false, lado: null, conectado: false, otroPresente: false, pausado: false }); return; }
  poner({ emparejado: true, lado, conectado: false, otroPresente: false });
  let activo = true;
  let control: AbortController | null = null;
  const presencia = (p: { computadora: boolean; celular: boolean }) => poner({ otroPresente: lado === "computadora" ? p.celular : p.computadora });
  (async () => {
    while (activo) {
      control = new AbortController();
      try {
        const r = await fetch(urlApi(`/puestos/${id}/espejo`), { headers: { Authorization: `Bearer ${leerToken() ?? ""}` }, signal: control.signal });
        if (r.status === 404 || r.status === 401) { if (r.status === 404) { guardarPuestoLocal(null); guardarPuestoRemoto(null); } return; }
        if (!r.ok || !r.body) throw new Error(`espejo ${r.status}`);
        const lector = r.body.getReader();
        const decodificador = new TextDecoder();
        let resto = "";
        while (activo) {
          const { value, done } = await lector.read();
          if (done) break;
          resto += decodificador.decode(value, { stream: true });
          const bloques = resto.split("\n\n");
          resto = bloques.pop() ?? "";
          for (const bloque of bloques) {
            const lineas = bloque.split("\n");
            const evento = lineas.find((l) => l.startsWith("event:"))?.slice(6).trim();
            const crudo = lineas.filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
            if (!evento || evento === "latido") continue;
            const datos = crudo ? (JSON.parse(crudo) as unknown) : null;
            if (evento === "estado") {
              const e = datos as { parte: string | null; venta: unknown; pausado: boolean; presentes: { computadora: boolean; celular: boolean } };
              poner({ conectado: true, pausado: e.pausado });
              presencia(e.presentes);
              // El que llega con el otro ya trabajando se suma a lo que el otro tiene. Si el otro no
              // está (o no hay nada todavía), este lado sigue con lo suyo y lo cuenta: lo guardado
              // puede ser de hace horas, y no tiene que mover a quien acaba de abrir la aplicación.
              const elOtroEsta = lado === "computadora" ? e.presentes.celular : e.presentes.computadora;
              if (elOtroEsta && (e.parte !== null || e.venta !== null)) { entregar("ir", e.parte); entregar("venta", e.venta); }
              // Con los dos recién llegados y nada acordado todavía, cuenta lo suyo solo la
              // computadora, que es la principal: si contaran los dos, se cruzarían.
              else if (!elOtroEsta || lado === "computadora") alReanudar.forEach((f) => f());
            } else if (evento === "presencia") presencia(datos as { computadora: boolean; celular: boolean });
            else if (evento === "pausa") {
              const pausado = Boolean(datos);
              const reanuda = estado.pausado && !pausado;
              poner({ pausado });
              if (reanuda && lado === "computadora") alReanudar.forEach((f) => f());
            } else if (evento === "desvinculado") { guardarPuestoLocal(null); guardarPuestoRemoto(null); return; }
            else if (evento === "ir" || evento === "venta") entregar(evento, datos);
          }
        }
      } catch { /* se reconecta abajo */ }
      if (activo) { poner({ conectado: false, otroPresente: false }); await new Promise((r) => setTimeout(r, 3000)); }
    }
  })();
  cortar = () => { activo = false; control?.abort(); };
}

let arrancado = false;
function arrancar() {
  if (arrancado || typeof window === "undefined") return;
  arrancado = true;
  window.addEventListener(EVENTO_EMPAREJAMIENTO, conectar);
  conectar();
}

// Avisar un cambio de este lado. En pausa no se avisa nada.
export function avisarAlEspejo(tipo: Tipo, datos: unknown): void {
  if (!puestoId || !estado.conectado || estado.pausado) return;
  acordado[tipo] = datos;
  api(`/puestos/${puestoId}/espejo`, { method: "POST", body: JSON.stringify({ tipo, datos }) }).catch(() => undefined);
}
export function pausarEspejo(pausar: boolean): void {
  if (!puestoId) return;
  poner({ pausado: pausar });
  api(`/puestos/${puestoId}/espejo`, { method: "POST", body: JSON.stringify({ tipo: "pausa", datos: pausar }) }).catch(() => undefined);
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
    // La pantalla que se abre toma lo último que llegó mientras no estaba.
    if (ultimo[tipo] !== undefined && enEspejo()) recibir(ultimo[tipo]);
    const contar = () => { visto.current = JSON.stringify(valorRef.current); avisarAlEspejo(tipo, valorRef.current); };
    suscriptos[tipo].add(recibir); alReanudar.add(contar);
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
    // Al abrirse, la pantalla no pisa lo del otro con su estado inicial.
    if (primera.current) { primera.current = false; eraNada.current = texto === "null"; if (visto.current === null) visto.current = texto; return; }
    // Sin nada que espejar (una pantalla que es solo de este dispositivo: la cámara, un enlace
    // con código) no se avisa. Y al volver de una de esas no se arrastra al otro: se vuelve a
    // donde habían quedado los dos.
    const veniaDeNada = eraNada.current;
    eraNada.current = texto === "null";
    if (texto === visto.current || texto === "null") return;
    if (veniaDeNada && acordado[tipo] !== undefined && enEspejo() && JSON.stringify(acordado[tipo]) !== texto) {
      visto.current = JSON.stringify(acordado[tipo]);
      aplicarRef.current(acordado[tipo] as T);
      return;
    }
    visto.current = texto;
    const t = setTimeout(() => avisarAlEspejo(tipo, JSON.parse(texto)), 150);
    return () => clearTimeout(t);
  }, [texto, tipo]);
}
