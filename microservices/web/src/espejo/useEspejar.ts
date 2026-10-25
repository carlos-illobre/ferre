import { useEffect, useRef, type MutableRefObject } from "react";
import { acordado, acordar, alReanudar, arrancar, avisarAlEspejo, debeDondeEsta, elEstado, enEspejo, estaPausado, suscriptos, yaContoDondeEsta, type Tipo } from "./estado";

type Refs<T> = {
  visto: MutableRefObject<string | null>;      // lo último avisado o aplicado, serializado
  pendiente: MutableRefObject<T | null>;
  aplicar: MutableRefObject<(v: T) => void>;
  valor: MutableRefObject<T>;
  listo: MutableRefObject<boolean>;
  primera: MutableRefObject<boolean>;
  eraNada: MutableRefObject<boolean>;
};

// Lo que llega del otro y, para cuando se reanuda, cómo contar lo de este lado.
function useRecibirYContar<T>(tipo: Tipo, r: Refs<T>) {
  useEffect(() => {
    const recibir = (datos: unknown) => {
      const texto = JSON.stringify(datos);
      if (texto === r.visto.current) return;
      if (!r.listo.current) { r.pendiente.current = datos as T; return; }
      r.visto.current = texto;
      r.aplicar.current(datos as T);
    };
    // La pantalla que se abre retoma el trabajo donde habían quedado los dos: así una venta o
    // un ingreso a medio cargar no se pierde por ir a mirar otra parte.
    if (acordado[tipo] !== undefined && enEspejo()) recibir(acordado[tipo]);
    const contar = () => {
      // Una pantalla que es solo de este dispositivo (sin parte) no tiene dónde llevar al otro.
      if (tipo === "ir" && r.valor.current === null) return false;
      r.visto.current = JSON.stringify(r.valor.current); avisarAlEspejo(tipo, r.valor.current);
      return true;
    };
    suscriptos[tipo].add(recibir); alReanudar.set(contar, tipo);
    return () => { suscriptos[tipo].delete(recibir); alReanudar.delete(contar); };
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Lo que llegó antes de que la pantalla pudiera aplicarlo, apenas puede.
function useAplicarLoPendiente<T>(listo: boolean, r: Refs<T>) {
  useEffect(() => {
    if (!listo || r.pendiente.current === null) return;
    const v = r.pendiente.current; r.pendiente.current = null;
    r.visto.current = JSON.stringify(v);
    r.aplicar.current(v);
  }, [listo]); // eslint-disable-line react-hooks/exhaustive-deps
}

// La computadora que se encontró sin pantalla todavía cuenta dónde está apenas lo sabe.
function contarDondeEsta<T>(tipo: Tipo, texto: string, r: Refs<T>): boolean {
  if (tipo !== "ir" || !debeDondeEsta() || texto === "null" || !enEspejo()) return false;
  yaContoDondeEsta(); r.primera.current = false; r.eraNada.current = false; r.visto.current = texto;
  avisarAlEspejo(tipo, JSON.parse(texto));
  return true;
}

// Al abrirse, la pantalla no pisa lo del otro con su estado inicial.
function alAbrirse<T>(texto: string, r: Refs<T>): boolean {
  if (!r.primera.current) return false;
  r.primera.current = false; r.eraNada.current = texto === "null";
  if (r.visto.current === null) r.visto.current = texto;
  return true;
}

// Al volver de una pantalla sin nada que espejar no se arrastra al otro: se vuelve a donde
// habían quedado los dos.
function volverDondeQuedaron<T>(tipo: Tipo, texto: string, r: Refs<T>, veniaDeNada: boolean): boolean {
  if (!veniaDeNada || acordado[tipo] == null || !enEspejo() || JSON.stringify(acordado[tipo]) === texto) return false;
  r.visto.current = JSON.stringify(acordado[tipo]);
  r.aplicar.current(acordado[tipo] as T);
  return true;
}

// Lo que cambia mientras el vínculo todavía se está conectando (la pantalla con la que abre
// la aplicación) no es una decisión de la persona: si se avisara, arrastraría al otro. Al
// encontrarse se decide quién sigue a quién.
function avisarEnUnRato(tipo: Tipo, texto: string): (() => void) | undefined {
  if (estaPausado()) return undefined;
  if (!elEstado().conectado) { acordar(tipo, JSON.parse(texto)); return undefined; }
  const t = setTimeout(() => avisarAlEspejo(tipo, JSON.parse(texto)), 150);
  return () => clearTimeout(t);
}

function useAvisarLosCambios<T>(tipo: Tipo, texto: string, r: Refs<T>) {
  useEffect(() => {
    if (contarDondeEsta(tipo, texto, r) || alAbrirse(texto, r)) return;
    // Sin nada que espejar (una pantalla que es solo de este dispositivo: la cámara, un enlace
    // con código) no se avisa.
    const veniaDeNada = r.eraNada.current;
    r.eraNada.current = texto === "null";
    if (texto === r.visto.current || texto === "null") return;
    if (volverDondeQuedaron(tipo, texto, r, veniaDeNada)) return;
    r.visto.current = texto;
    return avisarEnUnRato(tipo, texto);
  }, [texto, tipo]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Espejar un valor de la pantalla: `valor` es lo de este lado y `aplicar` pone lo que llega del
// otro. Lo que llega no se vuelve a avisar. `listo` frena aplicar hasta que la pantalla pueda
// (por ejemplo, hasta tener el catálogo para armar los renglones de la venta).
export function useEspejar<T>(tipo: Tipo, valor: T, aplicar: (v: T) => void, listo = true): void {
  useEffect(arrancar, []);
  const r: Refs<T> = {
    visto: useRef<string | null>(null), pendiente: useRef<T | null>(null), aplicar: useRef(aplicar),
    valor: useRef(valor), listo: useRef(listo), primera: useRef(true), eraNada: useRef(false),
  };
  r.aplicar.current = aplicar; r.valor.current = valor; r.listo.current = listo;
  useRecibirYContar(tipo, r);
  useAplicarLoPendiente(listo, r);
  useAvisarLosCambios(tipo, JSON.stringify(valor), r);
}
