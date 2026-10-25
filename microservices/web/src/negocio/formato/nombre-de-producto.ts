// El nombre de un producto como se lee (decisión 127): las listas lo traen en mayúsculas
// («PRENSA SARGENTO TIPO F 120X400MM / (WORKPRO)») y se muestra «Prensa sargento tipo F
// 120x400mm / (Workpro)». Las siglas y los códigos cortos (HSS, PVC, F, XX) quedan en mayúsculas;
// los conectores y las unidades, en minúsculas; la marca entre paréntesis, con mayúscula. Un nombre
// que ya trae minúsculas se deja como está.
const EN_MINUSCULA = new Set(["DE", "DEL", "LA", "LAS", "EL", "LOS", "Y", "O", "CON", "SIN", "PARA", "POR", "EN", "A", "AL", "X", "C/", "P/", "S/"]);
const UNIDADES = /^(\d+(?:[.,]\d+)?)(MM|CM|MTS?|M|KG|GRS?|G|ML|LTS?|L|CC|W|V)$/;
const UNIDAD_SUELTA = new Set(["MM", "CM", "M", "MT", "MTS", "KG", "GR", "GRS", "ML", "LT", "LTS", "CC"]);
const SIGLAS = new Set(["LED", "ABS", "PPR", "USB", "AC", "DC", "PVC", "HSS", "UV", "TV"]);

const cuantas = (nombre: string, letras: RegExp) => (nombre.match(letras) ?? []).length;
const yaSeLee = (nombre: string) => cuantas(nombre, /[a-záéíóúñ]/g) > cuantas(nombre, /[A-ZÁÉÍÓÚÑ]/g);
const esSigla = (palabra: string) => SIGLAS.has(palabra) || palabra.length === 1 || (palabra.length <= 3 && !/[AEIOUÁÉÍÓÚ]/.test(palabra));

// Una medida: «120X400MM» → «120x400mm»; los vatios y voltios quedan en mayúscula.
function conNumeros(palabra: string): string {
  const u = UNIDADES.exec(palabra);
  if (u) return `${u[1]}${["W", "V"].includes(u[2]!) ? u[2] : u[2]!.toLowerCase()}`;
  return palabra.replace(/(\d)X(\d)/g, "$1x$2").replace(/(\d)(MM|CM|KG|ML|MTS?)\b/g, (_, d: string, un: string) => d + un.toLowerCase());
}

const vaEnMinuscula = (palabra: string, i: number) => i > 0 && (EN_MINUSCULA.has(palabra) || UNIDAD_SUELTA.has(palabra));

function palabraLeida(palabra: string, i: number, enParentesis: boolean): string {
  if (vaEnMinuscula(palabra, i)) return palabra.toLowerCase();
  if (/\d/.test(palabra)) return conNumeros(palabra);
  if (!enParentesis && esSigla(palabra)) return palabra;
  return enParentesis || i === 0 ? palabra.charAt(0) + palabra.slice(1).toLowerCase() : palabra.toLowerCase();
}

export function nombreDeProducto(nombre: string): string {
  if (!nombre || yaSeLee(nombre)) return nombre;
  let enParentesis = false;
  return nombre.split(/(\s+)/).map((t, i) => {
    if (/^\s+$/.test(t)) return t;
    if (t.startsWith("(")) enParentesis = true;
    const palabra = t.replace(/^[(]+|[)]+$/g, "");
    const salida = t.replace(palabra, palabraLeida(palabra, i, enParentesis));
    if (t.endsWith(")")) enParentesis = false;
    return salida;
  }).join("").replace(/^./, (c) => c.toUpperCase());
}
