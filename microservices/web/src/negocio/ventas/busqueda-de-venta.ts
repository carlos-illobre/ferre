import { useEffect, useMemo, useState } from "react";
import { busquedaAlDia, esperarBusqueda, type Producto } from "../catalogo";

// La búsqueda de Vender, igual en el celular y en la computadora: lo escrito, los productos que
// coinciden y cuál está marcado con las flechas.
export function useBusquedaDeVenta(buscarProductos: (texto: string, cuantos: number) => Producto[]) {
  const [consulta, setConsulta] = useState("");
  const [elegido, setElegido] = useState(0);
  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 8) : []), [buscarProductos, consulta]);
  useEffect(() => { setElegido(0); }, [consulta]);
  // ↑ ↓ mueven la marca sin salirse de la lista.
  const mover = (paso: 1 | -1) => setElegido((i) => Math.max(0, Math.min(i + paso, resultados.length - 1)));
  return { consulta, setConsulta, resultados, elegido, setElegido, mover };
}

// Qué hace Enter en la búsqueda: el producto marcado; si no hay, un código (lo tipea el lector);
// si no, lo escrito como ítem libre; con la caja vacía, nada (la pantalla decide).
export type AlEnter = { tipo: "producto"; producto: Producto } | { tipo: "codigo"; codigo: string } | { tipo: "libre"; texto: string } | { tipo: "vacia" };
const PARECE_UN_CODIGO = /^[0-9A-Za-z-]{6,32}$/;

export function queHaceEnter(texto: string, lista: Producto[], marcado: number): AlEnter {
  const producto = lista[marcado];
  if (producto) return { tipo: "producto", producto };
  if (PARECE_UN_CODIGO.test(texto)) return { tipo: "codigo", codigo: texto };
  return texto ? { tipo: "libre", texto } : { tipo: "vacia" };
}

// Lo que hace cada pantalla con cada caso del Enter.
export type ManosDelEnter = { producto: (p: Producto) => void; codigo: (codigo: string) => void; libre: (texto: string) => void; vacia?: () => void };

function hacer(a: AlEnter, manos: ManosDelEnter): void {
  if (a.tipo === "producto") manos.producto(a.producto);
  else if (a.tipo === "codigo") manos.codigo(a.codigo);
  else if (a.tipo === "libre") manos.libre(a.texto);
  else manos.vacia?.();
}

// Si el servidor todavía no contestó lo escrito, Enter espera esa respuesta (specs/018).
export function alApretarEnter(consulta: string, resultados: Producto[], marcado: number, manos: ManosDelEnter): void {
  const texto = consulta.trim();
  if (busquedaAlDia(texto)) hacer(queHaceEnter(texto, resultados, marcado), manos);
  else void esperarBusqueda(texto).then((r) => hacer(queHaceEnter(texto, r, 0), manos));
}
