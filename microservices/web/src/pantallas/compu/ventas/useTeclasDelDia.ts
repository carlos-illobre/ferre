import { useCallback, useEffect, useRef } from "react";
import { useTeclasGlobales } from "../../../plataforma/teclado";
import type { ListaDelDia } from "./useListaDelDia";

// Las teclas de «Ventas del día»: ↑ ↓ eligen la venta, / o Ctrl+K buscan, F cambia la fecha, E
// corrige y Supr o A anulan; corrigiendo, Ctrl+Enter guarda y Esc descarta.
const conCtrl = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

function corrigiendo(e: KeyboardEvent, l: ListaDelDia, enCampo: boolean) {
  if (e.key === "Enter" && conCtrl(e)) { e.preventDefault(); l.guardarRef.current(); }
  else if (e.key === "Escape" && !enCampo) { e.preventDefault(); l.descartar(); }
}

// Sin el cursor en un campo, cada letra hace lo suyo; E, Supr y A, solo si la venta se puede tocar.
function letra(l: ListaDelDia, campo: HTMLInputElement | null): Record<string, (() => void) | undefined> {
  const conVenta = (hacer: () => void) => (l.sePuede ? hacer : undefined);
  const anular = conVenta(() => l.setPorAnular(l.elegida));
  return { "/": () => campo?.focus(), f: () => l.setOtroDia(true), e: conVenta(l.empezar), delete: anular, a: anular };
}

// Ctrl+K busca; las demás con Ctrl, Cmd o Alt no son de esta pantalla.
function conModificador(e: KeyboardEvent, campo: HTMLInputElement | null) {
  if (conCtrl(e) && e.key.toLowerCase() === "k") { e.preventDefault(); campo?.focus(); }
}

const FLECHAS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

function mirando(e: KeyboardEvent, l: ListaDelDia, campo: HTMLInputElement | null, enCampo: boolean) {
  if (conCtrl(e) || e.altKey) { conModificador(e, campo); return; }
  const paso = FLECHAS[e.key];
  const hacer = paso ? () => l.mover(paso) : enCampo ? undefined : letra(l, campo)[e.key.toLowerCase()];
  if (hacer) { e.preventDefault(); hacer(); }
}

export function useTeclasDelDia(l: ListaDelDia, campo: HTMLInputElement | null) {
  const actual = useRef(l);
  useEffect(() => { actual.current = l; });
  const teclas = useCallback((e: KeyboardEvent) => {
    const x = actual.current;
    if (x.porAnular || x.hojaAbierta || x.otroDia) return;
    const enCampo = (e.target as HTMLElement | null)?.tagName === "INPUT";
    if (x.corrigiendo) corrigiendo(e, x, enCampo); else mirando(e, x, campo, enCampo);
  }, [campo]);
  useTeclasGlobales(teclas, campo);
}
