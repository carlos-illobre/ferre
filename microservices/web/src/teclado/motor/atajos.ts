import "./atajos.css";

// Atajos de los botones en la computadora (decisión 80): con Alt apretado, cada botón a la
// vista muestra una letra, y esa letra lo acciona. La letra sale del nombre del botón.
const RESERVADAS = new Set(["d", "e", "f"]); // en Windows, el navegador las usa con Alt
const ABECEDARIO = "abcdefghijklmnopqrstuvwxyz";
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// A cada nombre, en orden, su letra: la primera del nombre que esté libre; si no le queda
// ninguna, la primera libre del abecedario; si no quedan letras, ninguna.
// `ocupadas`: las letras que con Alt ya piden otra cosa (las de la tabla de teclas); no se reparten.
// `pedidas`: la letra que un botón ya tiene con Alt (la de su tabla, «Alt S»); se le da esa.
export function repartirLetras(nombres: string[], ocupadas: readonly string[] = [], pedidas: (string | null)[] = []): (string | null)[] {
  const tomadas = new Set([...RESERVADAS, ...ocupadas, ...pedidas.filter((l): l is string => Boolean(l))]);
  return nombres.map((nombre, i) => {
    const pedida = pedidas[i];
    if (pedida) return pedida;
    const propias = [...sinAcentos(nombre)].filter((c) => ABECEDARIO.includes(c));
    const letra = propias.find((c) => !tomadas.has(c)) ?? [...ABECEDARIO].find((c) => !tomadas.has(c)) ?? null;
    if (letra) tomadas.add(letra);
    return letra;
  });
}

const visible = (e: HTMLElement) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== "hidden"; };
// La letra de un botón que ya tiene su tecla con Alt, como la muestra la tabla («Alt S»).
const letraPedida = (b: HTMLElement) => /^Alt ([A-Z])$/i.exec(b.getAttribute("aria-keyshortcuts") ?? "")?.[1]?.toLowerCase() ?? null;
const nombreDe = (b: HTMLElement) => (b.getAttribute("aria-label") || b.textContent || b.getAttribute("title") || "").trim();

// Dónde están los botones que reciben letra al final (un menú que ya tiene sus propias teclas):
// lo dice cada aplicación. Si las letras no alcanzan, esos son los que se quedan sin la suya.
let alFinal: string | null = null;
let ocupadas: () => readonly string[] = () => [];

// Los botones que reciben letra: los de la ventana abierta, si hay una; si no, los de la pantalla.
export function botonesALaVista(): HTMLElement[] {
  const ventanas = [...document.querySelectorAll<HTMLElement>("dialog[open], [role='dialog'], [aria-modal='true']")].filter(visible);
  const donde: ParentNode = ventanas.at(-1) ?? document;
  // Los que ya tienen su tecla (Alt + número, F2, F5 a F8) no llevan otra letra: así alcanzan para
  // los demás. Los que la tienen con Alt muestran esa.
  const todos = [...donde.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [role='button']:not([aria-disabled='true'])")]
    // Lo que está oculto para los lectores de pantalla (aria-hidden) no es algo que se use: no lleva letra.
    .filter((b) => visible(b) && !b.closest(".atajos-capa") && !b.closest("[aria-hidden='true']") && (!b.hasAttribute("aria-keyshortcuts") || letraPedida(b) !== null) && nombreDe(b) !== "");
  // Primero los de la pantalla; después los que la aplicación deja para el final.
  return alFinal ? [...todos.filter((b) => !b.closest(alFinal!)), ...todos.filter((b) => b.closest(alFinal!))] : todos;
}

// La letra de un botón, dibujada arriba a la izquierda de él.
function marcaDe(b: HTMLElement, letra: string): HTMLElement {
  const r = b.getBoundingClientRect();
  const marca = document.createElement("kbd");
  marca.className = "atajo-letra";
  marca.dataset.atajo = letra;
  marca.dataset.de = b.dataset.testid ?? "";
  marca.textContent = letra.toUpperCase();
  marca.style.left = `${Math.max(2, r.left - 6)}px`;
  marca.style.top = `${Math.max(2, r.top - 8)}px`;
  return marca;
}

// La capa con las letras de los botones a la vista, y qué botón acciona cada letra.
function capaDeLetras(): { capa: HTMLDivElement; porLetra: Map<string, HTMLElement> } {
  const botones = botonesALaVista();
  const letras = repartirLetras(botones.map(nombreDe), ocupadas(), botones.map(letraPedida));
  const capa = document.createElement("div");
  capa.className = "atajos-capa";
  capa.setAttribute("aria-hidden", "true");
  const porLetra = new Map<string, HTMLElement>();
  botones.forEach((b, i) => {
    const letra = letras[i];
    if (!letra) return;
    porLetra.set(letra, b);
    capa.appendChild(marcaDe(b, letra));
  });
  return { capa, porLetra };
}

// Alt + una letra sola (sin Ctrl ni Cmd): la letra, en minúscula.
const letraConAlt = (e: KeyboardEvent) => (!e.altKey || e.ctrlKey || e.metaKey ? undefined : /^Key([A-Z])$/.exec(e.code)?.[1]?.toLowerCase());

// Las letras a la vista mientras Alt está apretado; null cuando no se ven.
function crearLetras() {
  let actual: ReturnType<typeof capaDeLetras> | null = null;
  // Con Alt apretado, la página lleva `con-alt`: así se ven también los números de Alt + número.
  const ocultar = () => { actual?.capa.remove(); actual = null; document.documentElement.classList.remove("con-alt"); };
  const mostrar = () => { ocultar(); actual = capaDeLetras(); document.body.appendChild(actual.capa); document.documentElement.classList.add("con-alt"); };
  const botonDe = (letra: string | undefined) => (letra && actual ? actual.porLetra.get(letra) : undefined);
  return { ocultar, mostrar, botonDe };
}

// Las letras con Alt, para toda la aplicación. `alFinal`: dónde están los botones que reciben
// letra al final; `ocupadas`: las letras que ahora la aplicación usa con Alt para otra cosa. Devuelve cómo sacarlas.
export function instalarAtajos(opciones: { alFinal?: string; ocupadas?: () => readonly string[] } = {}): () => void {
  alFinal = opciones.alFinal ?? null;
  ocupadas = opciones.ocupadas ?? (() => []);
  const letras = crearLetras();
  const alApretar = (e: KeyboardEvent) => {
    if (e.key === "Alt") { if (!e.repeat) letras.mostrar(); return; }
    const boton = letras.botonDe(letraConAlt(e));
    if (!boton) return;
    e.preventDefault(); e.stopPropagation();
    letras.ocultar();
    boton.focus();
    boton.click();
  };
  const alSoltar = (e: KeyboardEvent) => { if (e.key === "Alt") { e.preventDefault(); letras.ocultar(); } };
  window.addEventListener("keydown", alApretar, true);
  window.addEventListener("keyup", alSoltar, true);
  window.addEventListener("blur", letras.ocultar);
  return () => { letras.ocultar(); window.removeEventListener("keydown", alApretar, true); window.removeEventListener("keyup", alSoltar, true); window.removeEventListener("blur", letras.ocultar); };
}
