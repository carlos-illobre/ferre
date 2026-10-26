import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

// Los archivos que guarda el servidor (fotos de productos y de comprobantes, las
// listas originales, la copia del catálogo), en una carpeta por tipo dentro del volumen de datos.
// La única forma de guardarlos y leerlos.
export const ruta = (carpeta: string, nombre: string) => path.join(config.carpetaListas, carpeta, nombre);

// Se escribe al lado y se renombra: un corte a mitad no deja un archivo roto. Devuelve la ruta.
export async function guardar(carpeta: string, nombre: string, contenido: Buffer | string): Promise<string> {
  const destino = ruta(carpeta, nombre);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(`${destino}.nuevo`, contenido);
  await rename(`${destino}.nuevo`, destino);
  return destino;
}

// El contenido de un archivo por su ruta, o null si no está.
export const leer = (destino: string) => readFile(destino).catch(() => null);
