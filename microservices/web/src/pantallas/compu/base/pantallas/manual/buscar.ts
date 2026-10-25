// El buscador del manual: busca en lo que está escrito en los capítulos del dispositivo elegido
// (títulos, pasos, notas, las tablas), sin importar mayúsculas ni tildes.
export type Encontrado = { elemento: HTMLElement; capitulo: number; ruta: string; titulo: string; texto: string };
export const plano = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAXIMO = 6;
const DONDE_SE_BUSCA = "h2, h3, p, td, .manual-forma, .manual-leyenda li";
const sinPaso = (t: string) => t.replace(/^Paso \d+: /, "");
const textoDe = (e: Element | null | undefined) => e?.textContent ?? "";

type Capitulo = { capitulo: number; nombre: string; titulo: string };
type Lugar = { e: HTMLElement; forma: HTMLElement | null; seccion: string };

// En una tabla: el título es lo de la primera columna y el detalle, la celda encontrada.
function deUnaTabla(e: HTMLElement, seccion: string): [string, string] {
  const primera = e.closest("tr")?.firstElementChild;
  return [primera?.textContent ?? seccion, e === primera ? "" : textoDe(e)];
}

// Qué se muestra de un resultado: el título y el detalle, según dónde se encontró.
function tituloYDetalle({ e, forma, seccion }: Lugar, tituloDelCapitulo: string): [string, string] {
  if (forma) return [textoDe(forma.querySelector("strong")), textoDe(forma.querySelector("span"))];
  if (e.tagName === "H2" || e.tagName === "H3") return [sinPaso(textoDe(e)), ""];
  const paso = textoDe(e.closest(".manual-paso")?.querySelector("h3"));
  if (paso) return [sinPaso(paso), textoDe(e)];
  if (e.tagName === "TD") return deUnaTabla(e, seccion);
  return [seccion || tituloDelCapitulo, textoDe(e)];
}

function resultado(l: Lugar, c: Capitulo): Encontrado {
  const ruta = l.seccion && l.e.tagName !== "H2" ? `${c.nombre} › ${l.seccion}` : c.nombre;
  const [titulo, texto] = tituloYDetalle(l, c.titulo);
  return { elemento: l.forma ?? l.e, capitulo: c.capitulo, ruta, titulo, texto };
}

// Un resultado por paso, por tarjeta, por renglón de una tabla y, lo demás, por sección: el primero que coincide.
const grupoDe = ({ e, forma, seccion }: Lugar, capitulo: number): unknown => e.closest(".manual-paso") ?? forma ?? e.closest("tr") ?? `${capitulo}:${seccion}`;

function capituloDe(hoja: HTMLElement): Capitulo {
  const nombre = hoja.dataset.nombre ?? "";
  return { capitulo: Number(hoja.dataset.capitulo), nombre, titulo: hoja.querySelector("h1")?.textContent ?? nombre };
}

// Los lugares donde se busca en un capítulo, cada uno con la sección en que está. Dentro de una
// tarjeta se busca la tarjeta entera, no sus partes.
function lugaresDe(hoja: HTMLElement): Lugar[] {
  const lugares: Lugar[] = [];
  let seccion = "";
  for (const e of hoja.querySelectorAll<HTMLElement>(DONDE_SE_BUSCA)) {
    if (e.tagName === "H2") seccion = textoDe(e);
    const forma = e.closest<HTMLElement>(".manual-forma");
    if (!forma || e === forma) lugares.push({ e, forma, seccion });
  }
  return lugares;
}

export function buscarEnElManual(texto: string): Encontrado[] {
  const buscado = plano(texto.trim());
  if (buscado.length < 2) return [];
  const encontrados: Encontrado[] = [];
  const vistos = new Set<unknown>();
  for (const hoja of document.querySelectorAll<HTMLElement>(".manual-hoja article[data-capitulo]")) {
    const c = capituloDe(hoja);
    for (const l of lugaresDe(hoja)) {
      const grupo = grupoDe(l, c.capitulo);
      if (encontrados.length >= MAXIMO || vistos.has(grupo) || !plano(textoDe(l.e)).includes(buscado)) continue;
      vistos.add(grupo);
      encontrados.push(resultado(l, c));
    }
  }
  return encontrados;
}

export const recortar = (texto: string, buscado: string) => {
  const desde = Math.max(0, plano(texto).indexOf(plano(buscado.trim())) - 40);
  return (desde > 0 ? "…" : "") + texto.slice(desde, desde + 110) + (texto.length > desde + 110 ? "…" : "");
};
