import { useEffect, useState } from "react";
import type { NombreDeIcono } from "./ui";

// Enrutamiento por hash (#/productos, #/vincular-celular?codigo=…): el cliente se publica
// como archivos estáticos y una ruta real daría 404 al recargar.
export type Ruta = { nombre: string; parametros: URLSearchParams };

// El mapa de la app. En la computadora, cada grupo es un título del menú lateral; en el
// celular, cada grupo es una pestaña de la barra de abajo y sus pantallas van arriba.
export type Pantalla = { ruta: string; nombre: string; corto?: string; icono: NombreDeIcono }; // `corto`: el nombre en las pestañas del celular
export type Grupo = { clave: string; nombre: string; icono: NombreDeIcono; pantallas: Pantalla[] };
export const GRUPOS: Grupo[] = [
  { clave: "mostrador", nombre: "Vender", icono: "vender", pantallas: [
    { ruta: "vender", nombre: "Vender", icono: "vender" },
    { ruta: "ventas", nombre: "Ventas de hoy", icono: "ventas" },
  ] },
  { clave: "catalogo", nombre: "Catálogo", icono: "catalogo", pantallas: [
    { ruta: "productos", nombre: "Productos", icono: "productos" },
    { ruta: "listas", nombre: "Listas de precios", corto: "Listas", icono: "listas" },
    { ruta: "duplicados", nombre: "Duplicados", icono: "duplicados" },
  ] },
  { clave: "deposito", nombre: "Depósito", icono: "deposito", pantallas: [
    { ruta: "stock", nombre: "Stock", icono: "stock" },
    { ruta: "compras", nombre: "Compras", icono: "compras" },
    { ruta: "contar", nombre: "Contar", icono: "contar" },
  ] },
  { clave: "negocio", nombre: "Negocio", icono: "negocio", pantallas: [
    { ruta: "resumen", nombre: "Resumen", icono: "resumen" },
    { ruta: "usuarios", nombre: "Usuarios y sesiones", corto: "Usuarios", icono: "usuarios" },
    { ruta: "actividad", nombre: "Quién hizo qué", corto: "Actividad", icono: "actividad" },
  ] },
];
export const PANTALLAS: Pantalla[] = GRUPOS.flatMap((g) => g.pantallas);

// Nombres de las versiones anteriores que siguen abriendo lo que abrían.
const ALIAS: Record<string, string> = { inicio: "vender", catalogo: "productos", deposito: "stock", negocio: "resumen", administracion: "usuarios" };

function leer(): Ruta {
  const hash = location.hash.replace(/^#\/?/, "");
  const [camino = "", consulta = ""] = hash.split("?");
  const primero = camino.split("/")[0] || "inicio";
  return { nombre: ALIAS[primero] ?? primero, parametros: new URLSearchParams(consulta) };
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(leer);
  useEffect(() => {
    const alCambiar = () => setRuta(leer());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);
  return ruta;
}

export function irA(camino: string): void {
  location.hash = `#/${camino}`;
}
