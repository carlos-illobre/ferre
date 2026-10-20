// Números como los lee el empleado: $1.649,14 y 12,5 %. El formato de pesos es el de la
// librería compartida, así se ve igual en la explicación y en la pantalla.
import { pesos as pesosLib } from "./negocio/precios/vista-previa";

export function pesos(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return pesosLib(Number(valor));
}

export function porcentaje(valor: number): string {
  return `${valor > 0 ? "+" : ""}${valor.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`;
}

export function fecha(valor: string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Un importe sin centavos, con el punto de los miles: $12.000. Es como se dice en el mostrador.
export const pesosCortos = (v: number | string): string => "$" + Math.round(Number(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// El día de hoy según el reloj del dispositivo (AAAA-MM-DD), no el de Greenwich: a la noche ya es mañana.
export const hoyLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// El nombre de un producto como se lee (decisión 127): las listas lo traen en mayúsculas
// («PRENSA SARGENTO TIPO F 120X400MM / (WORKPRO)») y se muestra «Prensa sargento tipo F
// 120x400mm / (Workpro)». Las siglas y los códigos cortos (HSS, PVC, F, XX) quedan en mayúsculas;
// los conectores y las unidades, en minúsculas; la marca entre paréntesis, con mayúscula. Un nombre
// que ya trae minúsculas se deja como está.
const EN_MINUSCULA = new Set(["DE", "DEL", "LA", "LAS", "EL", "LOS", "Y", "O", "CON", "SIN", "PARA", "POR", "EN", "A", "AL", "X", "C/", "P/", "S/"]);
const UNIDADES = /^(\d+(?:[.,]\d+)?)(MM|CM|MTS?|M|KG|GRS?|G|ML|LTS?|L|CC|W|V)$/;
const UNIDAD_SUELTA = new Set(["MM", "CM", "M", "MT", "MTS", "KG", "GR", "GRS", "ML", "LT", "LTS", "CC"]);
const SIGLAS = new Set(["LED", "ABS", "PPR", "USB", "AC", "DC", "PVC", "HSS", "UV", "TV"]);
export function nombreDeProducto(nombre: string): string {
  if (!nombre) return nombre;
  const minusculas = (nombre.match(/[a-záéíóúñ]/g) ?? []).length, mayusculas = (nombre.match(/[A-ZÁÉÍÓÚÑ]/g) ?? []).length;
  if (minusculas > mayusculas) return nombre;
  let enParentesis = false;
  return nombre.split(/(\s+)/).map((t, i) => {
    if (/^\s+$/.test(t)) return t;
    const abre = t.startsWith("("); if (abre) enParentesis = true;
    const palabra = t.replace(/^[(]+|[)]+$/g, "");
    let r: string;
    if ((EN_MINUSCULA.has(palabra) || UNIDAD_SUELTA.has(palabra)) && i > 0) r = palabra.toLowerCase();
    else if (/\d/.test(palabra)) {
      const u = UNIDADES.exec(palabra);
      r = u ? `${u[1]}${["W", "V"].includes(u[2]!) ? u[2] : u[2]!.toLowerCase()}` : palabra.replace(/(\d)X(\d)/g, "$1x$2").replace(/(\d)(MM|CM|KG|ML|MTS?)\b/g, (_, d: string, un: string) => d + un.toLowerCase());
    } else if (!enParentesis && (SIGLAS.has(palabra) || palabra.length === 1 || (palabra.length <= 3 && !/[AEIOUÁÉÍÓÚ]/.test(palabra)))) r = palabra;
    else r = enParentesis || i === 0 ? palabra.charAt(0) + palabra.slice(1).toLowerCase() : palabra.toLowerCase();
    const salida = t.replace(palabra, r);
    if (t.endsWith(")")) enParentesis = false;
    return salida;
  }).join("").replace(/^./, (c) => c.toUpperCase());
}
